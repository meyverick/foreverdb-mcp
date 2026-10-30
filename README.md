> *Built to scratch my own itch: architected and directed by me, **implemented by AI**, and published openly in case it proves useful to others.*

# ForeverDB Assistant Software

The software that turns a question about World of Warcraft Forever into real game data: one
self-contained helper your AI assistant can call, with no servers to run and no databases to look
after.

## Why It Matters

Game knowledge goes stale. A wiki page is out of date the moment a patch lands, and an AI assistant
trained on old text will happily invent stats. This software replaces memory with a live lookup, so
answers reflect the game as it is, and every answer names where it came from.

## Key Capabilities at a Glance

- A single program you install once and point your assistant at.
- Fifteen kinds of lookup, from a single item to a profession's full recipe list.
- Answers arrive with the game build they came from, so you can tell how fresh they are.
- Respectful of the data service: it queues its work, reuses recent answers, and reports limits
  plainly instead of failing silently.
- Works on macOS, Linux and Windows, and can be installed from a download, from the Rust package
  registry, or from source.

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
