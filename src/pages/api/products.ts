import { parse } from "csv-parse";
import type { NextApiRequest, NextApiResponse } from "next";
import { getOrFetchCSV } from "../../utils/cache";

type ProductsResponse = {
  success: boolean;
  data?: Record<string, string>[];
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalRecords?: number;
  filename?: string;
  error?: string;
};

const PAGE_SIZE = 5000;

async function parseAllCSV(
  csvContent: string
): Promise<Record<string, string>[]> {
  return new Promise<Record<string, string>[]>((resolve, reject) => {
    const results: Record<string, string>[] = [];
    parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
      .on("data", (data: Record<string, string>) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

async function streamPageFromCSV(
  csvContent: string,
  page: number
): Promise<{ records: Record<string, string>[]; totalRecords: number }> {
  return new Promise((resolve, reject) => {
    let recordIndex = 0;
    const pageStart = (page - 1) * PAGE_SIZE;
    const pageEnd = pageStart + PAGE_SIZE;

    const results: Record<string, string>[] = [];
    let totalCount = 0;

    parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      to_line: pageEnd + 1,
    })
      .on("data", (data: Record<string, string>) => {
        totalCount++;
        if (recordIndex >= pageStart && recordIndex < pageEnd) {
          results.push(data);
        }
        recordIndex++;
      })
      .on("end", () => resolve({ records: results, totalRecords: totalCount }))
      .on("error", reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProductsResponse>
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const { csvContent, filename } = await getOrFetchCSV();
    const allParam = req.query.all as string;

    if (allParam === "true") {
      const records = await parseAllCSV(csvContent);
      const totalRecords = records.length;
      const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

      return res.status(200).json({
        success: true,
        data: records,
        pageSize: PAGE_SIZE,
        totalPages,
        totalRecords,
        filename,
      });
    }

    const pageParam = req.query.page as string;
    const page = parseInt(pageParam, 10) || 1;

    if (isNaN(page) || page < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid page number. Must be >= 1",
      });
    }

    const { records, totalRecords } = await streamPageFromCSV(csvContent, page);
    const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

    return res.status(200).json({
      success: true,
      data: records,
      page,
      pageSize: PAGE_SIZE,
      totalPages,
      totalRecords,
      filename,
    });
  } catch (error) {
    console.error("Products Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
