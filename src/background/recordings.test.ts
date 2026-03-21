import { describe, expect, it } from "vitest";
import { RecordingStore } from "./recordings";

describe("RecordingStore", () => {
  it("records entries only while a target is active", () => {
    const store = new RecordingStore();

    store.start("session-alpha-tab-381");
    store.add("session-alpha-tab-381", {
      kind: "click",
      selector: "#submit",
      url: "https://mail.google.com"
    });
    store.stop("session-alpha-tab-381");
    store.add("session-alpha-tab-381", {
      kind: "click",
      selector: "#ignored",
      url: "https://mail.google.com"
    });

    expect(store.get("session-alpha-tab-381")).toEqual([
      {
        kind: "click",
        selector: "#submit",
        url: "https://mail.google.com"
      }
    ]);
  });

  it("clears a recording session", () => {
    const store = new RecordingStore();

    store.start("session-alpha-tab-381");
    store.add("session-alpha-tab-381", {
      kind: "navigation",
      title: "Inbox",
      url: "https://mail.google.com"
    });
    store.clear("session-alpha-tab-381");

    expect(store.get("session-alpha-tab-381")).toEqual([]);
  });

  it("can serialize and hydrate active recording state", () => {
    const store = new RecordingStore();

    store.start("session-alpha-tab-381");
    store.add("session-alpha-tab-381", {
      kind: "input",
      selector: 'textarea[name="prompt"]',
      value: "hello",
      url: "https://gemini.google.com"
    });

    const snapshot = store.snapshot();
    const hydrated = RecordingStore.fromSnapshot(snapshot);

    expect(hydrated.isActive("session-alpha-tab-381")).toBe(true);
    expect(hydrated.get("session-alpha-tab-381")).toEqual([
      {
        kind: "input",
        selector: 'textarea[name="prompt"]',
        value: "hello",
        url: "https://gemini.google.com"
      }
    ]);
  });
});
