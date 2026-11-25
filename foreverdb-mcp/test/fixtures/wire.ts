// Wire contract snapshot for all 21 API-backed tools against https://api.foreverdb.net/api/v1.
// One expected absolute URL per tool and per parameter branch.

export interface UrlCase {
  /** Tool name whose arguments produce `url`. */
  tool: string;
  /** Which branch of the tool this case exercises. */
  branch: string;
  /** Arguments exactly as an MCP client would send them. */
  args: Record<string, unknown>;
  /** Absolute URL the target builder produces for those arguments. */
  url: string;
}

export const BASE_URL = "https://api.foreverdb.net/api/v1";

const BASE = BASE_URL;

export const URL_CASES: UrlCase[] = [
  { tool: "fdb_meta", branch: "only", args: {}, url: `${BASE}/meta` },
  { tool: "fdb_items", branch: "detail", args: { id: 19019 }, url: `${BASE}/items/19019` },
  {
    tool: "fdb_items",
    branch: "detail+lang",
    args: { id: 19019, lang: "es" },
    url: `${BASE}/items/19019?lang=es`,
  },
  {
    tool: "fdb_items",
    branch: "list+all-filters",
    args: {
      q: "thunderfury",
      quality: 5,
      class: 2,
      slot: 1,
      minLevel: 60,
      maxLevel: 60,
      limit: 50,
      offset: 50,
      lang: "de",
    },
    url: `${BASE}/items?q=thunderfury&quality=5&class=2&slot=1&minLevel=60&maxLevel=60&limit=50&offset=50&lang=de`,
  },
  {
    tool: "fdb_spells",
    branch: "detail+lang",
    args: { id: 133, lang: "fr" },
    url: `${BASE}/spells/133?lang=fr`,
  },
  {
    tool: "fdb_spells",
    branch: "list",
    args: { q: "fire", limit: 5, offset: 10, lang: "es-MX" },
    url: `${BASE}/spells?q=fire&limit=5&offset=10&lang=es-MX`,
  },
  {
    tool: "fdb_quests",
    branch: "detail+lang",
    args: { id: 1, lang: "es" },
    url: `${BASE}/quests/1?lang=es`,
  },
  {
    tool: "fdb_quests",
    branch: "list",
    args: {
      q: "tough",
      zone: "elwynn",
      minLevel: 1,
      maxLevel: 10,
      side: "alliance",
      limit: 50,
      offset: 50,
      lang: "fr",
    },
    url: `${BASE}/quests?q=tough&zone=elwynn&minLevel=1&maxLevel=10&side=alliance&limit=50&offset=50&lang=fr`,
  },
  {
    tool: "fdb_vendors",
    branch: "detail+lang",
    args: { id: 7, lang: "de" },
    url: `${BASE}/vendors/7?lang=de`,
  },
  {
    tool: "fdb_vendors",
    branch: "list+seen-true",
    args: { q: "smith", zone: "stormwind", seen: true, limit: 10, offset: 0 },
    url: `${BASE}/vendors?q=smith&zone=stormwind&seen=true&limit=10&offset=0`,
  },
  {
    tool: "fdb_vendors",
    branch: "list+seen-false",
    args: { seen: false },
    url: `${BASE}/vendors?seen=false`,
  },
  { tool: "fdb_poisons", branch: "default", args: {}, url: `${BASE}/poisons` },
  { tool: "fdb_poisons", branch: "lang", args: { lang: "es" }, url: `${BASE}/poisons?lang=es` },
  { tool: "fdb_disenchant", branch: "default", args: {}, url: `${BASE}/disenchant` },
  {
    tool: "fdb_disenchant",
    branch: "lang",
    args: { lang: "de" },
    url: `${BASE}/disenchant?lang=de`,
  },
  {
    tool: "fdb_dungeons",
    branch: "list",
    args: { limit: 5, offset: 5, lang: "fr" },
    url: `${BASE}/dungeons?limit=5&offset=5&lang=fr`,
  },
  {
    tool: "fdb_dungeons",
    branch: "detail",
    args: { id: 3, lang: "es" },
    url: `${BASE}/dungeons/3?lang=es`,
  },
  {
    tool: "fdb_zones",
    branch: "list",
    args: { limit: 10, offset: 20, lang: "de" },
    url: `${BASE}/zones?limit=10&offset=20&lang=de`,
  },
  {
    tool: "fdb_classes",
    branch: "list+lang",
    args: { lang: "es" },
    url: `${BASE}/classes?lang=es`,
  },
  {
    tool: "fdb_classes",
    branch: "detail-by-name",
    args: { name: "warrior", lang: "de" },
    url: `${BASE}/classes/warrior?lang=de`,
  },
  {
    tool: "fdb_itemsets",
    branch: "detail+lang",
    args: { id: 221, lang: "fr" },
    url: `${BASE}/itemsets/221?lang=fr`,
  },
  {
    tool: "fdb_itemsets",
    branch: "list",
    args: { q: "tier", limit: 5, offset: 0, lang: "de" },
    url: `${BASE}/itemsets?q=tier&limit=5&offset=0&lang=de`,
  },
  {
    tool: "fdb_professions",
    branch: "list-drops-filters-keeps-lang",
    args: { q: "swift", new: true, lang: "es" },
    url: `${BASE}/professions?lang=es`,
  },
  {
    tool: "fdb_professions",
    branch: "detail",
    args: {
      slug: "alchemy",
      q: "swift",
      new: true,
      changed: false,
      limit: 10,
      offset: 5,
      lang: "de",
    },
    url: `${BASE}/professions/alchemy?q=swift&new=true&changed=false&limit=10&offset=5&lang=de`,
  },
  {
    tool: "fdb_gathering",
    branch: "slug-only",
    args: { slug: "mining" },
    url: `${BASE}/gathering/mining`,
  },
  {
    tool: "fdb_gathering",
    branch: "slug+zone+lang",
    args: { slug: "skinning", zone: "duskwood", lang: "fr" },
    url: `${BASE}/gathering/skinning?zone=duskwood&lang=fr`,
  },
  { tool: "fdb_battlegrounds", branch: "default", args: {}, url: `${BASE}/battlegrounds` },
  {
    tool: "fdb_battlegrounds",
    branch: "lang",
    args: { lang: "es-MX" },
    url: `${BASE}/battlegrounds?lang=es-MX`,
  },
  {
    tool: "fdb_changes",
    branch: "list+verified-true",
    args: { kind: "item", verified: true, limit: 5, offset: 0, lang: "es" },
    url: `${BASE}/changes-seen?kind=item&verified=1&limit=5&offset=0&lang=es`,
  },
  {
    tool: "fdb_changes",
    branch: "list+verified-false",
    args: { verified: false },
    url: `${BASE}/changes-seen?verified=0`,
  },
  {
    tool: "fdb_builds",
    branch: "list",
    args: { limit: 10, offset: 0, lang: "es" },
    url: `${BASE}/builds?limit=10&offset=0&lang=es`,
  },
  {
    tool: "fdb_builds",
    branch: "detail-latest",
    args: {
      build: "latest",
      type: "talent",
      class: "warrior",
      change: "changed",
      q: "slam",
      limit: 25,
      offset: 0,
      lang: "de",
    },
    url: `${BASE}/builds/latest?type=talent&class=warrior&change=changed&q=slam&limit=25&offset=0&lang=de`,
  },
  {
    tool: "fdb_buffs_nerfs",
    branch: "filtered",
    args: {
      class: "warrior",
      build: "1.60.1.70790",
      direction: "buff",
      limit: 20,
      offset: 0,
      lang: "fr",
    },
    url: `${BASE}/buffs-nerfs?class=warrior&build=1.60.1.70790&direction=buff&limit=20&offset=0&lang=fr`,
  },
  { tool: "fdb_merchants_favor", branch: "default", args: {}, url: `${BASE}/merchants-favor` },
  {
    tool: "fdb_merchants_favor",
    branch: "lang",
    args: { lang: "es" },
    url: `${BASE}/merchants-favor?lang=es`,
  },
  { tool: "fdb_bis", branch: "list", args: { lang: "es" }, url: `${BASE}/bis?lang=es` },
  {
    tool: "fdb_bis",
    branch: "detail+easy-true",
    args: {
      spec: "hunter-beast-mastery",
      mode: "pvp",
      level: 60,
      easy: true,
      side: "a",
      lang: "de",
    },
    url: `${BASE}/bis/hunter-beast-mastery?mode=pvp&level=60&easy=1&side=a&lang=de`,
  },
  {
    tool: "fdb_bis",
    branch: "detail+easy-false-omitted",
    args: { spec: "mage-fire", easy: false },
    url: `${BASE}/bis/mage-fire`,
  },
  { tool: "fdb_endgame", branch: "default", args: {}, url: `${BASE}/endgame` },
  { tool: "fdb_endgame", branch: "lang", args: { lang: "fr" }, url: `${BASE}/endgame?lang=fr` },
  {
    tool: "fdb_content",
    branch: "detail+lang",
    args: { slug: "launch", lang: "es" },
    url: `${BASE}/articles/launch?lang=es`,
  },
  {
    tool: "fdb_content",
    branch: "list+posts",
    args: { kind: "posts", limit: 5, offset: 5, lang: "es" },
    url: `${BASE}/posts?limit=5&offset=5&lang=es`,
  },
  {
    tool: "fdb_content",
    branch: "list+articles",
    args: { kind: "news", limit: 5, offset: 5, lang: "de" },
    url: `${BASE}/articles?type=news&limit=5&offset=5&lang=de`,
  },
];

/** Encoding parity: caller-supplied text stays inside its path/query position. */
export const ENCODING_CASES: UrlCase[] = [
  {
    tool: "fdb_gathering",
    branch: "path-traversal-attempt",
    args: { slug: "../.." },
    url: `${BASE}/gathering/..%2F..`,
  },
  {
    tool: "fdb_gathering",
    branch: "slash-in-slug",
    args: { slug: "a/b" },
    url: `${BASE}/gathering/a%2Fb`,
  },
  {
    tool: "fdb_items",
    branch: "query-encoding",
    args: { q: "thunder fury&x" },
    url: `${BASE}/items?q=thunder+fury%26x`,
  },
  {
    tool: "fdb_content",
    branch: "detail-path-encoding",
    args: { slug: "a?b=c" },
    url: `${BASE}/articles/a%3Fb%3Dc`,
  },
  {
    tool: "fdb_bis",
    branch: "spec-path-encoding",
    args: { spec: "../admin" },
    url: `${BASE}/bis/..%2Fadmin`,
  },
  {
    tool: "fdb_builds",
    branch: "build-path-encoding",
    args: { build: "1.60/bad" },
    url: `${BASE}/builds/1.60%2Fbad`,
  },
];
