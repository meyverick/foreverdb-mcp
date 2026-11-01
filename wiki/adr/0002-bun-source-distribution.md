---
okf_version: "0.2"
type: ArchitectureDecisionRecord
title: "0002 — Source Distribution on Bun Instead of a Compiled Binary"
tier: master
generated: { by: "agent/pi", at: 2026-11-01T00:00:00Z }
sources: [{ id: manifest, resource: ../../foreverdb-mcp/package.json }, { id: release, resource: ../../.github/workflows/release.yml }]
status: stable
stale_after: 2027-11-01
---

# 0002 — Source Distribution on Bun Instead of a Compiled Binary

## Context

The server is an HTTP proxy: fifteen tools, one fetch, a cache, a pacer and an error classifier. It
has no CPU-bound work, no unsafe code and no platform-specific call. Shipping it as a compiled binary
meant five release runners, a checksum file, two installer scripts, a `PATH` edit, and an absolute path
pasted into every client config — plus a contribution that waited on a long native build.

## Decision

Publish the TypeScript source as an npm package whose `bin` points at `src/main.ts`, and let `bunx` run
it. The published artifact is the reviewed source: no `dist/`, no bundling step, no per-platform
matrix. The tool surface is held fixed by parity fixtures taken from the previous implementation,
so a distribution change does not become a behavior change.

## Alternatives Considered

**Compiled single-file binaries via `bun build --compile`.** Rejected for now: it keeps the platform
matrix and the artifact verification, and buys startup time this program does not need. It remains the
documented escape hatch if a no-runtime install ever becomes a requirement.

**`tsc` to `dist/` and publish that.** Rejected: a build artifact in the published tree adds a
stale-`dist` failure mode and a second thing to review, for no runtime benefit.

**Hand-rolled JSON-RPC over Node and no dependency tree.** Rejected: version negotiation and the
2025-11-25 protocol revision are the wrong thing to own, and the transport cost is paid once per
process, not per call.

## Consequences

- Users need Bun installed. That is one documented prerequisite in exchange for one command.
- A first `bunx` run resolves the dependency tree; later runs are cached and start in a fraction of a
  second.
- The npm tree (the SDK and its transitive dependencies) is now supply-chain surface. Mitigations:
  `--provenance` on publish, a committed lockfile, `--frozen-lockfile` in the gate, and a generated
  dependency ledger.
- Release work collapses to one job, so the time between a tag and a usable version drops from a
  multi-runner build to a few minutes of verification.
- Users who still pin a `0.1.x` binary keep working; the old release assets stay downloadable.
