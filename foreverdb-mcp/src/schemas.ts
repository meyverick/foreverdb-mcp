// Zod input schemas for the twenty game-data MCP tools.
// Closed API enums and numeric bounds are validated locally before hitting the API.

import { z } from "zod";

const u32 = () => z.number().int().min(0).max(4_294_967_295);
const u8 = () => z.number().int().min(0).max(255);
const lang = () => z.string().describe("Game language: en, es, es-MX, de or fr.");
const limit = () => z.number().int().min(1).max(100).describe("How many, 1 to 100 (default 25).");
const offset = () => u32().describe("Skip this many, for the next page.");

export const itemsSchema = {
  id: u32().optional().describe("Item id: return one item instead of a list."),
  q: z.string().optional().describe("Name contains."),
  quality: z.number().int().min(0).max(5).optional().describe("0 Poor to 5 Legendary."),
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
  lang: lang().optional(),
};

export const vendorsSchema = {
  id: u32().optional().describe("Vendor id: return one vendor with its stock instead of a list."),
  q: z.string().optional().describe("Name or title contains."),
  zone: z.string().optional().describe("Zone name contains."),
  seen: z.boolean().optional().describe("true: only vendors seen in Forever."),
  limit: limit().optional(),
  offset: offset().optional(),
  lang: lang().optional(),
};

export const poisonsSchema = {
  lang: lang().optional(),
};

export const disenchantSchema = {
  lang: lang().optional(),
};

export const dungeonsSchema = {
  id: u32()
    .optional()
    .describe("Dungeon id: return one dungeon with bosses and loot instead of a list."),
  limit: limit().optional(),
  offset: offset().optional(),
  lang: lang().optional(),
};

export const zonesSchema = {
  limit: limit().optional(),
  offset: offset().optional(),
  lang: lang().optional(),
};

export const classesSchema = {
  name: z
    .string()
    .optional()
    .describe("Class name: return one class with abilities and talent trees instead of the list."),
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
  limit: limit().optional().describe("How many recipes, 1 to 100 (detail only, default 25)."),
  offset: offset().optional().describe("Skip this many recipes, for the next page (detail only)."),
  lang: lang().optional(),
};

export const gatheringSchema = {
  slug: z.string().describe("herbalism, mining, skinning or fishing."),
  zone: z
    .string()
    .optional()
    .describe(
      "Only this zone: its map id, or part of its name (skinning also lists the zone's beasts).",
    ),
  lang: lang().optional(),
};

export const battlegroundsSchema = {
  lang: lang().optional(),
};

export const changesSchema = {
  kind: z.string().optional().describe("item, npc, vendor, trainer or quest."),
  verified: z
    .boolean()
    .optional()
    .describe("true: only Verified changes; false: only Not confirmed."),
  limit: limit().optional(),
  offset: offset().optional(),
  lang: lang().optional(),
};

export const buildsSchema = {
  build: z
    .string()
    .optional()
    .describe('Build version or "latest": return one build\'s changes instead of the build list.'),
  type: z
    .enum(["ability", "talent", "spell", "item", "set"])
    .optional()
    .describe("Filter build changes by type (detail only)."),
  class: z.string().optional().describe("Class id or name (detail only, e.g. warrior)."),
  change: z
    .enum(["added", "removed", "changed"])
    .optional()
    .describe("Filter by change kind (detail only)."),
  q: z.string().optional().describe("Name contains (detail only)."),
  limit: limit().optional(),
  offset: offset().optional(),
  lang: lang().optional(),
};

export const buffsNerfsSchema = {
  class: z.string().optional().describe("Class id or name (e.g. warrior)."),
  build: z.string().optional().describe("One build version (e.g. 1.60.1.70790)."),
  direction: z
    .enum(["buff", "nerf", "changed", "new", "removed"])
    .optional()
    .describe("Filter by change direction."),
  limit: limit().optional(),
  offset: offset().optional(),
  lang: lang().optional(),
};

export const merchantsFavorSchema = {
  lang: lang().optional(),
};

export const bisSchema = {
  spec: z
    .string()
    .optional()
    .describe("Spec id from /api/v1/bis (e.g. hunter-beast-mastery): return BiS for that spec."),
  mode: z.enum(["pve", "pvp"]).optional().describe("pve (default) or pvp (detail only)."),
  level: z
    .number()
    .int()
    .min(1)
    .max(60)
    .optional()
    .describe("1 to 60, default level cap (detail only)."),
  easy: z
    .boolean()
    .optional()
    .describe("true: hide hard-to-get items and put hard enchants last (detail only)."),
  side: z.enum(["a", "h"]).optional().describe("a (Alliance) or h (Horde) items (detail only)."),
  lang: lang().optional(),
};

export const endgameSchema = {
  lang: lang().optional(),
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
