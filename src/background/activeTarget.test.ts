import { describe, expect, it } from "vitest";
import { choosePopupTarget } from "./activeTarget";

const gmailTarget = {
  targetId: "tab-101",
  tabId: 101,
  title: "Gmail",
  origin: "https://mail.google.com",
  url: "https://mail.google.com/mail/u/0/#inbox"
};

const docsTarget = {
  targetId: "tab-202",
  tabId: 202,
  title: "Docs",
  origin: "https://docs.google.com",
  url: "https://docs.google.com/document/d/1"
};

describe("choosePopupTarget", () => {
  it("prefers the active web target when it exists", () => {
    const targets = new Map([
      [gmailTarget.tabId, gmailTarget],
      [docsTarget.tabId, docsTarget]
    ]);

    expect(
      choosePopupTarget({
        activeTabId: docsTarget.tabId,
        lastTargetTabId: gmailTarget.tabId,
        targets
      })
    ).toEqual(docsTarget);
  });

  it("falls back to the last registered web target when the active tab is the popup", () => {
    const targets = new Map([[gmailTarget.tabId, gmailTarget]]);

    expect(
      choosePopupTarget({
        activeTabId: 999,
        lastTargetTabId: gmailTarget.tabId,
        targets
      })
    ).toEqual(gmailTarget);
  });

  it("falls back to the first known target when the remembered tab no longer exists", () => {
    const targets = new Map([[docsTarget.tabId, docsTarget]]);

    expect(
      choosePopupTarget({
        activeTabId: 999,
        lastTargetTabId: gmailTarget.tabId,
        targets
      })
    ).toEqual(docsTarget);
  });
});
