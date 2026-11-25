> *Architected and directed by Human Intelligence, **implemented by AI**.*

# ForeverDB MCP Server

A single, self-contained helper that gives AI assistants live World of Warcraft Forever data —
items, spells, quests, vendors, professions, dungeons and more — with the game build recorded on
every answer.

## Why It Matters

An assistant without data guesses. Ask it for an item's stats, a quest's chain or a vendor's stock
and you get something plausible but invented. This helper replaces the guess with a lookup: the
assistant asks, the data service answers, and you see real numbers. Each answer returns verbatim
JSON with the build and attribution metadata, and a dedicated `fdb_credit` lookup checks whether
your key is on the free tier where [ForeverDB.net](https://foreverdb.net) credit is required.

## Key Capabilities at a Glance

- Twenty-two read-only lookups covering items, spells, quests, vendors, dungeons, zones, classes and
  talents, item sets, professions, gathering, battlegrounds, poisons, disenchanting, changes seen in
  game, build diffs, buffs/nerfs, Merchant's Favor, best in slot, endgame progress, articles/posts,
  and credit status.
- Search in your language: English names stay alongside Spanish, Latin-American Spanish, German and
  French ones across every game-data lookup.
- Answers carry the game build they came from, so freshness is visible rather than assumed.
- Polite to the data service: it adapts its pacing to your account's tier (`30`, `60`, or `120`
  requests/minute), reuses recent answers, and explains plainly when a limit, subscription ceiling,
  or missing key gets in the way.
- Installs with one command on macOS, Linux and Windows, without any companion service, database or
  background process. Bun is the only prerequisite.

## Who Is This For?

- **Players** who want an AI assistant that knows actual Forever content.
- **Bot and community-site authors** who need dependable data with clear attribution.
- **TypeScript developers** who want a compact, well-tested example of a careful data helper.

## Explore the Documentation

The wiki carries everything practical: start at the [curriculum map](wiki/index.md), take the
five-minute setup in [Getting Started](wiki/01-getting-started.md), and go as deep as the
architecture notes when you want to understand why it behaves the way it does.

The rendered wiki is published at https://github.com/meyverick/foreverdb-mcp/wiki

Setup, configuration, the full lookup catalogue and troubleshooting live there rather than here, so
this page stays readable for everyone.

Support the whole tree at once via [thanks.dev](https://thanks.dev/u/gh/meyverick).
