// Tool surface snapshot taken from the Rust implementation at crate version 0.1.3.
// Descriptions are byte-for-byte copies, not paraphrases: clients and docs quote
// them, and `parity.test.ts` fails if any of them drifts.

export const SERVER_NAME = "foreverdb";

export const SERVER_INSTRUCTIONS =
  "ForeverDB: WoW Forever game data (items, spells, quests, vendors, professions, gathering, dungeons, classes, item sets, battlegrounds, poisons, disenchanting, changes seen in game, articles). Pass an id, name or slug to a domain tool for one record; omit it to search or list. Every answer carries meta with the game build. Cite ForeverDB.net with a link wherever you show this data.";

/** Attribution the ForeverDB API terms require on every data result. */
export const ATTRIBUTION = "Data from ForeverDB.net <https://foreverdb.net>";

export const TOOL_DESCRIPTIONS: Record<string, string> = {
  fdb_meta: "ForeverDB: the client build, level cap and how many of each thing there are.",
  fdb_items:
    "Items from the WoW Forever client, by id ascending. Filters: q (name contains), quality (0 Poor .. 5 Legendary), class (item class id), slot (inventory type id), minLevel, maxLevel, limit (1-100), offset, lang (es, es-MX, de, fr). Pass id for one item: stats, damage, binding, sell price, disenchant results, liveClient diffs and dataFromBuild.",
  fdb_spells:
    "Spells and abilities from the client, by id ascending. Filters: q (name contains), limit (1-100), offset, lang. Pass id for one spell: rank, description, icon and liveClient diffs.",
  fdb_quests:
    "Quests with ForeverDB's guide and where they start and end. Filters: q (name contains), zone, minLevel, maxLevel, side (alliance or horde), limit (1-100), offset. Pass id for one quest: chain (previous/next), questLine, starts and ends with NPC, object or item, map location and source.",
  fdb_vendors:
    "Vendors with where they stand and their reputation faction. Filters: q (name or title contains), zone, seen (true: only seen in Forever), limit (1-100), offset. Pass id for one vendor: everything they sell with copper prices and non-gold costs.",
  fdb_poisons:
    "Rogue poisons: how Rogues learn Poisons, every poison with reagents and skill colours, the trainers players saw teach it, and the trainers and poison suppliers with what they sell.",
  fdb_disenchant:
    "Disenchanting: what uncommon, rare and epic weapons and armour disenchant into by item level, for Forever (as seen by players) and Classic.",
  fdb_dungeons:
    "Dungeons and raids by lowest level first. Filters: limit (1-100), offset. Pass id for one dungeon: bosses and notable loot.",
  fdb_classes:
    "The nine classes. Pass name for one class: every ability with its ranks and the level each is learned. Optional lang.",
  fdb_itemsets:
    "Item sets with their pieces. Filters: q (name contains), limit (1-100), offset, lang. Pass id for one set: pieces and set bonuses.",
  fdb_professions:
    "All twelve professions with recipe counts. Pass slug (alchemy, blacksmithing, enchanting, engineering, leatherworking, tailoring, herbalism, mining, skinning, cooking, first-aid, fishing) for one profession: ranks and skill caps, trainers, and its recipe page with reagents, skill colours, learnedFrom sources, vendor prices and costs. Recipe filters: q, new (only new in Forever), changed (changed from Classic), limit (1-100), offset.",
  fdb_gathering:
    "Where to gather for herbalism, mining, skinning or fishing: required skill per node, nodes and beasts per zone, fishing pools, and the best zones per skill range. slug is required; zone narrows to one zone (map id or part of its name; skinning then lists the zone's beasts).",
  fdb_battlegrounds:
    "Every battleground and arena in the client: levels, team size, how you win, objectives with map coordinates, and where the rules come from (blizzard, classic or client). Filters: limit (1-100), offset.",
  fdb_changes:
    "Changes players' ForeverDB addons saw in game that differ from the game files: prices, quest rewards and XP, item stats, creature levels. Newest first, counts only. Filters: kind (item, npc, vendor, trainer, quest), verified (true: only Verified, false: only Not confirmed), limit (1-100), offset.",
  fdb_content:
    "ForeverDB's articles and Blizzard's blue posts, newest first. kind: an article type (news, guide ...) or the literal \"posts\" for Blizzard posts; filters limit (1-100), offset, lang. Pass slug for one article's blocks and sources.",
};

/** Property names each tool exposes, in schema order. */
export const TOOL_PARAMETERS: Record<string, string[]> = {
  fdb_meta: [],
  fdb_items: [
    "id",
    "q",
    "quality",
    "class",
    "slot",
    "minLevel",
    "maxLevel",
    "limit",
    "offset",
    "lang",
  ],
  fdb_spells: ["id", "q", "limit", "offset", "lang"],
  fdb_quests: ["id", "q", "zone", "minLevel", "maxLevel", "side", "limit", "offset"],
  fdb_vendors: ["id", "q", "zone", "seen", "limit", "offset"],
  fdb_poisons: [],
  fdb_disenchant: [],
  fdb_dungeons: ["id", "limit", "offset"],
  fdb_classes: ["name", "lang"],
  fdb_itemsets: ["id", "q", "limit", "offset", "lang"],
  fdb_professions: ["slug", "q", "new", "changed", "limit", "offset"],
  fdb_gathering: ["slug", "zone"],
  fdb_battlegrounds: ["limit", "offset"],
  fdb_changes: ["kind", "verified", "limit", "offset"],
  fdb_content: ["slug", "kind", "limit", "offset", "lang"],
};
