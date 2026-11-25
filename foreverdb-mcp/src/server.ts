// MCP tool surface: twenty-two read-only tools over one upstream client.
// API-backed tools return verbatim upstream JSON; `fdb_credit` reports the
// credit policy and the active key's free-tier status.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { TOOL_DESCRIPTIONS } from "./descriptions.ts";
import { codeOf, messageOf, statusOf, type UpstreamFailure } from "./errors.ts";
import {
  battlegroundsSchema,
  battlegroundsTarget,
  bisSchema,
  bisTarget,
  buffsNerfsSchema,
  buffsNerfsTarget,
  buildsSchema,
  buildsTarget,
  changesSchema,
  changesTarget,
  classesSchema,
  classesTarget,
  contentSchema,
  contentTarget,
  disenchantSchema,
  disenchantTarget,
  dungeonsSchema,
  dungeonsTarget,
  endgameSchema,
  endgameTarget,
  gatheringSchema,
  gatheringTarget,
  itemSetsSchema,
  itemSetsTarget,
  itemsSchema,
  itemsTarget,
  merchantsFavorSchema,
  merchantsFavorTarget,
  poisonsSchema,
  poisonsTarget,
  professionsSchema,
  professionsTarget,
  questsSchema,
  questsTarget,
  spellsSchema,
  spellsTarget,
  vendorsSchema,
  vendorsTarget,
  zonesSchema,
  zonesTarget,
} from "./params.ts";
import { cacheKeyOf, type Target, targetPath } from "./target.ts";
import { isFreeTier, missingKey, type Upstream } from "./upstream.ts";
import { VERSION } from "./version.ts";

export const SERVER_NAME = "foreverdb";
export const SERVER_INSTRUCTIONS =
  "ForeverDB: WoW Forever game data (items, spells, quests, vendors, professions, gathering, dungeons, zones, classes, item sets, battlegrounds, poisons, disenchanting, changes seen in game, builds, buffs/nerfs, Merchant's Favor, best in slot, endgame, articles/posts). Pass an id, name, slug, build or spec to a domain tool for one record; omit it to search or list. Every answer is verbatim JSON carrying meta with the game build, attribution and attributionRequired; call fdb_credit to check free-tier credit status.";

export const CREDIT_NOTICE =
  "On the free tier, you must credit ForeverDB.net as the source, with a visible link to https://foreverdb.net, wherever you show the data.";

export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

/** One line per tool call, on stderr: stdout belongs to the protocol. */
export type WideEvent = {
  tool: string;
  route: string;
  status: string;
  duration_ms: number;
  cached: boolean;
  upstream_status: string;
};

export type Logger = (event: WideEvent) => void;

export interface ToolDef {
  name: keyof typeof TOOL_DESCRIPTIONS;
  /** No schema means the tool takes no arguments. */
  schema?: z.ZodRawShape;
  build?: (args: Record<string, unknown>) => Target;
}

const parser = <T extends z.ZodRawShape>(schema: T) => z.object(schema);
const items = parser(itemsSchema);
const spells = parser(spellsSchema);
const quests = parser(questsSchema);
const vendors = parser(vendorsSchema);
const poisons = parser(poisonsSchema);
const disenchant = parser(disenchantSchema);
const dungeons = parser(dungeonsSchema);
const zones = parser(zonesSchema);
const classes = parser(classesSchema);
const itemSets = parser(itemSetsSchema);
const professions = parser(professionsSchema);
const gathering = parser(gatheringSchema);
const battlegrounds = parser(battlegroundsSchema);
const changes = parser(changesSchema);
const builds = parser(buildsSchema);
const buffsNerfs = parser(buffsNerfsSchema);
const merchantsFavor = parser(merchantsFavorSchema);
const bis = parser(bisSchema);
const endgame = parser(endgameSchema);
const content = parser(contentSchema);

export const TOOLS: ToolDef[] = [
  { name: "fdb_meta", build: () => targetPath("meta") },
  { name: "fdb_items", schema: itemsSchema, build: (a) => itemsTarget(items.parse(a)) },
  { name: "fdb_spells", schema: spellsSchema, build: (a) => spellsTarget(spells.parse(a)) },
  { name: "fdb_quests", schema: questsSchema, build: (a) => questsTarget(quests.parse(a)) },
  { name: "fdb_vendors", schema: vendorsSchema, build: (a) => vendorsTarget(vendors.parse(a)) },
  { name: "fdb_poisons", schema: poisonsSchema, build: (a) => poisonsTarget(poisons.parse(a)) },
  {
    name: "fdb_disenchant",
    schema: disenchantSchema,
    build: (a) => disenchantTarget(disenchant.parse(a)),
  },
  { name: "fdb_dungeons", schema: dungeonsSchema, build: (a) => dungeonsTarget(dungeons.parse(a)) },
  { name: "fdb_zones", schema: zonesSchema, build: (a) => zonesTarget(zones.parse(a)) },
  { name: "fdb_classes", schema: classesSchema, build: (a) => classesTarget(classes.parse(a)) },
  { name: "fdb_itemsets", schema: itemSetsSchema, build: (a) => itemSetsTarget(itemSets.parse(a)) },
  {
    name: "fdb_professions",
    schema: professionsSchema,
    build: (a) => professionsTarget(professions.parse(a)),
  },
  {
    name: "fdb_gathering",
    schema: gatheringSchema,
    build: (a) => gatheringTarget(gathering.parse(a)),
  },
  {
    name: "fdb_battlegrounds",
    schema: battlegroundsSchema,
    build: (a) => battlegroundsTarget(battlegrounds.parse(a)),
  },
  { name: "fdb_changes", schema: changesSchema, build: (a) => changesTarget(changes.parse(a)) },
  { name: "fdb_builds", schema: buildsSchema, build: (a) => buildsTarget(builds.parse(a)) },
  {
    name: "fdb_buffs_nerfs",
    schema: buffsNerfsSchema,
    build: (a) => buffsNerfsTarget(buffsNerfs.parse(a)),
  },
  {
    name: "fdb_merchants_favor",
    schema: merchantsFavorSchema,
    build: (a) => merchantsFavorTarget(merchantsFavor.parse(a)),
  },
  { name: "fdb_bis", schema: bisSchema, build: (a) => bisTarget(bis.parse(a)) },
  { name: "fdb_endgame", schema: endgameSchema, build: (a) => endgameTarget(endgame.parse(a)) },
  { name: "fdb_content", schema: contentSchema, build: (a) => contentTarget(content.parse(a)) },
  { name: "fdb_credit" },
];

const stderrLogger: Logger = (event) => {
  console.error(JSON.stringify(event));
};

/** Builds the MCP server: registration only, no transport. */
export function createServer(upstream: Upstream, log: Logger = stderrLogger): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );
  for (const tool of TOOLS) {
    const description = TOOL_DESCRIPTIONS[tool.name];
    const handler = (args: Record<string, unknown>) => run(tool, args, upstream, log);
    if (tool.schema === undefined) {
      server.registerTool(tool.name, { description, annotations: READ_ONLY_ANNOTATIONS }, handler);
    } else {
      server.registerTool(
        tool.name,
        { description, inputSchema: tool.schema, annotations: READ_ONLY_ANNOTATIONS },
        handler,
      );
    }
  }
  return server;
}

export type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

/** One tool call: fetch (or inspect credit tier), emit the wide event, wrap the result. */
export async function run(
  tool: ToolDef,
  args: Record<string, unknown>,
  upstream: Upstream,
  log: Logger = stderrLogger,
): Promise<ToolResult> {
  if (tool.build === undefined) {
    return runCredit(upstream, log);
  }
  const target = tool.build(args);
  const route = cacheKeyOf(target);
  const started = performance.now();
  let fetched: Awaited<ReturnType<Upstream["get"]>> | undefined;
  let failure: UpstreamFailure | undefined;
  try {
    fetched = await upstream.get(target);
  } catch (error) {
    failure = isFailure(error) ? error : { kind: "network", detail: String(error) };
  }

  const status = failure === undefined ? "ok" : codeOf(failure);
  const upstreamStatus = failure === undefined ? fetched?.upstreamStatus : statusOf(failure);
  log({
    tool: tool.name,
    route,
    status,
    duration_ms: Math.round(performance.now() - started),
    cached: fetched?.cached ?? false,
    upstream_status: upstreamStatus === undefined ? "none" : String(upstreamStatus),
  });

  if (failure !== undefined) return errorResult(failure);
  return dataResult(fetched?.body ?? "");
}

async function runCredit(upstream: Upstream, log: Logger): Promise<ToolResult> {
  const started = performance.now();
  let fetched: Awaited<ReturnType<Upstream["get"]>> | undefined;
  let failure: UpstreamFailure | undefined;

  if (!upstream.hasKey()) {
    failure = missingKey();
  } else if (
    upstream.tier()?.attributionRequired === undefined &&
    upstream.tier()?.plan === undefined
  ) {
    try {
      fetched = await upstream.get(targetPath("meta"));
    } catch (error) {
      failure = isFailure(error) ? error : { kind: "network", detail: String(error) };
    }
  }

  const status = failure === undefined ? "ok" : codeOf(failure);
  const upstreamStatus = failure === undefined ? fetched?.upstreamStatus : statusOf(failure);
  log({
    tool: "fdb_credit",
    route: "credit",
    status,
    duration_ms: Math.round(performance.now() - started),
    cached: fetched === undefined ? failure === undefined : fetched.cached,
    upstream_status: upstreamStatus === undefined ? "none" : String(upstreamStatus),
  });

  if (failure !== undefined) return errorResult(failure);
  const tierSentence = isFreeTier(upstream.tier())
    ? "You're on free tier."
    : "You're not on free tier.";
  return dataResult(`${CREDIT_NOTICE} ${tierSentence}`);
}

export function dataResult(body: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: body }] };
}

export function errorResult(failure: UpstreamFailure): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const payload = { error: { code: codeOf(failure), message: messageOf(failure) } };
  return { content: [{ type: "text", text: JSON.stringify(payload) }], isError: true };
}

function isFailure(value: unknown): value is UpstreamFailure {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === "missing_key" ||
    kind === "timeout" ||
    kind === "network" ||
    kind === "response" ||
    kind === "api"
  );
}
