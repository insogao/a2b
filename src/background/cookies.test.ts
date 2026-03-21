import { describe, expect, it } from "vitest";
import {
  filterCookiesForUrl,
  formatCookieHeader,
  toCookiesResponse
} from "./cookies";

const cookies: chrome.cookies.Cookie[] = [
  {
    domain: ".google.com",
    hostOnly: false,
    httpOnly: false,
    name: "SID",
    path: "/",
    sameSite: "lax",
    secure: true,
    session: false,
    storeId: "0",
    value: "aaa"
  },
  {
    domain: ".example.com",
    hostOnly: false,
    httpOnly: false,
    name: "OTHER",
    path: "/",
    sameSite: "lax",
    secure: false,
    session: false,
    storeId: "0",
    value: "bbb"
  }
];

describe("cookies", () => {
  it("filters cookies to the active site", () => {
    expect(
      filterCookiesForUrl(cookies, "https://mail.google.com/mail/u/0/#inbox")
    ).toEqual([cookies[0]]);
  });

  it("formats a cookie header string", () => {
    expect(formatCookieHeader([cookies[0]])).toBe("SID=aaa");
  });

  it("builds a bridge-friendly cookie response", () => {
    expect(
      toCookiesResponse("session-alpha-tab-381", [cookies[0]])
    ).toEqual({
      targetId: "session-alpha-tab-381",
      cookies: [cookies[0]],
      header: "SID=aaa"
    });
  });
});
