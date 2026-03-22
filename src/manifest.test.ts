import manifest from "./manifest";

describe("manifest", () => {
  it("declares an MV3 extension with browser bridge permissions", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("Current Browser Bridge");
    expect(manifest.permissions).toEqual(
      expect.arrayContaining([
        "storage",
        "tabs",
        "cookies",
        "debugger",
        "alarms",
        "scripting"
      ])
    );
    expect(manifest.host_permissions).toEqual(
      expect.arrayContaining(["http://127.0.0.1/*", "https://*/*", "http://*/*"])
    );
  });
});
