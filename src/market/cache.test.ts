import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ensureMarketCacheDir,
  getCategoryIndexPath,
  getEntryDocPath,
  getMarketCacheRoot,
  getTopLevelIndexPath
} from "./cache";

describe("market cache helpers", () => {
  it("resolves the default cache root under the home directory", () => {
    expect(getMarketCacheRoot()).toBe(
      path.join(os.homedir(), ".a2b", "market")
    );
  });

  it("builds the expected category and top-level index paths", () => {
    const root = "/tmp/a2b-market-cache";

    expect(getTopLevelIndexPath(root)).toBe(
      "/tmp/a2b-market-cache/index.json"
    );
    expect(getCategoryIndexPath(root, "search")).toBe(
      "/tmp/a2b-market-cache/search/index.json"
    );
  });

  it("builds entry markdown paths from slash-separated entry ids", () => {
    const root = "/tmp/a2b-market-cache";

    expect(getEntryDocPath(root, "search/baidu")).toBe(
      "/tmp/a2b-market-cache/search/baidu.md"
    );
    expect(getEntryDocPath(root, "news/reuters")).toBe(
      "/tmp/a2b-market-cache/news/reuters.md"
    );
  });

  it("normalizes directories before returning the cache root", async () => {
    const root = path.join(os.tmpdir(), "a2b-market-cache-test");
    const ensured = await ensureMarketCacheDir(root);

    expect(ensured).toBe(root);
  });
});
