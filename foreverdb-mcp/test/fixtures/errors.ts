// Error-code snapshot taken from the Rust `UpstreamError` at crate version 0.1.3.
// Clients and docs already quote these strings, so the port must not reword them.

export interface ErrorCase {
  /** HTTP status, or 0 for a failure that never reached the API. */
  status: number;
  retryAfter?: number;
  body?: string;
  /** Classification, one of the cases the Rust `classify` handled. */
  kind: "missing_key" | "timeout" | "network" | "response";
  code: string;
  message: string;
}

export const ERROR_CASES: ErrorCase[] = [
  {
    kind: "missing_key",
    status: 0,
    code: "missing_api_key",
    // The one message this rewrite changes: the new spec requires the error to
    // name both ways to supply the key, and Rust named only the variable.
    message:
      "The ForeverDB API key is missing: pass --key <value> or set FOREVERDB_API_KEY, then restart the server.",
  },
  {
    kind: "timeout",
    status: 0,
    code: "timeout",
    message: "The ForeverDB API did not answer within the request timeout.",
  },
  {
    kind: "network",
    status: 0,
    code: "network_error",
    message: "Could not reach the ForeverDB API: connection refused",
  },
  {
    kind: "response",
    status: 500,
    body: "",
    code: "upstream_unavailable",
    message: "The ForeverDB API answered HTTP 500.",
  },
  {
    kind: "response",
    status: 500,
    body: '{"error":{"code":"rate_limit","message":"x"}}',
    code: "upstream_unavailable",
    message: "The ForeverDB API answered HTTP 500.",
  },
  {
    kind: "response",
    status: 429,
    retryAfter: 2,
    body: '{"error":{"code":"rate_limit","message":"Slow down: this key allows 60 requests a minute."}}',
    code: "rate_limit",
    message: "Slow down: this key allows 60 requests a minute.",
  },
  {
    kind: "response",
    status: 429,
    retryAfter: 7,
    body: "nope",
    code: "rate_limit",
    message: "Slow down: retry after 7s.",
  },
  {
    kind: "response",
    status: 429,
    body: "nope",
    code: "rate_limit",
    message: "Slow down: the key's request budget is spent.",
  },
  {
    kind: "response",
    status: 404,
    body: "not found",
    code: "upstream_error",
    message: "The ForeverDB API answered HTTP 404.",
  },
  {
    kind: "response",
    status: 422,
    body: '{"error":{"code":"invalid_query","message":"Unknown filter: colour"}}',
    code: "invalid_query",
    message: "Unknown filter: colour",
  },
];
