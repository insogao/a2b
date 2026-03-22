import fs from "node:fs/promises";
import {
  getCategoryIndexPath,
  getEntryDocPath,
  getTopLevelIndexPath
} from "./cache";
import {
  parseCategoryIndex,
  parseTopLevelIndex,
  type MarketEntry
} from "./schema";

export async function listMarketCategories(cacheRoot: string) {
  const raw = await fs.readFile(getTopLevelIndexPath(cacheRoot), "utf8");
  return parseTopLevelIndex(JSON.parse(raw)).categories;
}

export async function listMarketEntries(cacheRoot: string, category: string) {
  const raw = await fs.readFile(getCategoryIndexPath(cacheRoot, category), "utf8");
  return parseCategoryIndex(JSON.parse(raw)).entries;
}

export async function showMarketEntry(cacheRoot: string, entryId: string) {
  const entry = await findMarketEntry(cacheRoot, entryId);
  const content = await readCachedEntryDoc(cacheRoot, entry.id);

  return {
    entry,
    content
  };
}

export async function searchMarketEntries(cacheRoot: string, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  const categories = await listMarketCategories(cacheRoot);
  const matches: MarketEntry[] = [];

  for (const category of categories) {
    const entries = await listMarketEntries(cacheRoot, category.id);
    matches.push(
      ...entries.filter((entry) => {
        const haystack = [
          entry.id,
          entry.title,
          entry.summary,
          ...entry.tags
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      })
    );
  }

  return matches;
}

async function findMarketEntry(cacheRoot: string, entryId: string) {
  const [category] = entryId.split("/");
  if (!category) {
    throw new Error("Invalid market entry id");
  }

  const entries = await listMarketEntries(cacheRoot, category);
  const entry = entries.find((candidate) => candidate.id === entryId);
  if (!entry) {
    throw new Error(`Market entry not found: ${entryId}`);
  }
  return entry;
}

async function readCachedEntryDoc(cacheRoot: string, entryId: string) {
  try {
    return await fs.readFile(getEntryDocPath(cacheRoot, entryId), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
