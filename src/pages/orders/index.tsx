import type { NextPage } from "next";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { LoadingBar } from "../../components/LoadingBar";
import { showToast } from "../../utils/toast";

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export const Upload: NextPage = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[] | null>(null);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState<
    Record<string, string>[] | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
      showToast.error("Please upload a CSV or XLSX file");
      return false;
    }
    return true;
  };

  const parseCSV = useCallback((text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map((v) => v.replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }

    return rows;
  }, []);

  const parseXLSX = useCallback(
    async (file: File): Promise<Record<string, string>[]> => {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
      }) as any[][];

      if (jsonData.length === 0) return [];

      const headers = jsonData[0].map((h) => String(h || "").trim());
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = String(jsonData[i][index] || "").trim();
        });
        rows.push(row);
      }

      return rows;
    },
    []
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!validateFile(file)) {
        return;
      }

      setUploadedFile(file);
      setIsUploading(true);
      setCsvData(null);
      setTableHeaders([]);

      try {
        const fileName = file.name.toLowerCase();
        let parsedData: Record<string, string>[];

        if (fileName.endsWith(".xlsx")) {
          parsedData = await parseXLSX(file);
        } else {
          const text = await file.text();
          parsedData = parseCSV(text);
        }

        if (parsedData.length === 0) {
          throw new Error("File is empty or invalid");
        }

        const headers = Object.keys(parsedData[0]);
        setTableHeaders(headers);
        setCsvData(parsedData);
        setFilteredData(parsedData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to process file";
        showToast.error(errorMessage);
        setUploadedFile(null);
        setCsvData(null);
        setTableHeaders([]);
      } finally {
        setIsUploading(false);
      }
    },
    [parseCSV, parseXLSX]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  useEffect(() => {
    if (!csvData) return;

    if (!searchQuery.trim()) {
      setFilteredData(csvData);
      return;
    }

    const filtered = csvData.filter((row) => {
      return Object.values(row).some((value) =>
        value.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
    setFilteredData(filtered);
  }, [searchQuery, csvData]);

  const isImageField = (header: string): boolean => {
    const cleanHeader = header
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase();
    return (
      cleanHeader.includes("image") ||
      cleanHeader.includes("img") ||
      cleanHeader.includes("photo")
    );
  };

  return (
    <>
      <LoadingBar loading={isUploading} />
      <div
        className="h-[calc(100vh-64px)] flex flex-col overflow-hidden"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <div className="w-full px-4 md:px-6 lg:px-8 pt-4 pb-2 flex-shrink-0">
          <div className="w-full flex justify-between items-center pl-3">
            <div>
              <h3
                className="text-xl font-medium"
                style={{ color: "#000000", fontSize: "20px" }}
              >
                Upload File
              </h3>
              <p
                className="text-xs uppercase tracking-wide"
                style={{
                  color: "#4B5563",
                  fontSize: "12px",
                  letterSpacing: "0.05em",
                }}
              >
                Upload and process CSV/XLSX files
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-4 md:px-6 lg:px-8 pb-4 overflow-auto">
          <div className={`max-w-7xl mx-auto ${!csvData ? 'h-full flex items-center' : ''}`}>
            {!uploadedFile && (
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                className="relative cursor-pointer transition-all duration-200 w-full"
                style={{
                  borderWidth: "2px",
                  borderStyle: "dashed",
                  borderColor: isDragging ? "#7C3AED" : "#E5E7EB",
                  backgroundColor: isDragging
                    ? "rgba(124, 58, 237, 0.05)"
                    : "#FFFFFF",
                  borderRadius: "12px",
                  padding: "100px 48px",
                  textAlign: "center",
                  minHeight: "700px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isDragging
                    ? "0 4px 6px rgba(124, 58, 237, 0.1)"
                    : "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileInputChange}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden"
                />

                <div className="flex flex-col items-center">
                  <svg
                    className="w-16 h-16 mb-4"
                    style={{ color: isDragging ? "#7C3AED" : "#9CA3AF" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>

                  <p
                    className="text-lg font-medium mb-2"
                    style={{ color: "#000000" }}
                  >
                    {isDragging
                      ? "Drop your file here"
                      : "Drag and drop your CSV/XLSX file here"}
                  </p>
                  <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
                    or click to browse
                  </p>

                  <button
                    type="button"
                    className="px-6 py-2 rounded-lg font-medium transition-all duration-200"
                    style={{
                      backgroundColor: "#7C3AED",
                      color: "#FFFFFF",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#6D28D9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#7C3AED";
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    Select File
                  </button>

                  <p className="text-xs mt-4" style={{ color: "#9CA3AF" }}>
                    CSV and XLSX files are supported
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* CSV Data Table */}
          {csvData && csvData.length > 0 && (
            <div className="mt-4 w-full">
              <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {uploadedFile && (
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E5E7EB",
                      borderWidth: "1px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      borderRadius: "8px",
                    }}
                  >
                    <svg
                      className="w-6 h-6 flex-shrink-0"
                      style={{ color: "#7C3AED" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "#000000" }}
                      >
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs" style={{ color: "#6B7280" }}>
                        {formatFileSize(uploadedFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setCsvData(null);
                        setTableHeaders([]);
                        setFilteredData(null);
                        setSearchQuery("");
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="ml-2 p-1.5 rounded transition-colors"
                      style={{ color: "#6B7280" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#DC2626";
                        e.currentTarget.style.backgroundColor =
                          "rgba(220, 38, 38, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#6B7280";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="w-full sm:w-auto sm:max-w-sm min-w-[200px] relative">
                  <div className="relative">
                    <input
                      className="w-full pr-11 h-10 pl-3 py-2 text-sm rounded transition duration-200 ease focus:outline-none shadow-sm focus:shadow-md"
                      style={{
                        backgroundColor: "#FFFFFF",
                        color: "#000000",
                        borderColor: "#E5E7EB",
                        borderWidth: "1px",
                      }}
                      placeholder="Search data..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={(e) => (e.target.style.borderColor = "#7C3AED")}
                      onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                    />
                    <button
                      className="absolute h-8 w-8 right-1 top-1 my-auto px-2 flex items-center rounded"
                      style={{ backgroundColor: "#FFFFFF" }}
                      type="button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                        className="w-8 h-8"
                        style={{ color: "#4B5563" }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="relative flex flex-col w-full rounded-lg bg-clip-border overflow-hidden"
                style={{
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  borderRadius: "8px",
                  maxHeight: "calc(100vh - 260px)",
                  overflow: "auto",
                }}
              >
                <div className="overflow-x-auto">
                  <table className="text-left table-auto">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        {tableHeaders.map((header) => (
                          <th
                            key={header}
                            className="px-2 sm:px-3 py-2 border-b whitespace-nowrap"
                            style={{
                              borderColor: "#E5E7EB",
                              backgroundColor: "#FFFFFF",
                              width: "auto",
                            }}
                          >
                            <p
                              className="text-xs sm:text-sm leading-none"
                              style={{ color: "#7C3AED", fontWeight: 600 }}
                            >
                              {header.replace(/^\uFEFF/, "")}
                            </p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData && filteredData.length > 0 ? (
                        filteredData.map((row, index) => (
                          <tr
                            key={index}
                            className="border-b"
                            style={{
                              borderColor: "#E5E7EB",
                              backgroundColor:
                                index % 2 === 1
                                  ? "rgba(124, 58, 237, 0.03)"
                                  : "transparent",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "rgba(124, 58, 237, 0.05)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                index % 2 === 1
                                  ? "rgba(124, 58, 237, 0.03)"
                                  : "transparent")
                            }
                          >
                            {tableHeaders.map((header) => (
                              <td
                                key={header}
                                className="px-2 sm:px-3 py-2 whitespace-nowrap"
                                style={{ width: "auto" }}
                              >
                                {isImageField(header) && row[header] ? (
                                  <div className="flex items-center">
                                    <img
                                      src={row[header]}
                                      alt="Image"
                                      className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <p
                                    className="text-xs"
                                    style={{ color: "#000000" }}
                                  >
                                    {row[header] || "-"}
                                  </p>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={tableHeaders.length}
                            className="px-3 py-4 text-center"
                            style={{ color: "#6B7280" }}
                          >
                            No data found
                            {searchQuery ? ` matching "${searchQuery}"` : ""}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Upload;
