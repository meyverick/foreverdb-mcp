// Tool descriptions for the twenty-two read-only ForeverDB MCP tools.
// `parity.test.ts` and `tools.test.ts` assert that `test/fixtures/tool-surface.ts` stays in sync.

export const TOOL_DESCRIPTIONS = {
  fdb_meta: "ForeverDB: the client build, level cap and how many of each thing there are.",
  fdb_items:
    "Items from the WoW Forever client, by id ascending (includes betaEvent and speculation/speculationReasons availability warnings). Filters: q (name contains), quality (0 Poor .. 5 Legendary), class (item class id), slot (inventory type id), minLevel, maxLevel, limit (1-100), offset, lang (en, es, es-MX, de, fr). Pass id for one item: stats, damage, speed, binding, sell price, effects, disenchant results, liveClient diffs and dataFromBuild.",
  fdb_spells:
    "Spells and abilities from the client, by id ascending. Filters: q (name contains), limit (1-100), offset, lang. Pass id for one spell: rank, description, icon, school, cast time, range, cooldown, required level, base costs and liveClient diffs.",
  fdb_quests:
    "Quests with ForeverDB's guide and where they start and end. Filters: q (name contains), zone, minLevel, maxLevel, side (alliance or horde), limit (1-100), offset, lang. Pass id for one quest: chain (previous/next, where Offered after is observed offer order), questLine, starts and ends with NPC, object or item, map location and source.",
  fdb_vendors:
    "Vendors with where they stand and their reputation faction. Filters: q (name or title contains), zone, seen (true: only seen in Forever), limit (1-100), offset, lang. Pass id for one vendor: everything they sell with copper prices, non-gold costs, stockLists and notEveryoneSees.",
  fdb_poisons:
    "Rogue poisons: how Rogues learn Poisons, every poison with reagents, skill colours and trainerCost, the trainers players saw teach it, and the trainers and poison suppliers with what they sell and unusedReagents. Optional lang.",
  fdb_disenchant:
    "Disenchanting: what uncommon, rare and epic weapons and armour disenchant into by item level, for Forever (as seen by players) and Classic. Optional lang.",
  fdb_dungeons:
    "Dungeons and raids by lowest level first. Filters: limit (1-100), offset, lang. Pass id for one dungeon: bosses and notable loot.",
  fdb_zones:
    "World map zones and continents with their UiMap id (used by quests, vendors and gathering). Filters: limit (1-100), offset, lang.",
  fdb_classes:
    "The nine classes. Pass name for one class: every ability with its ranks and learned levels, plus all talent trees (1-based tier/column, required level, rank spell ids, descriptions, prerequisites). Optional lang.",
  fdb_itemsets:
    "Item sets with their pieces, betaEvent and speculation/speculationReasons warnings. Filters: q (name contains), limit (1-100), offset, lang. Pass id for one set: pieces and set bonuses.",
  fdb_professions:
    "All twelve professions with recipe counts. Pass slug (alchemy, blacksmithing, enchanting, engineering, leatherworking, tailoring, herbalism, mining, skinning, cooking, first-aid, fishing) for one profession: ranks, skill caps, trainers, and recipes with reagents, skill colours (orangeSource/orangeClassic), crafted count/min/max, learnedFrom sources, vendor prices and costs. Recipe filters: q, new (only new in Forever), changed (changed from Classic), limit (1-100), offset, lang.",
  fdb_gathering:
    "Where to gather for herbalism, mining, skinning or fishing: required skill per node, nodes and beasts per zone, fishing pools, and the best zones per skill range. slug is required; zone narrows to one zone (map id or part of its name; skinning then lists the zone's beasts). Optional lang.",
  fdb_battlegrounds:
    "Every battleground and arena in the client: levels, team size, how you win, objectives with map coordinates, and where the rules come from (blizzard, classic or client). Optional lang.",
  fdb_changes:
    "Changes players' ForeverDB addons saw in game that differ from the game files: prices, quest rewards and XP, item stats, creature levels. Newest first, counts only. Filters: kind (item, npc, vendor, trainer, quest), verified (true: only Verified, false: only Not confirmed), limit (1-100), offset, lang.",
  fdb_builds:
    "WoW Forever client builds compared, newest first: date, previous build, counts, totals, article and changelog link. Filters: limit (1-100), offset, lang. Pass build (e.g. latest or 1.60.1.70790) for one build's diff, filtered by type (ability, talent, spell, item, set), class, change (added, removed, changed) and q.",
  fdb_buffs_nerfs:
    "Every class change across builds, newest first, with direction (buff, nerf, changed, new, removed), dataOnly flag and readable changes. Filters: class (id or name), build, direction, limit (1-100), offset, lang.",
  fdb_merchants_favor:
    "Merchant's Favor currency: Waylaid Crates, sealed crates, the Legacy perk, and Azeroth Commerce Authority / Durotar Supply and Logistics vendor rewards as seen by players. Optional lang.",
  fdb_bis:
    "Best in slot specs list. Pass spec (e.g. hunter-beast-mastery) for one spec's BiS picks and top alternatives per slot, plus ranked enchants, armor kits and arcanums. Detail filters: mode (pve or pvp), level (1-60), easy (true: hide hard-to-get), side (a or h), lang.",
  fdb_endgame:
    "Endgame confirmation progress (level 40-60 quests, level 45+ dungeons and raids, confirmed drops, logged boss fights and raid release status). Optional lang.",
  fdb_content:
    "ForeverDB's articles and Blizzard's blue posts, newest first. kind: an article type (news, guide ...) or the literal \"posts\" for Blizzard posts; filters limit (1-100), offset, lang. Pass slug for one article's blocks and sources.",
  fdb_credit:
    "Check ForeverDB attribution requirements and whether the active API key is on the free tier.",
} as const;
