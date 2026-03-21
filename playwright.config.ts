import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120000,
  retries: 0,
  workers: 1,
  use: {
    headless: true
  }
});
