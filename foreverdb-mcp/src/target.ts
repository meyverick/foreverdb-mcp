// One upstream request: encoded path segments plus query pairs.

export interface Target {
  segments: string[];
  query: Array<[string, string]>;
}

export function targetPath(...segments: string[]): Target {
  return { segments, query: [] };
}

/** Adds a query pair when the value is present. */
export function withQuery(
  target: Target,
  name: string,
  value: string | number | boolean | undefined,
): Target {
  if (value === undefined) return target;
  return { segments: target.segments, query: [...target.query, [name, String(value)]] };
}

/**
 * Builds the absolute URL. Segments go through `encodeURIComponent`, so a
 * caller-supplied value cannot escape its path position or reach another
 * endpoint; query values use the same form encoding the API expects.
 */
export function urlOf(target: Target, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const path = target.segments.map((segment) => encodeURIComponent(segment)).join("/");
  const query = new URLSearchParams(target.query).toString();
  return query.length > 0 ? `${base}/${path}?${query}` : `${base}/${path}`;
}

/** Cache identity: path plus query, never the API key. */
export function cacheKeyOf(target: Target): string {
  const key = target.segments.join("/");
  return target.query.reduce((acc, [name, value]) => `${acc}|${name}=${value}`, key);
}
