function buildHeaders(token, json = false) {
  const headers = {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  if (json) {
    headers["content-type"] = "application/json";
  }
  return headers;
}

export async function requestJson(baseUrl, token, method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: buildHeaders(token, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof json.error === "string" ? json.error : `${response.status}`);
  }
  return json;
}
