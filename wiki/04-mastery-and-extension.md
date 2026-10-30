---
okf_version: "0.2"
type: WikiPage
title: "Mastery and Extension"
tier: master
generated: { by: "agent/pi", at: 2026-10-30T00:00:00Z }
sources: [{ id: release, resource: ../.github/workflows/release.yml }, { id: binstall, resource: ../../../references/cargo-binstall/SUPPORT.md }]
status: stable
stale_after: 2027-10-30
---

# Mastery and Extension

## Release Pipeline

A tag push is the only trigger. Five runner images build the same program, each natively, because the
cryptography library compiles C and cross-compiling it is a trap rather than a shortcut.

| Target | Runner | Why that runner |
| --- | --- | --- |
| `x86_64-unknown-linux-gnu` | oldest supported Ubuntu | keeps the required glibc version low |
| `aarch64-unknown-linux-gnu` | ARM Ubuntu | native build, no emulation |
| `x86_64-apple-darwin` | Intel macOS | native Intel build |
| `aarch64-apple-darwin` | Apple-silicon macOS | native ARM build |
| `x86_64-pc-windows-msvc` | Windows | native MSVC build |

Each job runs the packaged artifact — extracted from the very archive it is about to publish — and
checks its version before uploading. A build that cannot answer for itself never becomes a release.
Checksums are generated once, over the collected artifacts, and the crate is uploaded afterwards, with
a guard that skips an already-published version so a retried release stays green.

## Why Asset Names Carry No Version

Both the installer and the package manager must find the same file. The installer asks the
`releases/latest/download/` path, which has no version in it. The package manager builds a URL from a
versioned tag. Naming the asset without a version satisfies both, so one archive serves every consumer
and no duplicate uploads are needed.

The manifest declares where to find the archive and where the binary sits inside it, so the package
manager never guesses:

```toml
[package.metadata.binstall]
pkg-url = "{ repo }/releases/download/v{ version }/{ name }-{ target }{ archive-suffix }"
bin-dir = "{ name }-{ target }/{ bin }{ binary-ext }"
disabled-strategies = ["quick-install"]
```

`quick-install` is disabled deliberately: it would allow a third-party mirror to supply binaries for a
program that holds an API key. A prebuilt artifact from this repository, or a local compile, are the
only acceptable sources.

## Adding a Lookup

1. Add the argument struct in `params.rs`, documenting each field; the schema is generated from it.
2. Give it a `target()` mapping in `params/targets.rs`, including the identity path when one exists.
3. Add the tool function in `server.rs` with a description that names the filters and what the single
   record adds. Descriptions are the contract the assistant reads.
4. Extend the tool-list test's expected names, and the call table that asserts every tool carries the
   credit line.
5. Add a mapping test for the identity path and one for a filter, then run the full gate.

A lookup with no test is a lookup where a typo becomes a 404 that only users see.

## Failure Matrix

| Symptom | Cause | Move |
| --- | --- | --- |
| `missing_api_key` on every call | key absent or blank in the client's environment | set it in the client config, restart the client |
| `bad_key` | key revoked, mistyped, or from another account | issue a new key |
| `rate_limit` persists | a script ignoring the daily ceiling | back off, batch requests, rely on the minute cache |
| `timeout` on large lists | narrow the query or page with `limit`/`offset` | smaller requests, not longer timeouts |
| Installer says unsupported platform | no build for that architecture | build from source, or open an issue naming the target |
| Client reports the program is missing | bare name used instead of an absolute path | use the printed absolute path |

## Where the Next Improvement Belongs

A new data area is a new lookup, not a new program. A new consumer platform is a new archive target,
not a new pipeline. A new failure class belongs in the classifier, not in prose repeated at each call
site. Reach for structure only when a second case proves it is the same problem.
