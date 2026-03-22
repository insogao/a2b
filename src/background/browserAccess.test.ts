import { describe, expect, it } from "vitest";
import { listBrowsableTargets } from "./browserAccess";

describe("listBrowsableTargets", () => {
  it("returns no targets when browser access is disabled", () => {
    const targets = listBrowsableTargets(
      [
        {
          id: 3,
          title: "Gmail",
          url: "https://mail.google.com/mail/u/0/#inbox"
        }
      ],
      "session-alpha",
      false
    );

    expect(targets).toEqual([]);
  });

  it("returns descriptors for http tabs when browser access is enabled", () => {
    const targets = listBrowsableTargets(
      [
        {
          id: 3,
          title: "Gmail",
          url: "https://mail.google.com/mail/u/0/#inbox"
        },
        {
          id: 9,
          title: "Extensions",
          url: "chrome://extensions"
        }
      ],
      "session-alpha",
      true
    );

    expect(targets).toEqual([
      {
        targetId: "tab-3",
        tabId: 3,
        title: "Gmail",
        origin: "https://mail.google.com",
        url: "https://mail.google.com/mail/u/0/#inbox"
      }
    ]);
  });
});
