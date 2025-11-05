import type { IZipEntry } from "adm-zip";

type CacheEntry = {
  csvContent: string;
  filename: string;
  timestamp: number;
};

const CACHE_TTL_MS = 30 * 60 * 1000;
let cache: CacheEntry | null = null;

export function getCachedCSV(): CacheEntry | null {
  if (!cache) return null;

  const age = Date.now() - cache.timestamp;
  if (age > CACHE_TTL_MS) {
    cache = null;
    return null;
  }

  return cache;
}

export function setCachedCSV(csvContent: string, filename: string): void {
  cache = {
    csvContent,
    filename,
    timestamp: Date.now(),
  };
}

export function clearCache(): void {
  cache = null;
}

export async function getOrFetchCSV(): Promise<{
  csvContent: string;
  filename: string;
}> {
  const cached = getCachedCSV();
  if (cached) {
    console.log("✅ Cache hit");
    return { csvContent: cached.csvContent, filename: cached.filename };
  }

  console.log("📥 Fetching from external API");
  const url = process.env.EXTERNAL_API_URL;
  const authToken = process.env.AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("API configuration missing");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "User-Agent": "Mozilla/5.0 (compatible; Next.js API)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.statusText} (${response.status})`
      );
    }

    const AdmZip = (await import("adm-zip")).default;
    const zipBuffer = Buffer.from(await response.arrayBuffer());
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    const csvEntry = zipEntries.find((entry: IZipEntry) =>
      entry.entryName.endsWith(".csv")
    );

    if (!csvEntry) {
      throw new Error("No CSV file found in the ZIP archive");
    }

    const csvContent = csvEntry.getData().toString("utf-8");
    const filename = csvEntry.entryName;

    setCachedCSV(csvContent, filename);
    console.log("✅ Cached");

    return { csvContent, filename };
  } finally {
    clearTimeout(timeoutId);
  }
}
