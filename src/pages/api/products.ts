import { parse } from "csv-parse";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getOrFetchCSV,
  getParsedCache,
  setParsedCache,
} from "../../utils/cache";

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

/**
 * Get a page from parsed records (much faster than re-parsing CSV)
 */
function getPageFromParsed(
  allRecords: Record<string, string>[],
  page: number,
  pageSize = PAGE_SIZE
): {
  records: Record<string, string>[];
  totalRecords: number;
  totalPages: number;
} {
  const pageStart = (page - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const records = allRecords.slice(pageStart, pageEnd);
  const totalRecords = allRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize);

  return { records, totalRecords, totalPages };
}

/**
 * Parse the entire CSV into memory (used when ?all=true)
 */
async function parseAllCSV(
  csvContent: string
): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, string>[] = [];
    const parser = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    parser.on("data", (row: Record<string, string>) => results.push(row));
    parser.on("end", () => resolve(results));
    parser.on("error", reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProductsResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { csvContent, filename } = await getOrFetchCSV();
    const allParam = req.query.all === "true";
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);

    // Check if we have parsed records cached
    let parsedRecords = getParsedCache()?.records;

    if (!parsedRecords) {
      // Parse CSV once and cache it
      console.log("📝 Parsing CSV (first time or cache expired)");
      parsedRecords = await parseAllCSV(csvContent);
      setParsedCache(parsedRecords, filename);
      console.log(`✅ Parsed and cached ${parsedRecords.length} records`);
    } else {
      console.log("✅ Using cached parsed records");
    }

    if (allParam) {
      // Return all records
      const totalRecords = parsedRecords.length;
      const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

      return res.status(200).json({
        success: true,
        data: parsedRecords,
        pageSize: PAGE_SIZE,
        totalPages,
        totalRecords,
        filename,
      });
    }

    // Get page from cached parsed records (instant!)
    const { records, totalRecords, totalPages } = getPageFromParsed(
      parsedRecords,
      page,
      PAGE_SIZE
    );

    console.log(
      `📊 Page ${page}: ${records.length} records / ${totalRecords} total (${totalPages} pages)`
    );

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
    console.error("❌ Products Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
