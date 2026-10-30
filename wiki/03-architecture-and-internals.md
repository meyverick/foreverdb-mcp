---
okf_version: "0.2"
type: WikiPage
title: "Architecture and Internals"
tier: advanced
generated: { by: "agent/pi", at: 2026-10-30T00:00:00Z }
sources: [{ id: api-docs, resource: ../../../api-docs.md }, { id: upstream, resource: ../foreverdb-mcp/src/upstream.rs }]
status: stable
stale_after: 2027-10-30
---

# Architecture and Internals

## Module Map

| File | Owns |
| --- | --- |
| `main.rs` | argument handling, logging setup, stdio lifetime |
| `server.rs` | the fifteen tools, result shape, attribution, server identity |
| `upstream.rs` | key handling, pacing, concurrency ceiling, retries, cache writes |
| `target.rs` | one request as encoded path segments plus query pairs |
| `params.rs` | per-tool argument structs and their mapping to targets |
| `cache.rs` | minute-long response cache with a hard entry ceiling |
| `envelope.rs` | failure classification and the codes tools return |

Each file stays under the workspace's cohesion ceiling, so a change lands in exactly one place.

## The Path of One Call

1. The assistant sends a tool call. The router matches the tool and decodes arguments into the tool's
   parameter struct — a malformed argument never reaches the network.
2. The struct maps to a target: path segments appended to the API root, query pairs added only when
   present. Caller-supplied values are encoded, so a value cannot change the request's shape.
3. The upstream client checks for a key. Without one it returns a named error and sends nothing.
4. A cache hit returns the stored body and stops here — no request, no budget spent.
5. Otherwise the call waits for a pacing token, then for a concurrency permit, then sends.
6. On success the body is cached and returned. On failure the status and the response document decide
   the error class, and at most one retry is spent.
7. The server wraps the body with the credit line, or wraps the error as a tool-level failure.

## Bounded Resources

| Resource | Limit | Reason |
| --- | --- | --- |
| Requests per minute | 60, paced before sending | matches the service's per-key allowance |
| Concurrent requests | 8 | keeps a burst from multiplying latency without gain |
| Cache entries | 512, swept on insert | bounded memory without an eviction policy to tune |
| Cache lifetime | 60 seconds | equals what the service allows to be reused |
| Request timeout | 15 seconds | surfaces a dead connection instead of hanging a conversation |

Pacing happens before concurrency, so a queued request cannot hold a permit while it waits.

## Failure Classification Rules

The status decides first, the document second. A 5xx is an upstream failure even if the body carries a
client-style code, because retrying or reporting it as caller error would mislead. Otherwise a
structured error document is preserved verbatim, and only then does a bare status fall back to a
generic code. The service's own wording reaches the assistant unchanged; inventing our own text for a
`rate_limit` would hide the interval the service just supplied.

## Telemetry

Each tool call emits one structured event on stderr: the tool, the encoded route, the outcome code,
the duration in milliseconds, whether the answer came from cache, and the upstream status when a
request was made. stdout stays reserved for the protocol, so logs can never corrupt a response.

One event per call, at completion, with fields rather than sentences. A conversation is then
reconstructable from logs without reading code, and no amount of log volume reveals the key: it is
redacted at formatting time, not filtered later.

## Test Topology

| Layer | What it proves |
| --- | --- |
| Unit | encoding, cache expiry, pacing arithmetic, failure classification |
| Transport | the server answers a real client over an in-memory pipe: tool list, results, errors |
| Upstream | scripted HTTP stub checks retries, timeouts, cache reuse, concurrency ceiling |
| Gate | the packaged artifact starts and answers, in a clean clone |

The stub is a real socket, not a mock object, so the code under test performs its actual HTTP work.
