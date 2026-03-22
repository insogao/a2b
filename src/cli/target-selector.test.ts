import { describe, expect, it } from "vitest";
import { resolveTargetSelector } from "../../bin/lib/a2b-target-selector.mjs";

const tabs = [
  {
    targetId: "tab-381",
    title: "Gmail",
    url: "https://mail.google.com/mail/u/0/#inbox"
  },
  {
    targetId: "tab-412",
    title: "Gemini",
    url: "https://gemini.google.com/app/abc"
  }
];

describe("resolveTargetSelector", () => {
  it("matches an exact target id", () => {
    expect(resolveTargetSelector("tab-381", tabs)).toEqual({
      ok: true,
      targetId: "tab-381"
    });
  });

  it("matches a unique target id prefix", () => {
    expect(resolveTargetSelector("tab-41", tabs)).toEqual({
      ok: true,
      targetId: "tab-412"
    });
  });

  it("reports ambiguous prefixes", () => {
    expect(resolveTargetSelector("tab-", tabs)).toEqual({
      ok: false,
      reason: "ambiguous",
      matches: ["tab-381", "tab-412"]
    });
  });

  it("reports missing targets", () => {
    expect(resolveTargetSelector("tab-999", tabs)).toEqual({
      ok: false,
      reason: "not_found"
    });
  });
});
