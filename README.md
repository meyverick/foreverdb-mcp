> *Architected and directed by Human Intelligence, **implemented by AI**.*

# ForeverDB Assistant Software

The software that turns a question about World of Warcraft Forever into real game data: one
self-contained helper your AI assistant can call, with no servers to run and no databases to look
after.

## Why It Matters

Game knowledge goes stale. A wiki page is out of date the moment a patch lands, and an AI assistant
trained on old text will happily invent stats. This software replaces memory with a live lookup, so
answers reflect the game as it is, and every answer names where it came from.

## Key Capabilities at a Glance

- One command to install, and your assistant points at it.
- Fifteen kinds of lookup, from a single item to a profession's full recipe list.
- Answers arrive with the game build they came from, so you can tell how fresh they are.
- Respectful of the data service: it queues its work, reuses recent answers, and reports limits
  plainly instead of failing silently.
- Works on macOS, Linux and Windows; it is a published package that runs on Bun, so there is no
  download to unpack and no platform-specific build.

Every answer credits [ForeverDB.net](https://foreverdb.net) with a visible link, as the data source
requires, and the credit travels with the data rather than depending on the assistant to repeat it.

## Who Is This For?

- Anyone who wants an AI assistant that knows actual Forever item stats, quest chains and vendor
  stock.
- Maintainers who need to ship the helper to other people, and want the install, release and
  documentation habits to copy.

## Explore the Documentation

Begin with the [curriculum map](wiki/index.md), or take the short path to a working setup in
[Getting Started](wiki/01-getting-started.md).

The rendered wiki for this software is published at
https://github.com/meyverick/foreverdb-mcp/wiki

Support the whole tree at once via [thanks.dev](https://thanks.dev/u/gh/meyverick).
