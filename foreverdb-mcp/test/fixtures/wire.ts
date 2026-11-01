// Wire snapshot taken from the Rust `Target` builder at crate version 0.1.3.
// One expected absolute URL per tool and per parameter branch, so a porting
// mistake shows up as a diff instead of as a wrong request in production.

export interface UrlCase {
  /** Tool name whose arguments produce `url`. */
  tool: string;
  /** Which branch of the tool this case exercises. */
  branch: string;
  /** Arguments exactly as an MCP client would send them. */
  args: Record<string, unknown>;
  /** Absolute URL the Rust builder produced for those arguments. */
  url: string;
}

export const BASE_URL = "https://foreverdb.net/api/v1";

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
    branch: "detail-drops-lang",
    args: { id: 1, lang: "es" },
    url: `${BASE}/quests/1`,
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
    },
    url: `${BASE}/quests?q=tough&zone=elwynn&minLevel=1&maxLevel=10&side=alliance&limit=50&offset=50`,
  },
  { tool: "fdb_vendors", branch: "detail", args: { id: 7 }, url: `${BASE}/vendors/7` },
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
  { tool: "fdb_poisons", branch: "only", args: {}, url: `${BASE}/poisons` },
  { tool: "fdb_disenchant", branch: "only", args: {}, url: `${BASE}/disenchant` },
  {
    tool: "fdb_dungeons",
    branch: "list",
    args: { limit: 5, offset: 5 },
    url: `${BASE}/dungeons?limit=5&offset=5`,
  },
  { tool: "fdb_dungeons", branch: "detail", args: { id: 3 }, url: `${BASE}/dungeons/3` },
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
    branch: "list-drops-filters",
    args: { q: "swift", new: true },
    url: `${BASE}/professions`,
  },
  {
    tool: "fdb_professions",
    branch: "detail",
    args: { slug: "alchemy", q: "swift", new: true, changed: false, limit: 10, offset: 5 },
    url: `${BASE}/professions/alchemy?q=swift&new=true&changed=false&limit=10&offset=5`,
  },
  {
    tool: "fdb_gathering",
    branch: "slug-only",
    args: { slug: "mining" },
    url: `${BASE}/gathering/mining`,
  },
  {
    tool: "fdb_gathering",
    branch: "slug+zone",
    args: { slug: "skinning", zone: "duskwood" },
    url: `${BASE}/gathering/skinning?zone=duskwood`,
  },
  {
    tool: "fdb_battlegrounds",
    branch: "list",
    args: { limit: 5, offset: 5 },
    url: `${BASE}/battlegrounds?limit=5&offset=5`,
  },
  {
    tool: "fdb_changes",
    branch: "list+verified-true",
    args: { kind: "item", verified: true, limit: 5, offset: 0 },
    url: `${BASE}/changes-seen?kind=item&verified=1&limit=5&offset=0`,
  },
  {
    tool: "fdb_changes",
    branch: "list+verified-false",
    args: { verified: false },
    url: `${BASE}/changes-seen?verified=0`,
  },
  {
    tool: "fdb_content",
    branch: "detail+lang",
    args: { slug: "launch", lang: "es" },
    url: `${BASE}/articles/launch?lang=es`,
  },
  {
    tool: "fdb_content",
    branch: "list+posts",
    args: { kind: "posts", limit: 5, offset: 5 },
    url: `${BASE}/posts?limit=5&offset=5`,
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
];
