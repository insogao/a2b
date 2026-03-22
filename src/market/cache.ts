import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function getMarketCacheRoot(root = path.join(os.homedir(), ".a2b", "market")) {
  return root;
}

export function getTopLevelIndexPath(root = getMarketCacheRoot()) {
  return path.join(root, "index.json");
}

export function getCategoryIndexPath(
  root = getMarketCacheRoot(),
  category: string
) {
  return path.join(root, category, "index.json");
}

export function getEntryDocPath(
  root = getMarketCacheRoot(),
  entryId: string
) {
  const segments = entryId.split("/").filter(Boolean);
  return path.join(root, ...segments) + ".md";
}

export async function ensureMarketCacheDir(root = getMarketCacheRoot()) {
  await fs.mkdir(root, { recursive: true });
  return root;
}
