// Target builders mapping validated tool arguments to upstream API paths and queries.
//
// Wire quirks are deliberate: `seen` sends `true`/`false`, `verified` sends
// `1`/`0`, `easy` sends `1` only when true, `new` stays `new`.

import type { z } from "zod";

import type {
  battlegroundsSchema,
  bisSchema,
  buffsNerfsSchema,
  buildsSchema,
  changesSchema,
  classesSchema,
  contentSchema,
  disenchantSchema,
  dungeonsSchema,
  endgameSchema,
  gatheringSchema,
  itemSetsSchema,
  itemsSchema,
  merchantsFavorSchema,
  poisonsSchema,
  professionsSchema,
  questsSchema,
  spellsSchema,
  vendorsSchema,
  zonesSchema,
} from "./schemas.ts";
import { type Target, targetPath, withQuery } from "./target.ts";

export * from "./schemas.ts";

const text = (value?: boolean): string | undefined => flagOf(value, "true", "false");
const bit = (value?: boolean): string | undefined => flagOf(value, "1", "0");
const oneOnly = (value?: boolean): string | undefined => (value === true ? "1" : undefined);

function flagOf(value: boolean | undefined, yes: string, no: string): string | undefined {
  if (value === undefined) return undefined;
  return value ? yes : no;
}

type Infer<T extends z.ZodRawShape> = z.infer<z.ZodObject<T>>;

export function itemsTarget(p: Infer<typeof itemsSchema>): Target {
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

export function spellsTarget(p: Infer<typeof spellsSchema>): Target {
  if (p.id !== undefined) {
    return withQuery(targetPath("spells", String(p.id)), "lang", p.lang);
  }
  let target = targetPath("spells");
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function questsTarget(p: Infer<typeof questsSchema>): Target {
  if (p.id !== undefined) {
    return withQuery(targetPath("quests", String(p.id)), "lang", p.lang);
  }
  let target = targetPath("quests");
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "zone", p.zone);
  target = withQuery(target, "minLevel", p.minLevel);
  target = withQuery(target, "maxLevel", p.maxLevel);
  target = withQuery(target, "side", p.side);
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function vendorsTarget(p: Infer<typeof vendorsSchema>): Target {
  if (p.id !== undefined) {
    return withQuery(targetPath("vendors", String(p.id)), "lang", p.lang);
  }
  let target = targetPath("vendors");
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "zone", p.zone);
  target = withQuery(target, "seen", text(p.seen));
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function poisonsTarget(p: Infer<typeof poisonsSchema>): Target {
  return withQuery(targetPath("poisons"), "lang", p.lang);
}

export function disenchantTarget(p: Infer<typeof disenchantSchema>): Target {
  return withQuery(targetPath("disenchant"), "lang", p.lang);
}

export function dungeonsTarget(p: Infer<typeof dungeonsSchema>): Target {
  if (p.id !== undefined) {
    return withQuery(targetPath("dungeons", String(p.id)), "lang", p.lang);
  }
  let target = targetPath("dungeons");
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function zonesTarget(p: Infer<typeof zonesSchema>): Target {
  let target = targetPath("zones");
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function classesTarget(p: Infer<typeof classesSchema>): Target {
  const base = p.name === undefined ? targetPath("classes") : targetPath("classes", p.name);
  return withQuery(base, "lang", p.lang);
}

export function itemSetsTarget(p: Infer<typeof itemSetsSchema>): Target {
  if (p.id !== undefined) {
    return withQuery(targetPath("itemsets", String(p.id)), "lang", p.lang);
  }
  let target = targetPath("itemsets");
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function professionsTarget(p: Infer<typeof professionsSchema>): Target {
  if (p.slug === undefined) {
    return withQuery(targetPath("professions"), "lang", p.lang);
  }
  let target = targetPath("professions", p.slug);
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "new", text(p.new));
  target = withQuery(target, "changed", text(p.changed));
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function gatheringTarget(p: Infer<typeof gatheringSchema>): Target {
  let target = targetPath("gathering", p.slug);
  target = withQuery(target, "zone", p.zone);
  return withQuery(target, "lang", p.lang);
}

export function battlegroundsTarget(p: Infer<typeof battlegroundsSchema>): Target {
  return withQuery(targetPath("battlegrounds"), "lang", p.lang);
}

export function changesTarget(p: Infer<typeof changesSchema>): Target {
  let target = targetPath("changes-seen");
  target = withQuery(target, "kind", p.kind);
  target = withQuery(target, "verified", bit(p.verified));
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function buildsTarget(p: Infer<typeof buildsSchema>): Target {
  if (p.build === undefined) {
    let target = targetPath("builds");
    target = withQuery(target, "limit", p.limit);
    target = withQuery(target, "offset", p.offset);
    return withQuery(target, "lang", p.lang);
  }
  let target = targetPath("builds", p.build);
  target = withQuery(target, "type", p.type);
  target = withQuery(target, "class", p.class);
  target = withQuery(target, "change", p.change);
  target = withQuery(target, "q", p.q);
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function buffsNerfsTarget(p: Infer<typeof buffsNerfsSchema>): Target {
  let target = targetPath("buffs-nerfs");
  target = withQuery(target, "class", p.class);
  target = withQuery(target, "build", p.build);
  target = withQuery(target, "direction", p.direction);
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}

export function merchantsFavorTarget(p: Infer<typeof merchantsFavorSchema>): Target {
  return withQuery(targetPath("merchants-favor"), "lang", p.lang);
}

export function bisTarget(p: Infer<typeof bisSchema>): Target {
  if (p.spec === undefined) {
    return withQuery(targetPath("bis"), "lang", p.lang);
  }
  let target = targetPath("bis", p.spec);
  target = withQuery(target, "mode", p.mode);
  target = withQuery(target, "level", p.level);
  target = withQuery(target, "easy", oneOnly(p.easy));
  target = withQuery(target, "side", p.side);
  return withQuery(target, "lang", p.lang);
}

export function endgameTarget(p: Infer<typeof endgameSchema>): Target {
  return withQuery(targetPath("endgame"), "lang", p.lang);
}

export function contentTarget(p: Infer<typeof contentSchema>): Target {
  if (p.slug !== undefined) {
    return withQuery(targetPath("articles", p.slug), "lang", p.lang);
  }
  if (p.kind === "posts") {
    let target = targetPath("posts");
    target = withQuery(target, "limit", p.limit);
    target = withQuery(target, "offset", p.offset);
    return withQuery(target, "lang", p.lang);
  }
  let target = targetPath("articles");
  target = withQuery(target, "type", p.kind);
  target = withQuery(target, "limit", p.limit);
  target = withQuery(target, "offset", p.offset);
  return withQuery(target, "lang", p.lang);
}
