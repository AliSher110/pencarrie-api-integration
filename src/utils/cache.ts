import type { IZipEntry } from "adm-zip";
import { promises as fs } from "fs";
import path from "path";

type CacheEntry = {
  csvContent: string;
  filename: string;
  timestamp: number;
};

type ParsedCacheEntry = {
  records: Record<string, string>[];
  filename: string;
  timestamp: number;
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "products.csv");
const CACHE_META = path.join(CACHE_DIR, "cache.json");

let memoryCache: CacheEntry | null = null;
let parsedCache: ParsedCacheEntry | null = null;

async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create cache directory:", error);
  }
}

async function getFileCache(): Promise<CacheEntry | null> {
  try {
    await ensureCacheDir();
    const metaContent = await fs.readFile(CACHE_META, "utf-8");
    const meta = JSON.parse(metaContent);
    const age = Date.now() - meta.timestamp;
    if (age > CACHE_TTL_MS) {
      await clearFileCache();
      return null;
    }

    const csvContent = await fs.readFile(CACHE_FILE, "utf-8");
    return { csvContent, filename: meta.filename, timestamp: meta.timestamp };
  } catch {
    return null;
  }
}

async function setFileCache(
  csvContent: string,
  filename: string
): Promise<void> {
  try {
    await ensureCacheDir();
    const meta = {
      filename,
      timestamp: Date.now(),
    };

    await Promise.all([
      fs.writeFile(CACHE_FILE, csvContent, "utf-8"),
      fs.writeFile(CACHE_META, JSON.stringify(meta, null, 2), "utf-8"),
    ]);
  } catch (error) {
    console.error("Failed to write cache file:", error);
  }
}

async function clearFileCache(): Promise<void> {
  try {
    await Promise.all([
      fs.unlink(CACHE_FILE).catch(() => {}),
      fs.unlink(CACHE_META).catch(() => {}),
    ]);
  } catch (error) {
    // Ignore errors
  }
}

export function getCachedCSV(): CacheEntry | null {
  if (!memoryCache) return null;

  const age = Date.now() - memoryCache.timestamp;
  if (age > CACHE_TTL_MS) {
    memoryCache = null;
    return null;
  }

  return memoryCache;
}

export function setCachedCSV(csvContent: string, filename: string): void {
  memoryCache = {
    csvContent,
    filename,
    timestamp: Date.now(),
  };
}

export function getParsedCache(): ParsedCacheEntry | null {
  if (!parsedCache) return null;

  const age = Date.now() - parsedCache.timestamp;
  if (age > CACHE_TTL_MS) {
    parsedCache = null;
    return null;
  }

  return parsedCache;
}

export function setParsedCache(
  records: Record<string, string>[],
  filename: string
): void {
  parsedCache = {
    records,
    filename,
    timestamp: Date.now(),
  };
}

export async function clearCache(): Promise<void> {
  memoryCache = null;
  parsedCache = null;
  await clearFileCache();
}

export async function getOrFetchCSV(): Promise<{
  csvContent: string;
  filename: string;
}> {
  // Check in-memory cache first
  const memoryCached = getCachedCSV();
  if (memoryCached) {
    console.log("✅ Memory cache hit");
    return {
      csvContent: memoryCached.csvContent,
      filename: memoryCached.filename,
    };
  }

  // Check file system cache
  const fileCached = await getFileCache();
  if (fileCached) {
    console.log("✅ File cache hit");
    // Load into memory for faster subsequent access
    setCachedCSV(fileCached.csvContent, fileCached.filename);
    return { csvContent: fileCached.csvContent, filename: fileCached.filename };
  }

  // Cache miss - fetch from external API
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

    // Cache in both memory and file system
    setCachedCSV(csvContent, filename);
    await setFileCache(csvContent, filename);
    console.log("✅ Cached to memory and disk");

    return { csvContent, filename };
  } finally {
    clearTimeout(timeoutId);
  }
}
