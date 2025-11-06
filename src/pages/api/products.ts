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

const DEFAULT_PAGE_SIZE = 500;

/**
 * Get page size from query parameter (accepts any positive integer)
 */
function getPageSize(perPageParam: string | string[] | undefined): number {
  if (!perPageParam) {
    return DEFAULT_PAGE_SIZE;
  }

  const perPage = parseInt(
    Array.isArray(perPageParam) ? perPageParam[0] : perPageParam,
    10
  );

  // Accept any positive integer, default to 500 if invalid
  if (isNaN(perPage) || perPage < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return perPage;
}

/**
 * Get a page from parsed records (much faster than re-parsing CSV)
 */
function getPageFromParsed(
  allRecords: Record<string, string>[],
  page: number,
  pageSize: number
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
    const pageSize = getPageSize(req.query.perPage);

    // Check if we have parsed records cached
    let parsedRecords = getParsedCache()?.records;

    if (!parsedRecords) {
      parsedRecords = await parseAllCSV(csvContent);
      setParsedCache(parsedRecords, filename);
    }

    // Set cache headers for Vercel edge caching (30 minutes)
    // Works on Vercel (edge cache) and locally (browser cache)
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=1800, stale-while-revalidate=60"
    );

    if (allParam) {
      // Return all records
      const totalRecords = parsedRecords.length;
      const totalPages = Math.ceil(totalRecords / pageSize);

      return res.status(200).json({
        success: true,
        data: parsedRecords,
        pageSize,
        totalPages,
        totalRecords,
        filename,
      });
    }

    // Get page from cached parsed records
    const { records, totalRecords, totalPages } = getPageFromParsed(
      parsedRecords,
      page,
      pageSize
    );

    return res.status(200).json({
      success: true,
      data: records,
      page,
      pageSize,
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
