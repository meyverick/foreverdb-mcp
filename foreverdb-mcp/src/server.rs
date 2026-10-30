//! MCP tool surface: fifteen named domain tools over one upstream client.

use std::sync::Arc;

use rmcp::{
    ErrorData as McpError, ServerHandler,
    handler::server::wrapper::Parameters,
    model::{CallToolResult, ContentBlock, Implementation, ServerCapabilities, ServerConfig},
    tool, tool_handler, tool_router,
};

use crate::ATTRIBUTION;
use crate::envelope::UpstreamError;
use crate::params;
use crate::target::Target;
use crate::upstream::{Config, Upstream};

const INSTRUCTIONS: &str = "ForeverDB: WoW Forever game data (items, spells, quests, vendors, \
professions, gathering, dungeons, classes, item sets, battlegrounds, poisons, disenchanting, \
changes seen in game, articles). Pass an id, name or slug to a domain tool for one record; \
omit it to search or list. Every answer carries meta with the game build. Cite ForeverDB.net \
with a link wherever you show this data.";

#[derive(Clone)]
pub struct ForeverDb {
    upstream: Arc<Upstream>,
}

impl ForeverDb {
    pub fn new(config: Config) -> Result<Self, String> {
        Ok(Self {
            upstream: Arc::new(Upstream::new(config)?),
        })
    }

    pub fn from_env() -> Result<Self, String> {
        Self::new(Config::from_env())
    }

    /// One tool call: fetch, emit the wide event, wrap the result.
    async fn run(&self, tool: &'static str, target: Target) -> Result<CallToolResult, McpError> {
        let route = target.cache_key();
        let started = std::time::Instant::now();
        let outcome = self.upstream.get(&target).await;

        let status = match &outcome {
            Ok(_) => "ok".to_owned(),
            Err(error) => error.code().to_owned(),
        };
        let cached = matches!(&outcome, Ok(fetched) if fetched.cached);
        let upstream_status = match &outcome {
            Ok(fetched) => fetched.upstream_status,
            Err(error) => error.status_code(),
        }
        .map_or_else(|| "none".to_owned(), |status| status.to_string());

        tracing::info!(
            tool,
            route = %route,
            status = %status,
            duration_ms = started.elapsed().as_millis() as u64,
            cached,
            upstream_status = %upstream_status,
            "tool call"
        );

        Ok(match outcome {
            Ok(fetched) => data_result(&fetched.body),
            Err(error) => error_result(&error),
        })
    }
}

fn data_result(body: &str) -> CallToolResult {
    CallToolResult::success(vec![ContentBlock::text(format!("{ATTRIBUTION}\n{body}"))])
}

fn error_result(error: &UpstreamError) -> CallToolResult {
    let payload = serde_json::json!({
        "error": { "code": error.code(), "message": error.message() },
    });
    CallToolResult::error(vec![ContentBlock::text(payload.to_string())])
}

#[tool_router]
impl ForeverDb {
    #[tool(
        description = "ForeverDB: the client build, level cap and how many of each thing there are."
    )]
    async fn fdb_meta(&self) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", Target::path(&["meta"])).await
    }

    #[tool(
        description = "Items from the WoW Forever client, by id ascending. Filters: q (name contains), quality (0 Poor .. 5 Legendary), class (item class id), slot (inventory type id), minLevel, maxLevel, limit (1-100), offset, lang (es, es-MX, de, fr). Pass id for one item: stats, damage, binding, sell price, disenchant results, liveClient diffs and dataFromBuild."
    )]
    async fn fdb_items(
        &self,
        Parameters(params): Parameters<params::Items>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "Spells and abilities from the client, by id ascending. Filters: q (name contains), limit (1-100), offset, lang. Pass id for one spell: rank, description, icon and liveClient diffs."
    )]
    async fn fdb_spells(
        &self,
        Parameters(params): Parameters<params::Spells>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "Quests with ForeverDB's guide and where they start and end. Filters: q (name contains), zone, minLevel, maxLevel, side (alliance or horde), limit (1-100), offset. Pass id for one quest: chain (previous/next), questLine, starts and ends with NPC, object or item, map location and source."
    )]
    async fn fdb_quests(
        &self,
        Parameters(params): Parameters<params::Quests>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "Vendors with where they stand and their reputation faction. Filters: q (name or title contains), zone, seen (true: only seen in Forever), limit (1-100), offset. Pass id for one vendor: everything they sell with copper prices and non-gold costs."
    )]
    async fn fdb_vendors(
        &self,
        Parameters(params): Parameters<params::Vendors>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "Rogue poisons: how Rogues learn Poisons, every poison with reagents and skill colours, the trainers players saw teach it, and the trainers and poison suppliers with what they sell."
    )]
    async fn fdb_poisons(&self) -> Result<CallToolResult, McpError> {
        self.run("fdb_poisons", Target::path(&["poisons"])).await
    }

    #[tool(
        description = "Disenchanting: what uncommon, rare and epic weapons and armour disenchant into by item level, for Forever (as seen by players) and Classic."
    )]
    async fn fdb_disenchant(&self) -> Result<CallToolResult, McpError> {
        self.run("fdb_disenchant", Target::path(&["disenchant"]))
            .await
    }

    #[tool(
        description = "Dungeons and raids by lowest level first. Filters: limit (1-100), offset. Pass id for one dungeon: bosses and notable loot."
    )]
    async fn fdb_dungeons(
        &self,
        Parameters(params): Parameters<params::Dungeons>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "The nine classes. Pass name for one class: every ability with its ranks and the level each is learned. Optional lang."
    )]
    async fn fdb_classes(
        &self,
        Parameters(params): Parameters<params::Classes>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "Item sets with their pieces. Filters: q (name contains), limit (1-100), offset, lang. Pass id for one set: pieces and set bonuses."
    )]
    async fn fdb_itemsets(
        &self,
        Parameters(params): Parameters<params::ItemSets>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "All twelve professions with recipe counts. Pass slug (alchemy, blacksmithing, enchanting, engineering, leatherworking, tailoring, herbalism, mining, skinning, cooking, first-aid, fishing) for one profession: ranks and skill caps, trainers, and its recipe page with reagents, skill colours, learnedFrom sources, vendor prices and costs. Recipe filters: q, new (only new in Forever), changed (changed from Classic), limit (1-100), offset."
    )]
    async fn fdb_professions(
        &self,
        Parameters(params): Parameters<params::Professions>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "Where to gather for herbalism, mining, skinning or fishing: required skill per node, nodes and beasts per zone, fishing pools, and the best zones per skill range. slug is required; zone narrows to one zone (map id or part of its name; skinning then lists the zone's beasts)."
    )]
    async fn fdb_gathering(
        &self,
        Parameters(params): Parameters<params::Gathering>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "Every battleground and arena in the client: levels, team size, how you win, objectives with map coordinates, and where the rules come from (blizzard, classic or client). Filters: limit (1-100), offset."
    )]
    async fn fdb_battlegrounds(
        &self,
        Parameters(params): Parameters<params::Battlegrounds>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "Changes players' ForeverDB addons saw in game that differ from the game files: prices, quest rewards and XP, item stats, creature levels. Newest first, counts only. Filters: kind (item, npc, vendor, trainer, quest), verified (true: only Verified, false: only Not confirmed), limit (1-100), offset."
    )]
    async fn fdb_changes(
        &self,
        Parameters(params): Parameters<params::Changes>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }

    #[tool(
        description = "ForeverDB's articles and Blizzard's blue posts, newest first. kind: an article type (news, guide ...) or the literal \"posts\" for Blizzard posts; filters limit (1-100), offset, lang. Pass slug for one article's blocks and sources."
    )]
    async fn fdb_content(
        &self,
        Parameters(params): Parameters<params::Content>,
    ) -> Result<CallToolResult, McpError> {
        self.run("fdb_meta", params.target()).await
    }
}

#[tool_handler]
impl ServerHandler for ForeverDb {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("foreverdb", env!("CARGO_PKG_VERSION")))
            .with_instructions(INSTRUCTIONS)
    }
}

#[cfg(test)]
#[path = "server_tests.rs"]
mod tests;
