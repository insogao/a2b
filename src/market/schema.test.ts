import { describe, expect, it } from "vitest";
import {
  parseCategoryIndex,
  parseTopLevelIndex,
  type MarketEntrySourceType
} from "./schema";

describe("market schema helpers", () => {
  it("parses the top-level category index", () => {
    const index = parseTopLevelIndex({
      categories: [
        {
          id: "search",
          title: "Search",
          summary: "Search tools"
        }
      ]
    });

    expect(index.categories).toEqual([
      {
        id: "search",
        title: "Search",
        summary: "Search tools"
      }
    ]);
  });

  it("parses category entries with supported source types", () => {
    const category = parseCategoryIndex({
      category: {
        id: "search",
        title: "Search"
      },
      entries: [
        {
          id: "search/baidu",
          title: "Baidu",
          summary: "Chinese search engine",
          sourceType: "local_doc" satisfies MarketEntrySourceType,
          sourceUrl: "search/baidu.md",
          tags: ["search", "china"]
        },
        {
          id: "search/google",
          title: "Google",
          summary: "External GitHub guide",
          sourceType: "external_github" satisfies MarketEntrySourceType,
          sourceUrl: "https://github.com/example/google",
          tags: ["search", "external"]
        },
        {
          id: "multimedia/yt-dlp",
          title: "yt-dlp",
          summary: "External download tool",
          sourceType: "external_tool" satisfies MarketEntrySourceType,
          sourceUrl: "https://github.com/yt-dlp/yt-dlp",
          docPath: "multimedia/yt-dlp.md",
          tags: ["video", "download"]
        }
      ]
    });

    expect(category.category).toEqual({
      id: "search",
      title: "Search",
      summary: ""
    });
    expect(category.entries).toHaveLength(3);
    expect(category.entries[2]?.sourceType).toBe("external_tool");
    expect(category.entries[2]?.docPath).toBe("multimedia/yt-dlp.md");
  });
});
