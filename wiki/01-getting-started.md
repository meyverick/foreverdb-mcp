---
okf_version: "0.2"
type: WikiPage
title: "Getting Started"
tier: beginner
generated: { by: "agent/pi", at: 2026-11-01T00:00:00Z }
sources: [{ id: api-docs, resource: ../../../api-docs.md }, { id: manifest, resource: ../foreverdb-mcp/package.json }]
status: stable
stale_after: 2027-11-01
---

# Getting Started

## 1. Get a Data Key

The data service requires a personal key. Log in with Battle.net and request developer access at
https://foreverdb.net/join?next=%2Fdevelopers. Keys look like `fdb_` followed by an account prefix and
a secret; treat yours like a password, because anyone who has it can spend your request budget.

## 2. Install the Program

There is nothing to download and nothing to unpack. The server is a published package that runs
directly, and Bun is the only prerequisite:

```sh
curl -fsSL https://bun.sh/install | bash
```

That is the whole install. The first time your assistant starts the server, `bunx` fetches the package
and caches it; later starts reuse the cache and take about a fifth of a second.

## 3. Point Your Assistant At It

Add the server to your assistant's configuration. Pass the key as the `--key` argument, or leave it out
and set `FOREVERDB_API_KEY` instead — the argument wins when both are present.

```json
{
  "mcpServers": {
    "foreverdb": {
      "command": "bunx",
      "args": ["foreverdb-mcp", "--key", "fdb_your-key"]
    }
  }
}
```

The environment variable keeps the key out of process listings, which is why it remains the preferred
choice on a shared machine:

```json
{
  "mcpServers": {
    "foreverdb": {
      "command": "bunx",
      "args": ["foreverdb-mcp"],
      "env": { "FOREVERDB_API_KEY": "fdb_your-key" }
    }
  }
}
```

Assistants launched from a dock or start menu do not inherit your shell `PATH`, so a client that cannot
find `bunx` needs Bun's absolute path as the command instead. That is the only configuration change
such a client needs.

## 4. Confirm It Works

```sh
bunx foreverdb-mcp --version
```

Then restart your assistant and ask something only real data can answer: "what does item 19019 do, and
what can it disenchant into?" A working setup answers with stats and a credit line naming
ForeverDB.net. A broken setup says the key is missing — which is the program telling you exactly what
it needs, and naming both ways to give it.

## 5. Keep the Credit Visible

Every successful result begins with the credit line. If your own tooling strips it before showing the
data, put it back. The service revokes keys that are used without credit, and that revocation affects
you, not the program.

## Where to Go Next

Everyday usage — searching with filters, paging through results, reading errors — is covered in
[02-guides-and-workflows](02-guides-and-workflows.md).
