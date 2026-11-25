---
okf_version: "0.2"
type: WikiPage
title: "Guides and Workflows"
tier: practitioner
generated: { by: "agent/pi", at: 2026-11-01T00:00:00Z }
sources: [{ id: api-docs, resource: ../../../api-docs.md }]
status: stable
stale_after: 2027-11-01
---

# Guides and Workflows

## The Lookup Catalogue

Each lookup does two jobs: give it an identity and it returns one record; leave the identity out and it
searches. Paging parameters are `limit` (1–100) and `offset`, and `lang` (`en`, `es`, `es-MX`, `de`,
`fr`) works across all twenty game-data lookups wherever the game itself has translated names.

| Lookup | Identity | Narrows the list |
| --- | --- | --- |
| `fdb_meta` | — | — |
| `fdb_items` | `id` | `q`, `quality`, `class`, `slot`, `minLevel`, `maxLevel` |
| `fdb_spells` | `id` | `q` |
| `fdb_quests` | `id` | `q`, `zone`, `minLevel`, `maxLevel`, `side` |
| `fdb_vendors` | `id` | `q`, `zone`, `seen` |
| `fdb_dungeons` | `id` | — |
| `fdb_zones` | — | — |
| `fdb_classes` | `name` | — |
| `fdb_itemsets` | `id` | `q` |
| `fdb_professions` | `slug` | `q`, `new`, `changed` |
| `fdb_gathering` | `slug` (required) | `zone` |
| `fdb_battlegrounds` | — | — (unpaginated) |
| `fdb_changes` | — | `kind`, `verified` |
| `fdb_builds` | `build` (`latest` or version) | `type`, `class`, `change`, `q` (detail) |
| `fdb_buffs_nerfs` | — | `class`, `build`, `direction` |
| `fdb_merchants_favor` | — | — |
| `fdb_bis` | `spec` | `mode`, `level`, `easy`, `side` (detail) |
| `fdb_endgame` | — | — |
| `fdb_content` | `slug` | `kind` (`news`, `guide`, … or `posts`) |
| `fdb_poisons` | — | — |
| `fdb_disenchant` | — | — |
| `fdb_credit` | — | — |

## Three Recipes Worth Knowing

**Find gear, then understand it.** Search items with `q` and a level range, take an `id` from the
result, then call the same lookup with that `id`. The single record adds disenchant results and live
client differences that the list does not carry.

**Follow a profession end to end.** Ask for a profession by slug to get ranks and trainers, then page
its recipes by skill. Each recipe names its reagents, its skill colours, and where it is learned — every
trainer and vendor with prices, plus the quests and drops that teach it.

**Read a quest chain backwards.** A quest record carries `chain` with the earlier and following quests,
so an assistant can answer "what do I need to finish first?" rather than only "what is this quest?".

## Reading Errors

| What you see | What it means | What to do |
| --- | --- | --- |
| `missing_api_key` | no `--key` argument and no `FOREVERDB_API_KEY` | supply either one and restart the assistant |
| `bad_key` | the service rejected the key | check it was copied whole and not revoked |
| `subscription_required` | free-tier daily/plan limit reached (HTTP 402) | wait for the daily reset or upgrade your ForeverDB API plan |
| `rate_limit` | the minute or daily budget is spent | wait for the stated interval; the program already adapted to your plan |
| `upstream_unavailable` | the service answered 5xx twice | retry later; this is not a request problem |
| `timeout` | no answer within the request window | retry; check connectivity |

The program never retries blindly. It retries a server-side `5xx` failure once, retries a `429` once
only when `Retry-After` is at most 10 seconds (failing fast on daily limits), and never retries `402`.

## Budget Maths

ForeverDB accounts allow 5,000 requests/day and 30/min on the free tier, 10,000/day and 60/min on
the standard paid plan, and 50,000/day and 120/min on Plus. The program starts conservatively at 30/min,
adapts automatically from `X-RateLimit-Limit` on the first response, and caches every answer for a
minute, keyed by request.

## Language Behaviour

Ask for a language and translated names arrive next to the English ones, so nothing is lost when the
game lacks a translation. Creature and NPC names, quest titles and the service's own prose stay in
English by design.
