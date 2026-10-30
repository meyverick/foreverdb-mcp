---
okf_version: "0.2"
type: WikiPage
title: "Module Wiki — Curriculum Map"
tier: beginner
generated: { by: "agent/pi", at: 2026-10-30T00:00:00Z }
sources: [{ id: api-docs, resource: ../../../api-docs.md }]
status: stable
stale_after: 2027-10-30
---

# Module Wiki — Curriculum Map

The software is one program with fifteen ways to ask for data. Work down the tiers and stop when your
question is answered.

| Tier | Page | What you get |
| --- | --- | --- |
| Beginner | [01-getting-started](01-getting-started.md) | A key, an install, a working assistant in five minutes |
| Practitioner | [02-guides-and-workflows](02-guides-and-workflows.md) | The full lookup catalogue, paging, languages, error handling |
| Advanced | [03-architecture-and-internals](03-architecture-and-internals.md) | Request path, cache, pacing, error classification, telemetry |
| Master | [04-mastery-and-extension](04-mastery-and-extension.md) | Release pipeline, asset naming, adding a lookup, failure matrix |

## Decisions on Record

- [0001 — Read-only JSON proxy over a typed model](adr/0001-read-only-json-proxy.md)

## The One Thing to Remember

Every answer must credit ForeverDB.net with a visible link to https://foreverdb.net. The data service
revokes keys used without credit. The program attaches the credit line to every successful result so
you do not have to remember it — but the credit has to stay visible wherever the data ends up.

## What This Program Is Not

It is not a cache you can query offline, not a second copy of the game database, and not a server.
There is no port to open, no daemon to supervise, and no state that outlives the process. It borrows
data, states its source, and forgets it after a minute, by design.
