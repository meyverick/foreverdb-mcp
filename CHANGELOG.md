# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.3.0 - 2026-11-25

### Added
- Six new read-only ForeverDB API tools: `fdb_zones`, `fdb_builds`, `fdb_buffs_nerfs`,
  `fdb_merchants_favor`, `fdb_bis`, and `fdb_endgame`.
- `fdb_credit` tool reporting ForeverDB's credit requirement and whether the active key is on the free
  tier (`meta.attributionRequired`, `X-Api-Plan`, `X-RateLimit-Limit` fallback, lazy `/meta` on cold
  start).
- Read-only MCP tool annotations (`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`,
  `openWorldHint: true`) on all 22 tools.
- App `User-Agent` header (`foreverdb-mcp/<version>`) on every upstream request to satisfy Cloudflare.
- Adaptive rate governor starting at `30/min` (free tier) and scaling automatically from the upstream
  `X-RateLimit-Limit` header (`30`, `60`, or `120` req/min).
- Explicit HTTP `402` (`subscription_required`) classification without retry, and closed-value schema
  validation (`limit` 1–100, `quality` 0–5, `fdb_bis`, `fdb_builds`, `fdb_buffs_nerfs` enums).

### Changed
- **BREAKING** (response format): Removed the prepended plain-text attribution line from tool results;
  all 21 API-backed tools now return verbatim upstream JSON (containing `meta.attribution` and
  `meta.attributionRequired`).
- **BREAKING** (parameters): Removed invalid `limit` and `offset` parameters from `fdb_battlegrounds`.
- Default upstream base URL switched from `https://foreverdb.net/api/v1` to
  `https://api.foreverdb.net/api/v1`, and login/key URL updated to `/auth/login?next=%2Fdevelopers`.
- `lang` parameter is now passed through on all 20 game-data tools.
- Refreshed tool descriptions for newly documented upstream fields (class talent trees, full spell
  mechanics, `betaEvent`/`speculation`, vendor `stockLists`, quest `Offered after`, recipe counts).
- Capped retryable 429 `Retry-After` delays at 10 seconds so daily-limit 429s fail fast.
- Split Zod schemas into `src/schemas.ts` to keep `src/params.ts` under workspace LOC ceilings.

### Fixed
- `statusOf()` now retains HTTP status on `{ kind: "api" }` errors so stderr telemetry logs the
  actual `upstream_status` instead of `"none"`.

## 0.2.0 - 2026-11-01

### Added
- `--key <value>` launch argument, with argv taking precedence over `FOREVERDB_API_KEY`; a blank value
  counts as absent. The missing-key error now names both ways to supply the key.
- Parity fixtures taken from the 0.1.3 wire behavior: all fifteen tool descriptions byte for byte,
  every tool and parameter-branch URL, and every error code and message, sealed by a digest.
- `Bun.serve`-backed upstream tests for key handling, retries, timeout classification, cache reuse and
  the concurrency ceiling, plus stdio transport tests for the tool surface and the CLI contract.
- Architecture decision record 0002, recording the move to a source distribution.

### Changed
- **BREAKING** (distribution): the server is now a TypeScript package published to npm as
  `foreverdb-mcp`, run with `bunx foreverdb-mcp`. There is no downloaded binary, no checksum, no
  `PATH` edit and no absolute path in client configs; Bun is the only prerequisite.
- Distribution is the only break: tool names, descriptions, parameters, target mapping, error codes,
  attribution, the 60-per-minute budget, the 8-in-flight bound, the 60-second cache and the
  single-retry behavior are unchanged and now proved by parity fixtures.
- The required attribution line is unchanged, as is the internal rate limiter's budget; pacing is now
  strictly one request at a time so a burst cannot spend two minutes' allowance inside one.
- Telemetry labels the tool that was actually called; previously twelve of the fifteen tools emitted
  `fdb_meta`.
- The module gate runs `biome check`, `tsc --noEmit`, `bun test` and `bun build`; the smoke slot pipes
  an `initialize` frame into the real entrypoint instead of a compiled binary.
- Release work is one publish job with `--provenance` on a tag push, replacing the five-runner build
  matrix, the archive uploads and the checksum file.

### Removed
- The Rust crate (`Cargo.toml`, `Cargo.lock`, `rustfmt.toml`, `src/*.rs`), `rmcp`, `tokio`, `reqwest`,
  `governor` and the tracing stack.
- `scripts/install.sh`, `scripts/install.ps1`, `scripts/install_test.sh` and the `cargo-binstall`
  metadata. Existing `0.1.x` release assets stay downloadable for clients that pinned them.

### Fixed
- The concurrency semaphore leaked one permit per queued handoff, so a sustained burst could leave the
  counter negative and stall every later tool call; permits now transfer to the waiter.
- Public READMEs carry the required epigraph verbatim, and the wiki describes the cache as a sweep of
  expired entries at 512 rather than a hard ceiling.

## 0.1.3 - 2026-10-30

### Changed
- Public READMEs open with a provenance notice stating the project was architected and directed by
  its author and implemented with AI assistance.

## 0.1.2 - 2026-10-30

### Added
- One structured wide event per tool call on stderr: tool, route, status, duration, cache hit and
  upstream status. stdout stays reserved for the protocol.
- Progressive four-tier wiki for the orchestrator and for the module, with architecture decision
  records, tracked in Git and published to the GitHub wiki for public repositories.
- Spotlight README for every repository; technical guides now live in the wiki.
- `wow` keyword on the crate.

### Changed
- Both spotlight READMEs rewritten as non-technical overviews, per the documentation contract.
- Gate slot 4 now enforces documentation topology: no code blocks in spotlight READMEs, all wiki
  tiers present with OKF frontmatter, and reference submodules exempted from the gate requirement.

## 0.1.1 - 2026-10-30

### Added
- `--version` and `--help` output, so an installed binary can be checked without
  starting the MCP server.

### Changed
- Release jobs run the packaged archive itself (`--version` from inside the
  extracted tarball or zip) instead of trusting the build output.
- GitHub actions bumped to `@v5`.

## 0.1.0 - 2026-10-28

### Added
- `foreverdb-mcp` crate: MCP server binary `foreverdb` exposing 15 ForeverDB domain tools over
  stdio, with per-domain search and detail modes.
- API key handling from `FOREVERDB_API_KEY`, 60-per-minute token bucket, bounded in-flight
  requests, 60-second response cache, and structured upstream error mapping.
- Attribution line on every data result, as the ForeverDB API terms require.
- Workspace manifests (`[workspace.lints]`, edition 2024) and native check lanes: `cargo fmt
  --check`, `clippy -D warnings`, `nextest`, `build --release`, stdio handshake smoke test.

### Changed
- HTTP client on `reqwest` 0.13, whose default TLS backend is rustls with platform certificate
  verification instead of native-tls.

