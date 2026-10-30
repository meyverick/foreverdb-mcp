---
okf_version: "0.2"
type: ArchitectureDecisionRecord
title: "0001 — Read-Only JSON Proxy Over a Typed Model"
tier: master
generated: { by: "agent/pi", at: 2026-10-30T00:00:00Z }
sources: [{ id: api-docs, resource: ../../../api-docs.md }]
status: stable
stale_after: 2027-10-30
---

# 0001 — Read-Only JSON Proxy Over a Typed Model

## Context

The data service publishes twenty-two read-only endpoints whose payloads are rich, evolving and
documented as JSON. The program must expose them to an assistant with correct arguments, correct
errors and a mandatory credit line, and it must stay correct as the service adds fields.

## Decision

Model only what the program itself acts on — the list envelope, the error document, the arguments of
each lookup — and pass everything else through verbatim. No struct describes an item, a quest or a
recipe. Parameters are typed because a wrong parameter is the program's problem; payloads are not,
because a new field is the service's business.

## Alternatives Considered

**Typed models for all endpoints.** Rejected: it duplicates a schema the service already owns, makes
every upstream addition a code change, and turns a compatible response into a deserialisation failure.

**Generic single tool with an endpoint string.** Rejected: the assistant would have to know the filter
matrix from prose, and wrong filters would surface as upstream errors rather than a schema it cannot
construct.

**Local persistence with a database.** Rejected: the data is read-only, minute-cacheable and owned
elsewhere; a database would add a migration and expiry burden with no correctness gain.

## Consequences

- Upstream additive changes are invisible; nothing needs doing when the service adds a field.
- Shapes the program does depend on — envelope, error document — are the only things that can break it.
- The assistant sees the service's own wording for failures and the service's own structure for data,
  so documentation written against the API remains true inside the assistant.
