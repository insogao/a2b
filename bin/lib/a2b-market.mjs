import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const DEFAULT_MARKET_RAW_BASE =
  "https://raw.githubusercontent.com/insogao/a2b-market/main";

export function getMarketCacheRoot(root = path.join(os.homedir(), ".a2b", "market")) {
  return root;
}

export async function updateMarketCache({
  cacheRoot = getMarketCacheRoot(),
  baseUrl = DEFAULT_MARKET_RAW_BASE
} = {}) {
  await fs.mkdir(cacheRoot, { recursive: true });

  const topLevelRaw = await fetchText(`${baseUrl}/index.json`);
  await writeText(path.join(cacheRoot, "index.json"), topLevelRaw);
  const topLevel = JSON.parse(topLevelRaw);

  for (const category of topLevel.categories ?? []) {
    const categoryRaw = await fetchText(`${baseUrl}/${category.id}/index.json`);
    await writeText(path.join(cacheRoot, category.id, "index.json"), categoryRaw);

    const categoryIndex = JSON.parse(categoryRaw);
    for (const entry of categoryIndex.entries ?? []) {
      const docPath =
        entry.sourceType === "local_doc" ? entry.sourceUrl : entry.docPath;
      if (typeof docPath !== "string" || docPath.length === 0) {
        continue;
      }
      const docRaw = await fetchText(`${baseUrl}/${docPath}`);
      await writeText(path.join(cacheRoot, ...entry.id.split("/")) + ".md", docRaw);
    }
  }

  return {
    ok: true,
    cacheRoot,
    categoryCount: Array.isArray(topLevel.categories) ? topLevel.categories.length : 0
  };
}

export async function listMarketCategories(cacheRoot = getMarketCacheRoot()) {
  const raw = await fs.readFile(path.join(cacheRoot, "index.json"), "utf8");
  return JSON.parse(raw).categories ?? [];
}

export async function listMarketEntries(
  cacheRoot = getMarketCacheRoot(),
  category
) {
  const raw = await fs.readFile(path.join(cacheRoot, category, "index.json"), "utf8");
  return JSON.parse(raw).entries ?? [];
}

export async function showMarketEntry(
  cacheRoot = getMarketCacheRoot(),
  entryId
) {
  const [category] = String(entryId).split("/");
  const entries = await listMarketEntries(cacheRoot, category);
  const entry = entries.find((candidate) => candidate.id === entryId);
  if (!entry) {
    throw new Error(`Market entry not found: ${entryId}`);
  }

  const content =
    await readCachedEntryDoc(cacheRoot, entry.id);

  return { entry, content };
}

export async function searchMarketEntries(
  cacheRoot = getMarketCacheRoot(),
  keyword
) {
  const normalized = String(keyword).trim().toLowerCase();
  const categories = await listMarketCategories(cacheRoot);
  const results = [];

  for (const category of categories) {
    const entries = await listMarketEntries(cacheRoot, category.id);
    for (const entry of entries) {
      const haystack = [
        entry.id,
        entry.title,
        entry.summary,
        ...(entry.tags ?? [])
      ]
        .join(" ")
        .toLowerCase();
      if (haystack.includes(normalized)) {
        results.push(entry);
      }
    }
  }

  return results;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function writeText(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

async function readCachedEntryDoc(cacheRoot, entryId) {
  try {
    return await fs.readFile(path.join(cacheRoot, ...entryId.split("/")) + ".md", "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
