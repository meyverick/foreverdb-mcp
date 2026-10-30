# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## 0.1.0 - 2026-10-13

### Added
- Initial project structure.
