# ForeverDB MCP Server

A single, self-contained helper that gives AI assistants live World of Warcraft Forever data —
items, spells, quests, vendors, professions, dungeons and more — with the game build recorded on
every answer.

## Why It Matters

An assistant without data guesses. Ask it for an item's stats, a quest's chain or a vendor's stock
and you get something plausible but invented. This helper replaces the guess with a lookup: the
assistant asks, the data service answers, and you see real numbers. Each answer also names the
source, so the ForeverDB community gets credit for maintaining it.

## Key Capabilities at a Glance

- Fifteen focused lookups, each able to browse a list or fetch one record.
- Search in your language: English names stay alongside Spanish, German and French ones.
- Answers carry the game build they came from, so freshness is visible rather than assumed.
- Polite to the data service: it paces itself to the agreed request budget, reuses recent answers,
  and explains plainly when a limit or missing key gets in the way.
- Installs on macOS, Linux and Windows without any companion service, database or background
  process.

## Who Is This For?

- **Players** who want an AI assistant that knows actual Forever content.
- **Bot and community-site authors** who need dependable data with clear attribution.
- **Rust developers** who want a compact, well-tested example of a careful data helper.

## Explore the Documentation

The wiki carries everything practical: start at the [curriculum map](wiki/index.md), take the
five-minute setup in [Getting Started](wiki/01-getting-started.md), and go as deep as the
architecture notes when you want to understand why it behaves the way it does.

The rendered wiki is published at https://github.com/meyverick/foreverdb-mcp/wiki

Setup, configuration, the full lookup catalogue and troubleshooting live there rather than here, so
this page stays readable for everyone.
