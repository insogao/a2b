import type { ManifestV3Export } from "@crxjs/vite-plugin";

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "Current Browser Bridge",
  version: "0.1.0",
  description:
    "Connect AI tools to the current logged-in Chrome tab with target metadata, cookies, and logs.",
  permissions: [
    "storage",
    "tabs",
    "cookies",
    "debugger",
    "activeTab",
    "alarms",
    "scripting"
  ],
  host_permissions: ["http://127.0.0.1/*", "http://*/*", "https://*/*"],
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  action: {
    default_title: "Current Browser Bridge",
    default_popup: "src/popup/index.html"
  },
  web_accessible_resources: [
    {
      resources: ["ai-guide.html"],
      matches: ["http://*/*", "https://*/*"]
    }
  ],
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle"
    }
  ]
};

export default manifest;
