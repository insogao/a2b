import { describe, expect, it } from "vitest";
import {
  getEventElement,
  createNavigationEntry,
  normalizeClickEntry,
  normalizeInputEntry
} from "./recorder";

describe("recorder", () => {
  it("normalizes click events", () => {
    expect(
      normalizeClickEntry({
        selector: "#submit",
        text: "Sign in",
        url: "https://accounts.google.com/"
      })
    ).toEqual({
      kind: "click",
      selector: "#submit",
      text: "Sign in",
      url: "https://accounts.google.com/"
    });
  });

  it("normalizes input events", () => {
    expect(
      normalizeInputEntry({
        selector: 'input[name="email"]',
        value: "user@example.com",
        url: "https://accounts.google.com/"
      })
    ).toEqual({
      kind: "input",
      selector: 'input[name="email"]',
      value: "user@example.com",
      url: "https://accounts.google.com/"
    });
  });

  it("creates navigation entries", () => {
    expect(
      createNavigationEntry({
        title: "Inbox",
        url: "https://mail.google.com/mail/u/0/#inbox"
      })
    ).toEqual({
      kind: "navigation",
      title: "Inbox",
      url: "https://mail.google.com/mail/u/0/#inbox"
    });
  });

  it("finds an HTMLElement from an event composed path", () => {
    const button = document.createElement("button");
    const event = {
      target: null,
      composedPath: () => [button]
    } as unknown as Event;

    expect(getEventElement(event)).toBe(button);
  });
});
