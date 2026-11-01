// Upstream failure classification and the structured codes tools return.
// The code strings are contract: clients and docs quote them verbatim.

export type UpstreamFailure =
  | { kind: "missing_key" }
  | { kind: "timeout" }
  | { kind: "network"; detail: string }
  | { kind: "response"; status: number }
  | { kind: "api"; code: string; message: string };

/** Parses the API's `{"error": {"code", "message"}}` document. */
export function apiError(body: string): { code: string; message: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const error = (parsed as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return null;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code !== "string" || typeof message !== "string") return null;
  return { code, message };
}

/**
 * Classifies a non-success response. Server errors win over a body code so a
 * transient 5xx is reported as an upstream failure, not as client input.
 */
export function classify(
  status: number,
  retryAfter: number | undefined,
  body: string,
): UpstreamFailure {
  if (status >= 500) return { kind: "response", status };
  const documented = apiError(body);
  if (documented) return { kind: "api", ...documented };
  if (status === 429) {
    return {
      kind: "api",
      code: "rate_limit",
      message:
        retryAfter === undefined
          ? "Slow down: the key's request budget is spent."
          : `Slow down: retry after ${retryAfter}s.`,
    };
  }
  return { kind: "response", status };
}

export function codeOf(failure: UpstreamFailure): string {
  switch (failure.kind) {
    case "missing_key":
      return "missing_api_key";
    case "timeout":
      return "timeout";
    case "network":
      return "network_error";
    case "api":
      return failure.code;
    case "response":
      return failure.status >= 500 ? "upstream_unavailable" : "upstream_error";
  }
}

/** HTTP status when the failure carried one, for telemetry. */
export function statusOf(failure: UpstreamFailure): number | undefined {
  return failure.kind === "response" ? failure.status : undefined;
}

export function messageOf(failure: UpstreamFailure): string {
  switch (failure.kind) {
    case "missing_key":
      return "The ForeverDB API key is missing: pass --key <value> or set FOREVERDB_API_KEY, then restart the server.";
    case "timeout":
      return "The ForeverDB API did not answer within the request timeout.";
    case "network":
      return `Could not reach the ForeverDB API: ${failure.detail}`;
    case "api":
      return failure.message;
    case "response":
      return `The ForeverDB API answered HTTP ${failure.status}.`;
  }
}
