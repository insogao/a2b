import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { updateMarketCache } from "./update";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true }))
  );
  tempDirs.length = 0;
});

describe("market update", () => {
  it("downloads the top-level index, category index, and local markdown docs", async () => {
    const cacheRoot = await fs.mkdtemp(path.join(os.tmpdir(), "a2b-market-"));
    tempDirs.push(cacheRoot);

    const files = new Map<string, string>([
      [
        "index.json",
        JSON.stringify({
          categories: [
            {
              id: "search",
              title: "Search",
              summary: "Search engines"
            }
          ]
        })
      ],
      [
        "search/index.json",
        JSON.stringify({
          category: {
            id: "search",
            title: "Search"
          },
          entries: [
            {
              id: "search/baidu",
              title: "Baidu",
              summary: "Chinese search engine",
              sourceType: "local_doc",
              sourceUrl: "search/baidu.md",
              tags: ["search"]
            },
            {
              id: "search/google",
              title: "Google",
              summary: "External GitHub example",
              sourceType: "external_github",
              sourceUrl: "https://github.com/example/google-guide",
              tags: ["search", "external"]
            },
            {
              id: "multimedia/yt-dlp",
              title: "yt-dlp",
              summary: "External download tool",
              sourceType: "external_tool",
              sourceUrl: "https://github.com/yt-dlp/yt-dlp",
              docPath: "multimedia/yt-dlp.md",
              tags: ["video", "download"]
            }
          ]
        })
      ],
      [
        "search/baidu.md",
        "# Baidu\n\nUse Baidu for Chinese-language search tasks.\n"
      ],
      [
        "multimedia/yt-dlp.md",
        "# yt-dlp\n\nInstall yt-dlp separately before using it.\n"
      ]
    ]);

    const fetched: string[] = [];
    await updateMarketCache({
      cacheRoot,
      fetchText: async (relativePath) => {
        fetched.push(relativePath);
        const content = files.get(relativePath);
        if (!content) {
          throw new Error(`Missing fixture for ${relativePath}`);
        }
        return content;
      }
    });

    expect(fetched).toEqual([
      "index.json",
      "search/index.json",
      "search/baidu.md",
      "multimedia/yt-dlp.md"
    ]);
    expect(
      await fs.readFile(path.join(cacheRoot, "index.json"), "utf8")
    ).toContain('"id":"search"');
    expect(
      await fs.readFile(path.join(cacheRoot, "search", "index.json"), "utf8")
    ).toContain('"id":"search/baidu"');
    expect(
      await fs.readFile(path.join(cacheRoot, "search", "baidu.md"), "utf8")
    ).toContain("# Baidu");
    expect(
      await fs.readFile(path.join(cacheRoot, "multimedia", "yt-dlp.md"), "utf8")
    ).toContain("# yt-dlp");
  });
});
