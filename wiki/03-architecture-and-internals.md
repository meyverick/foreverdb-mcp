---
okf_version: "0.2"
type: WikiPage
title: "Architecture and Internals"
tier: advanced
generated: { by: "agent/pi", at: 2026-11-01T00:00:00Z }
sources: [{ id: api-docs, resource: ../../../api-docs.md }, { id: upstream, resource: ../foreverdb-mcp/src/upstream.ts }]
status: stable
stale_after: 2027-11-01
---

# Architecture and Internals

## Module Map

| File | Owns |
| --- | --- |
| `src/main.ts` | argument handling, key resolution, stdio lifetime |
| `src/server.ts` | the twenty-two read-only tools, `run` path, verbatim JSON, `fdb_credit`, identity |
| `src/descriptions.ts` | the tool descriptions clients read |
| `src/schemas.ts` | per-tool zod input schemas and closed-value validation |
| `src/params.ts` | target builders mapping validated args to upstream paths and queries |
| `src/target.ts` | one request as encoded path segments plus query pairs |
| `src/upstream.ts` | `api.foreverdb.net`, `User-Agent`, adaptive rate, tier tracking, retries, cache writes |
| `src/limiter.ts` | the adaptive pacing token bucket and the concurrency semaphore |
| `src/cache.ts` | minute-long response cache, expired entries swept at 512 |
| `src/errors.ts` | failure classification (`402 subscription_required`, `429`, `5xx`) and telemetry codes |
| `src/version.ts` | the version, read from the package manifest |

Each file stays under the workspace's cohesion ceiling, so a change lands in exactly one place. The
published artifact is this source tree: `bin` points at `src/main.ts`, so there is no `dist/` to go
stale and no build step between the repository and a running server.

## The Path of One Call

1. The assistant sends a tool call. The SDK validates the arguments against the tool's zod schema, so a
   malformed argument never reaches the network.
2. The schema maps to a target: path segments appended to the API root, query pairs added only when
   present. Caller-supplied values are encoded, so a value cannot change the request's shape.
3. The upstream client checks for a key. Without one it returns a named error and sends nothing.
4. A cache hit returns the stored body and stops here — no request, no budget spent.
5. Otherwise the call waits for a pacing token, then for a concurrency permit, then sends to `https://api.foreverdb.net/api/v1` with `X-API-Key` and `User-Agent`.
6. On response, `X-RateLimit-Limit` updates the bucket rate (`30` free, `60` paid, `120` Plus) and response headers/`meta.attributionRequired` update the observed tier. On success the body is cached and returned verbatim; on failure the status and response document decide the error class (at most one retry for `5xx` or short-delay `429`, never `402`).
7. The server returns the JSON body (or structured error) and writes one telemetry line on stderr.

## Bounded Resources

| Resource | Limit | Reason |
| --- | --- | --- |
| Requests per minute | 30 initial, adapts from `X-RateLimit-Limit` (30/60/120) | starts safe for free keys and scales up automatically for paid/Plus |
| Concurrent requests | 8 | keeps a burst from multiplying latency without gain |
| Cache entries | 512, swept on insert | bounded memory without an eviction policy to tune |
| Cache lifetime | 60 seconds | equals what the service allows to be reused |
| Request timeout | 15 seconds | surfaces a dead connection instead of hanging a conversation |
| Retryable 429 delay | 10 seconds max | fails fast on daily-limit `Retry-After` instead of hanging a call |

Pacing happens before concurrency, so a queued request cannot hold a permit while it waits. The bucket
holds a single token on purpose: a burst allowance of 60 would let two windows' worth of requests land
inside one measured minute, which is exactly what the service forbids.

## Failure Classification Rules

The status decides first, the document second. A 5xx is an upstream failure even if the body carries a
client-style code, because retrying or reporting it as caller error would mislead. Otherwise a
structured error document is preserved verbatim, and only then does a bare status fall back to a
generic code. The service's own wording reaches the assistant unchanged; inventing our own text for a
`rate_limit` would hide the interval the service just supplied.

The one message the program owns is `missing_api_key`: it names both `--key` and `FOREVERDB_API_KEY`,
because a user who only reads the error should not have to read the docs to recover.

## Telemetry

Each tool call emits one JSON line on stderr with exactly these fields: `tool`, `route`, `status`,
`duration_ms`, `cached`, `upstream_status`. stdout stays reserved for the protocol, so a log line can
never corrupt a response; Biome's `noConsole` rule allows only `console.error` for that reason, and the
smoke test asserts stdout purity.

The `tool` field carries the tool that was actually called. An earlier build labelled twelve of the
fifteen tools `fdb_meta` by copying one string; the parity test now asserts every route and label.

## Test Topology

| Layer | What it proves |
| --- | --- |
| Fixtures | the twenty-two tool descriptions, every wire URL and every error code, sealed by a digest |
| Unit | encoding, cache expiry, pacing arithmetic, semaphore release, failure classification |
| Upstream | a real socket stub checks retries, timeouts, cache reuse, concurrency ceiling |
| Transport | the spawned server answers a real client over stdio: tool list, results, errors, CLI flags |
| Gate | a clean clone installs, typechecks and tests itself, then the entrypoint answers a handshake |

The contract fixtures seal the 22-tool v1 surface with an independent snapshot and digest, so any
accidental change to descriptions, parameters, wire URLs or error codes shows up immediately in review.
