# foreverdb MCP server

Read-only MCP access to [ForeverDB](https://foreverdb.net) WoW Forever data: items, spells,
quests, vendors, professions, gathering, dungeons, classes, item sets, battlegrounds, poisons,
disenchanting, changes seen in game, articles and Blizzard posts.

The server is a single Rust binary speaking JSON-RPC over stdio. It keeps the API key on your
machine, pre-throttles to the key's budget (60 requests a minute), caches answers for at most the
minute the API allows, and attaches the attribution the API terms require to every data result.

## Install

macOS and Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/meyverick/foreverdb-mcp/main/scripts/install.sh | sh
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/meyverick/foreverdb-mcp/main/scripts/install.ps1 | iex
```

With a Rust toolchain, using the prebuilt release instead of compiling:

```sh
cargo binstall foreverdb-mcp
```

From source:

```sh
cargo install foreverdb-mcp
```

The installers verify the release checksum and print the client config using the
absolute install path, because GUI clients do not inherit your shell `PATH`.

## Run from a checkout

```sh
FOREVERDB_API_KEY=fdb_xxxxxxxx_your-key cargo run --release --bin foreverdb
```

`FOREVERDB_BASE_URL` overrides the API root (default `https://foreverdb.net/api/v1`); useful for
tests only.

## Client config

```json
{
  "mcpServers": {
    "foreverdb": {
      "command": "/absolute/path/to/foreverdb",
      "args": [],
      "env": { "FOREVERDB_API_KEY": "fdb_xxxxxxxx_your-key" }
    }
  }
}
```

## Tools

Every domain tool takes an identity parameter (`id`, `name` or `slug`) to fetch one record and
omits it to search or list. `limit` (1-100), `offset` and `lang` (`es`, `es-MX`, `de`, `fr`) pass
through where the API supports them.

| Tool | Identity | Filters | One record returns |
| --- | --- | --- | --- |
| `fdb_meta` | - | - | build, level cap, counts |
| `fdb_items` | `id` | `q`, `quality`, `class`, `slot`, `minLevel`, `maxLevel` | stats, damage, binding, sell price, disenchant, liveClient diffs |
| `fdb_spells` | `id` | `q` | rank, description, icon, liveClient diffs |
| `fdb_quests` | `id` | `q`, `zone`, `minLevel`, `maxLevel`, `side` | chain, questLine, starts/ends, location, source |
| `fdb_vendors` | `id` | `q`, `zone`, `seen` | stock with copper prices and costs |
| `fdb_dungeons` | `id` | - | bosses and notable loot |
| `fdb_classes` | `name` | - | abilities with ranks and learn levels |
| `fdb_itemsets` | `id` | `q` | pieces and set bonuses |
| `fdb_professions` | `slug` | `q`, `new`, `changed` (recipes) | ranks, trainers, recipe page |
| `fdb_gathering` | `slug` (required) | `zone` | nodes and beasts per zone, best zones |
| `fdb_battlegrounds` | - | - | levels, team size, objectives, rule sources |
| `fdb_changes` | - | `kind`, `verified` | changes players saw in game, newest first |
| `fdb_content` | `slug` | `kind` (`news`, `guide`, ... or `posts`) | article blocks and sources |
| `fdb_poisons` | - | - | poison quests, reagents, trainers, suppliers |
| `fdb_disenchant` | - | - | disenchant results by item level |

Gathering slugs: `herbalism`, `mining`, `skinning`, `fishing`. Profession slugs: `alchemy`,
`blacksmithing`, `enchanting`, `engineering`, `leatherworking`, `tailoring`, `herbalism`, `mining`,
`skinning`, `cooking`, `first-aid`, `fishing`.

## Attribution

The API terms require crediting ForeverDB.net with a visible link to https://foreverdb.net wherever
the data is shown. Every successful tool result starts with:

```text
Data from ForeverDB.net <https://foreverdb.net>
```

Keep that line visible in whatever you build on top. Keys used without credit are revoked.

## Behaviour

- Missing `FOREVERDB_API_KEY` fails the tool call with a message naming the variable; no request is
  sent and no key is ever logged.
- Upstream errors keep the API's own `code` and `message` (for example `rate_limit`); a 5xx is
  retried once and then reported as `upstream_unavailable`.
- Identical lookups inside 60 seconds are served from an in-memory cache, so a session cannot burn
  the key's budget repeating itself.
