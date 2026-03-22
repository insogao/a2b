import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listMarketCategories,
  listMarketEntries,
  searchMarketEntries,
  showMarketEntry
} from "./commands";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true }))
  );
  tempDirs.length = 0;
});

describe("market commands", () => {
  it("lists top-level categories from cache", async () => {
    const cacheRoot = await seedCache();

    const categories = await listMarketCategories(cacheRoot);

    expect(categories).toEqual([
      {
        id: "search",
        title: "Search",
        summary: "Search tools"
      },
      {
        id: "news",
        title: "News",
        summary: "News sources"
      },
      {
        id: "multimedia",
        title: "Multimedia",
        summary: "Media tools"
      }
    ]);
  });

  it("lists entries for a category and can show entries with cached docs", async () => {
    const cacheRoot = await seedCache();

    const entries = await listMarketEntries(cacheRoot, "search");
    expect(entries).toHaveLength(2);
    expect(entries[0]?.id).toBe("search/baidu");

    const entry = await showMarketEntry(cacheRoot, "search/baidu");
    expect(entry.entry.title).toBe("Baidu");
    expect(entry.content).toContain("# Baidu");

    const externalTool = await showMarketEntry(cacheRoot, "multimedia/yt-dlp");
    expect(externalTool.entry.title).toBe("yt-dlp (External Tool)");
    expect(externalTool.content).toContain("Install yt-dlp separately");
  });

  it("searches entries across categories", async () => {
    const cacheRoot = await seedCache();

    const results = await searchMarketEntries(cacheRoot, "video");

    expect(results).toContainEqual(
      expect.objectContaining({
        id: "multimedia/yt-dlp",
        title: "yt-dlp (External Tool)"
      })
    );
  });
});

async function seedCache() {
  const cacheRoot = await fs.mkdtemp(path.join(os.tmpdir(), "a2b-market-"));
  tempDirs.push(cacheRoot);

  await fs.mkdir(path.join(cacheRoot, "search"), { recursive: true });
  await fs.mkdir(path.join(cacheRoot, "news"), { recursive: true });
  await fs.mkdir(path.join(cacheRoot, "multimedia"), { recursive: true });

  await fs.writeFile(
    path.join(cacheRoot, "index.json"),
    JSON.stringify({
      categories: [
        { id: "search", title: "Search", summary: "Search tools" },
        { id: "news", title: "News", summary: "News sources" },
        { id: "multimedia", title: "Multimedia", summary: "Media tools" }
      ]
    }),
    "utf8"
  );
  await fs.writeFile(
    path.join(cacheRoot, "search", "index.json"),
    JSON.stringify({
      category: { id: "search", title: "Search", summary: "Search tools" },
      entries: [
        {
          id: "search/baidu",
          title: "Baidu",
          summary:
            "Baidu search: Chinese-language queries, fallback for DOM-submit issues, use when local results matter",
          sourceType: "local_doc",
          sourceUrl: "search/baidu.md",
          tags: ["search", "china"]
        },
        {
          id: "search/google",
          title: "Google",
          summary: "Google search guide",
          sourceType: "external_github",
          sourceUrl: "https://github.com/example/google",
          tags: ["search", "external"]
        }
      ]
    }),
    "utf8"
  );
  await fs.writeFile(
    path.join(cacheRoot, "news", "index.json"),
    JSON.stringify({
      category: { id: "news", title: "News", summary: "News sources" },
      entries: []
    }),
    "utf8"
  );
  await fs.writeFile(
    path.join(cacheRoot, "multimedia", "index.json"),
    JSON.stringify({
      category: { id: "multimedia", title: "Multimedia", summary: "Media tools" },
      entries: [
        {
          id: "multimedia/yt-dlp",
          title: "yt-dlp (External Tool)",
          summary:
            "External CLI tool for downloading videos from YouTube and other sites. Not included with A2B.",
          sourceType: "external_tool",
          sourceUrl: "https://github.com/yt-dlp/yt-dlp",
          docPath: "multimedia/yt-dlp.md",
          tags: ["video", "download"]
        }
      ]
    }),
    "utf8"
  );
  await fs.writeFile(
    path.join(cacheRoot, "search", "baidu.md"),
    "# Baidu\n\nUse Baidu for Chinese-language search tasks.\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(cacheRoot, "multimedia", "yt-dlp.md"),
    "# yt-dlp\n\nInstall yt-dlp separately before using it from shell workflows.\n",
    "utf8"
  );

  return cacheRoot;
}
