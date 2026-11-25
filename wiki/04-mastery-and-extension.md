---
okf_version: "0.2"
type: WikiPage
title: "Mastery and Extension"
tier: master
generated: { by: "agent/pi", at: 2026-11-01T00:00:00Z }
sources: [{ id: release, resource: ../.github/workflows/release.yml }, { id: manifest, resource: ../foreverdb-mcp/package.json }]
status: stable
stale_after: 2027-11-01
---

# Mastery and Extension

## Working on the Server

All commands run in `foreverdb-mcp/`. Bun is the only toolchain; there is no compile step to wait for.

| Command | What it does |
| --- | --- |
| `bun install --frozen-lockfile` | installs exactly the locked dependency tree |
| `bun src/main.ts --version` | runs the entrypoint without installing anything |
| `bun test` | the whole suite: fixtures, units, upstream stub, stdio transport |
| `bunx tsc --noEmit` | type checks source and tests |
| `bunx biome check .` | formatting and linting, including the stdout discipline rule |
| `bun build src/main.ts --target=bun` | proves the module graph bundles; publish does not use it |

`scripts/check.sh --quick` runs those four lanes in order and stops before the clean-clone and smoke
slots; `scripts/check.sh` runs all six.

## Release Pipeline

A tag push is the only trigger, and the whole release is one job on one runner. The package publishes
its source, so there is no platform matrix, no archive, and no checksum file: what the tag holds is
what npm receives.

The job installs the locked tree, runs the verification lanes, and publishes with `--provenance`,
which uses the workflow's `id-token: write` permission to attest that this artifact was built from this
commit by this workflow. A tag that does not correspond to a reviewed commit produces an attestation
that says so.

## Versioning and Upgrades

Versions follow `MAJOR.MINOR.PATCH`. The install shape is public API here: `0.2.0` changed how the
server is obtained while leaving behavior identical, which semver treats as a major break in
distribution.

Clients resolve whatever version their config names. Pinning the version in the config is the only way
to make an upgrade deliberate, so document a pin when predictability matters:

```json
{
  "mcpServers": {
    "foreverdb": {
      "command": "bunx",
      "args": ["foreverdb-mcp@0.3.0", "--key", "fdb_your-key"]
    }
  }
}
```

Never re-publish a tag: the integrity hash and the provenance attestation both describe one artifact.

## Adding a Lookup

1. Add the zod schema in `src/schemas.ts`, describing each field; the client sees that text.
2. Give it a target builder in `src/params.ts`, including the identity path when one exists.
3. Register the tool in `src/server.ts` with read-only annotations and a description in
   `src/descriptions.ts` that names the filters and key fields, and add the parameters to
   `test/fixtures/tool-surface.ts`.
4. Add a wire case for every parameter branch to `test/fixtures/wire.ts` and re-seal `FIXTURE_DIGEST`
   in `test/parity.fixtures.ts`.
5. Extend `test/tools.test.ts` if the new tool has custom behavior, then run the full gate.

A lookup with no wire case is a lookup where a typo becomes a 404 that only users see.

## Why the Fixtures Are the Contract

The contract snapshot seals all twenty-two tools — every description, parameter list, wire URL branch,
and error code/message — under a static SHA-256 digest. Re-sealing the digest is deliberate, so an
accidental drift turns into a failing test instead of a quiet behavior change in production.

## Failure Matrix

| Symptom | Cause | Move |
| --- | --- | --- |
| `missing_api_key` on every call | no `--key` argument and no `FOREVERDB_API_KEY` | supply either one and restart the client |
| `bad_key` | key revoked, mistyped, or from another account | issue a new key |
| `subscription_required` | free-tier daily/plan limit reached (HTTP 402) | wait for reset or upgrade your ForeverDB API plan |
| `rate_limit` persists | a script ignoring the minute or daily ceiling | back off, batch requests, rely on the minute cache |
| `timeout` on large lists | narrow the query or page with `limit`/`offset` | smaller requests, not longer timeouts |
| Client reports the command is missing | `bunx` not on the client's `PATH` | use Bun's absolute path for that client only |
| `bunx` resolves an older version | the client does not pin a version | pin `foreverdb-mcp@<version>` in the arguments |

## Where the Next Improvement Belongs

A new data area is a new lookup, not a new program. A new failure class belongs in the classifier, not
in prose repeated at each call site. A new bound belongs next to the resource it limits. Reach for
structure only when a second case proves it is the same problem.
