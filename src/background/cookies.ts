export type CookiesResponse = {
  targetId: string;
  cookies: chrome.cookies.Cookie[];
  header: string;
};

export function filterCookiesForUrl(
  cookies: chrome.cookies.Cookie[],
  url: string
): chrome.cookies.Cookie[] {
  const hostname = new URL(url).hostname;

  return cookies.filter((cookie) => matchesHostname(cookie.domain, hostname));
}

export function formatCookieHeader(
  cookies: chrome.cookies.Cookie[]
): string {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

export function toCookiesResponse(
  targetId: string,
  cookies: chrome.cookies.Cookie[]
): CookiesResponse {
  return {
    targetId,
    cookies,
    header: formatCookieHeader(cookies)
  };
}

function matchesHostname(domain: string, hostname: string): boolean {
  const normalizedDomain = domain.replace(/^\./, "");
  return (
    hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`)
  );
}
