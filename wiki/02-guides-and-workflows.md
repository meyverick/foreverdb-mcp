---
okf_version: "0.2"
type: WikiPage
title: "Guides and Workflows"
tier: practitioner
generated: { by: "agent/pi", at: 2026-10-30T00:00:00Z }
sources: [{ id: api-docs, resource: ../../../api-docs.md }]
status: stable
stale_after: 2027-10-30
---

# Guides and Workflows

## The Lookup Catalogue

Each lookup does two jobs: give it an identity and it returns one record; leave the identity out and it
searches. Paging parameters are `limit` (1–100) and `offset`, and `lang` (Spanish, Latin-American
Spanish, German, French) works wherever the game itself has translated names.

| Lookup | Identity | Narrows the list |
| --- | --- | --- |
| `fdb_meta` | — | — |
| `fdb_items` | `id` | `q`, `quality`, `class`, `slot`, `minLevel`, `maxLevel` |
| `fdb_spells` | `id` | `q` |
| `fdb_quests` | `id` | `q`, `zone`, `minLevel`, `maxLevel`, `side` |
| `fdb_vendors` | `id` | `q`, `zone`, `seen` |
| `fdb_dungeons` | `id` | — |
| `fdb_classes` | `name` | — |
| `fdb_itemsets` | `id` | `q` |
| `fdb_professions` | `slug` | `q`, `new`, `changed` |
| `fdb_gathering` | `slug` (required) | `zone` |
| `fdb_battlegrounds` | — | — |
| `fdb_changes` | — | `kind`, `verified` |
| `fdb_content` | `slug` | `kind` (`news`, `guide`, … or `posts`) |
| `fdb_poisons` | — | — |
| `fdb_disenchant` | — | — |

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
| `missing_api_key` | the environment variable is absent or blank | set the key and restart the assistant |
| `bad_key` | the service rejected the key | check it was copied whole and not revoked |
| `rate_limit` | the minute or daily budget is spent | wait for the stated interval; the program already paced itself |
| `upstream_unavailable` | the service answered 5xx twice | retry later; this is not a request problem |
| `timeout` | no answer within the request window | retry; check connectivity |

The program never retries blindly. It retries a rate-limited or server-side failure exactly once, and
then reports it. That keeps a bad minute from burning the day's budget.

## Budget Maths

The service allows 60 requests a minute and 10,000 a day per key. The program paces itself under that
ceiling and caches every answer for a minute, keyed by request. A conversation that circles back to the
same item therefore costs one request, not one per mention. If you script bulk lookups, batch them and
expect the daily ceiling to be the real limit.

## Language Behaviour

Ask for a language and translated names arrive next to the English ones, so nothing is lost when the
game lacks a translation. Creature and NPC names, quest titles and the service's own prose stay in
English by design.
