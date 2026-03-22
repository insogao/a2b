import fs from "node:fs/promises";
import {
  ensureMarketCacheDir,
  getCategoryIndexPath,
  getEntryDocPath,
  getTopLevelIndexPath
} from "./cache";
import { parseCategoryIndex, parseTopLevelIndex } from "./schema";

type UpdateMarketCacheOptions = {
  cacheRoot?: string;
  fetchText: (relativePath: string) => Promise<string>;
};

export async function updateMarketCache(options: UpdateMarketCacheOptions) {
  const cacheRoot = await ensureMarketCacheDir(options.cacheRoot);
  const topLevelRaw = await options.fetchText("index.json");
  await writeText(getTopLevelIndexPath(cacheRoot), topLevelRaw);

  const topLevel = parseTopLevelIndex(JSON.parse(topLevelRaw));

  for (const category of topLevel.categories) {
    const categoryPath = `${category.id}/index.json`;
    const categoryRaw = await options.fetchText(categoryPath);
    await writeText(getCategoryIndexPath(cacheRoot, category.id), categoryRaw);

    const categoryIndex = parseCategoryIndex(JSON.parse(categoryRaw));
    for (const entry of categoryIndex.entries) {
      const docPath = entry.sourceType === "local_doc" ? entry.sourceUrl : entry.docPath;
      if (!docPath) {
        continue;
      }

      const docRaw = await options.fetchText(docPath);
      await writeText(getEntryDocPath(cacheRoot, entry.id), docRaw);
    }
  }

  return {
    cacheRoot,
    categoryCount: topLevel.categories.length
  };
}

async function writeText(filePath: string, contents: string) {
  await fs.mkdir(new URL(".", `file://${filePath}`).pathname, {
    recursive: true
  });
  await fs.writeFile(filePath, contents, "utf8");
}
