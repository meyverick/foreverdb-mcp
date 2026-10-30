---
okf_version: "0.2"
type: WikiPage
title: "Getting Started"
tier: beginner
generated: { by: "agent/pi", at: 2026-10-30T00:00:00Z }
sources: [{ id: api-docs, resource: ../../../api-docs.md }]
status: stable
stale_after: 2027-10-30
---

# Getting Started

## 1. Get a Data Key

The data service requires a personal key. Log in with Battle.net and request developer access at
https://foreverdb.net/join?next=%2Fdevelopers. Keys look like `fdb_` followed by an account prefix and
a secret; treat yours like a password, because anyone who has it can spend your request budget.

## 2. Install the Program

Pick one. All three produce the same single executable named `foreverdb`.

**macOS and Linux, no toolchain required:**

```sh
curl -fsSL https://raw.githubusercontent.com/meyverick/foreverdb-mcp/main/scripts/install.sh | sh
```

**Windows, PowerShell:**

```powershell
irm https://raw.githubusercontent.com/meyverick/foreverdb-mcp/main/scripts/install.ps1 | iex
```

**With a Rust toolchain, reusing the published binaries instead of compiling:**

```sh
cargo binstall foreverdb-mcp
```

The installers verify the release checksum, place the program in a per-user location, and print the
client configuration for the exact path they used.

## 3. Point Your Assistant At It

Add the server to your assistant's configuration. Use the absolute path: assistants launched from a
dock or start menu do not inherit your shell `PATH`, which is the single most common setup failure.

```json
{
  "mcpServers": {
    "foreverdb": {
      "command": "/absolute/path/to/foreverdb",
      "env": { "FOREVERDB_API_KEY": "fdb_your-key" }
    }
  }
}
```

## 4. Confirm It Works

```sh
foreverdb --version
```

Then restart your assistant and ask something only real data can answer: "what does item 19019 do, and
what can it disenchant into?" A working setup answers with stats and a credit line naming
ForeverDB.net. A broken setup says the key is missing — which is the program telling you exactly what
it needs.

## 5. Keep the Credit Visible

Every successful result begins with the credit line. If your own tooling strips it before showing the
data, put it back. The service revokes keys that are used without credit, and that revocation affects
you, not the program.

## Where to Go Next

Everyday usage — searching with filters, paging through results, reading errors — is covered in
[02-guides-and-workflows](02-guides-and-workflows.md).
