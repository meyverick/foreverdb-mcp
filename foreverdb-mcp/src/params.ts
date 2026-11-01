// Tool parameters and the upstream targets they map to.
//
// Wire quirks are deliberate: `seen` sends `true`/`false`, `verified` sends
// `1`/`0`, `new` stays `new`. "Cleaning them up" changes upstream behavior.

import { z } from "zod";

import { type Target, targetPath, withQuery } from "./target.ts";

const u32 = () => z.number().int().min(0).max(4_294_967_295);
const u8 = () => z.number().int().min(0).max(255);
const lang = () => z.string().describe("Game language: es, es-MX, de or fr.");
const limit = () => u32().describe("How many, 1 to 100 (default 25).");
const offset = () => u32().describe("Skip this many, for the next page.");

const text = (value?: boolean): string | undefined => flagOf(value, "true", "false");
const bit = (value?: boolean): string | undefined => flagOf(value, "1", "0");

function flagOf(value: boolean | undefined, yes: string, no: string): string | undefined {
  if (value === undefined) return undefined;
  return value ? yes : no;
}

export const itemsSchema = {
  id: u32().optional().describe("Item id: return one item instead of a list."),
  q: z.string().optional().describe("Name contains."),
  quality: u8().optional().describe("0 Poor to 5 Legendary."),
  class: u8().optional().describe("Item class id (2 weapons, 4 armour ...)."),
  slot: u8().optional().describe("Inventory type id (1 head, 5 chest ...)."),
  minLevel: u32().optional().describe("Required level at least."),
  maxLevel: u32().optional().describe("Required level at most."),
  limit: limit().optional(),
  offset: offset().optional(),
  lang: lang().optional(),
};

export const spellsSchema = {
  id: u32().optional().describe("Spell id: return one spell instead of a list."),
  q: z.string().optional().describe("Name contains."),
  limit: limit().optional(),
  offset: offset().optional(),
  lang: lang().optional(),
};

export const questsSchema = {
  id: u32().optional().describe("Quest id: return one quest instead of a list."),
  q: z.string().optional().describe("Name contains."),
  zone: z.string().optional().describe("Zone name contains."),
  minLevel: u32().optional().describe("Quest level at least."),
  maxLevel: u32().optional().describe("Quest level at most."),
  side: z.string().optional().describe("alliance or horde."),
  limit: limit().optional(),
  offset: offset().optional(),
};

export const vendorsSchema = {
  id: u32().optional().describe("Vendor id: return one vendor with its stock instead of a list."),
  q: z.string().optional().describe("Name or title contains."),
  zone: z.string().optional().describe("Zone name contains."),
  seen: z.boolean().optional().describe("true: only vendors seen in Forever."),
  limit: limit().optional(),
  offset: offset().optional(),
};

export const dungeonsSchema = {
  id: u32()
    .optional()
    .describe("Dungeon id: return one dungeon with bosses and loot instead of a list."),
  limit: limit().optional(),
  offset: offset().optional(),
};

export const classesSchema = {
  name: z
    .string()
    .optional()
    .describe("Class name: return one class with its abilities instead of the list."),
  lang: lang().optional(),
};

export const itemSetsSchema = {
  id: u32()
    .optional()
    .describe("Item set id: return one set with pieces and bonuses instead of a list."),
  q: z.string().optional().describe("Name contains."),
  limit: limit().optional(),
  offset: offset().optional(),
  lang: lang().optional(),
};

export const professionsSchema = {
  slug: z
    .string()
    .optional()
    .describe("Profession slug: return one profession with trainers and recipes."),
  q: z.string().optional().describe("Recipe name contains (detail only)."),
  new: z.boolean().optional().describe("true: only recipes new in Forever (detail only)."),
  changed: z
    .boolean()
    .optional()
    .describe("true: only recipes changed from Classic (detail only)."),
  limit: u32().optional().describe("How many recipes, 1 to 100 (detail only, default 25)."),
  offset: u32().optional().describe("Skip this many recipes, for the next page (detail only)."),
};

export const gatheringSchema = {
  slug: z.string().describe("herbalism, mining, skinning or fishing."),
  zone: z
    .string()
    .optional()
    .describe(
      "Only this zone: its map id, or part of its name (skinning also lists the zone's beasts).",
    ),
};

export const battlegroundsSchema = {
  limit: limit().optional(),
  offset: offset().optional(),
};

export const changesSchema = {
  kind: z.string().optional().describe("item, npc, vendor, trainer or quest."),
  verified: z
    .boolean()
    .optional()
    .describe("true: only Verified changes; false: only Not confirmed."),
  limit: limit().optional(),
  offset: offset().optional(),
};

export const contentSchema = {
  slug: z.string().optional().describe("Article slug: return one article's blocks and sources."),
  kind: z
    .string()
    .optional()
    .describe('Article type (news, guide ...) or the literal "posts" for Blizzard posts.'),
  limit: limit().optional(),
  offset: offset().optional(),
  lang: lang().optional(),
};

type Items = z.infer<z.ZodObject<typeof itemsSchema>>;
type Spells = z.infer<z.ZodObject<typeof spellsSchema>>;
type Quests = z.infer<z.ZodObject<typeof questsSchema>>;
type Vendors = z.infer<z.ZodObject<typeof vendorsSchema>>;
type Dungeons = z.infer<z.ZodObject<typeof dungeonsSchema>>;
type Classes = z.infer<z.ZodObject<typeof classesSchema>>;
type ItemSets = z.infer<z.ZodObject<typeof itemSetsSchema>>;
type Professions = z.infer<z.ZodObject<typeof professionsSchema>>;
type Gathering = z.infer<z.ZodObject<typeof gatheringSchema>>;
type Battlegrounds = z.infer<z.ZodObject<typeof battlegroundsSchema>>;
type Changes = z.infer<z.ZodObject<typeof changesSchema>>;
type Content = z.infer<z.ZodObject<typeof contentSchema>>;

export function itemsTarget(p: Items): Target {
  if (p.id !== undefined) {
    return withQuery(targetPath("items", String(p.id)), "lang", p.lang);
  }
  let target = targetPath("items");
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "quality", p.quality);
  target = withQuery(target, "class", p.class);
  target = withQuery(target, "slot", p.slot);
  target = withQuery(target, "minLevel", p.minLevel);
  target = withQuery(target, "maxLevel", p.maxLevel);
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function spellsTarget(p: Spells): Target {
  if (p.id !== undefined) {
    return withQuery(targetPath("spells", String(p.id)), "lang", p.lang);
  }
  let target = targetPath("spells");
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function questsTarget(p: Quests): Target {
  // The detail branch never forwards lang, matching the Rust builder.
  if (p.id !== undefined) return targetPath("quests", String(p.id));
  let target = targetPath("quests");
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "zone", p.zone);
  target = withQuery(target, "minLevel", p.minLevel);
  target = withQuery(target, "maxLevel", p.maxLevel);
  target = withQuery(target, "side", p.side);
  target = withQuery(target, "limit", p.limit);
  return withQuery(target, "offset", p.offset);
}

export function vendorsTarget(p: Vendors): Target {
  if (p.id !== undefined) return targetPath("vendors", String(p.id));
  let target = targetPath("vendors");
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "zone", p.zone);
  target = withQuery(target, "seen", text(p.seen));
  target = withQuery(target, "limit", p.limit);
  return withQuery(target, "offset", p.offset);
}

export function dungeonsTarget(p: Dungeons): Target {
  if (p.id !== undefined) return targetPath("dungeons", String(p.id));
  return withQuery(withQuery(targetPath("dungeons"), "limit", p.limit), "offset", p.offset);
}

export function classesTarget(p: Classes): Target {
  const base = p.name === undefined ? targetPath("classes") : targetPath("classes", p.name);
  return withQuery(base, "lang", p.lang);
}

export function itemSetsTarget(p: ItemSets): Target {
  if (p.id !== undefined) {
    return withQuery(targetPath("itemsets", String(p.id)), "lang", p.lang);
  }
  let target = targetPath("itemsets");
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function professionsTarget(p: Professions): Target {
  // List mode drops every filter, matching the Rust builder.
  if (p.slug === undefined) return targetPath("professions");
  let target = targetPath("professions", p.slug);
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "new", text(p.new));
  target = withQuery(target, "changed", text(p.changed));
  target = withQuery(target, "limit", p.limit);
  return withQuery(target, "offset", p.offset);
}

export function gatheringTarget(p: Gathering): Target {
  return withQuery(targetPath("gathering", p.slug), "zone", p.zone);
}

export function battlegroundsTarget(p: Battlegrounds): Target {
  return withQuery(withQuery(targetPath("battlegrounds"), "limit", p.limit), "offset", p.offset);
}

export function changesTarget(p: Changes): Target {
  let target = targetPath("changes-seen");
  target = withQuery(target, "kind", p.kind);
  target = withQuery(target, "verified", bit(p.verified));
  target = withQuery(target, "limit", p.limit);
  return withQuery(target, "offset", p.offset);
}

export function contentTarget(p: Content): Target {
  if (p.slug !== undefined) {
    return withQuery(targetPath("articles", p.slug), "lang", p.lang);
  }
  if (p.kind === "posts") {
    return withQuery(withQuery(targetPath("posts"), "limit", p.limit), "offset", p.offset);
  }
  let target = targetPath("articles");
  target = withQuery(target, "type", p.kind);
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}
