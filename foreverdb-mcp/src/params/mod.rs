//! Tool parameters and the upstream targets they map to.

use rmcp::schemars;
use serde::Deserialize;

fn text(value: Option<bool>) -> Option<&'static str> {
    value.map(|value| if value { "true" } else { "false" })
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Items {
    /// Item id: return one item instead of a list.
    pub id: Option<u32>,
    /// Name contains.
    pub q: Option<String>,
    /// 0 Poor to 5 Legendary.
    pub quality: Option<u8>,
    /// Item class id (2 weapons, 4 armour ...).
    pub class: Option<u8>,
    /// Inventory type id (1 head, 5 chest ...).
    pub slot: Option<u8>,
    /// Required level at least.
    pub min_level: Option<u32>,
    /// Required level at most.
    pub max_level: Option<u32>,
    /// How many, 1 to 100 (default 25).
    pub limit: Option<u32>,
    /// Skip this many, for the next page.
    pub offset: Option<u32>,
    /// Game language: es, es-MX, de or fr.
    pub lang: Option<String>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Spells {
    /// Spell id: return one spell instead of a list.
    pub id: Option<u32>,
    /// Name contains.
    pub q: Option<String>,
    /// How many, 1 to 100 (default 25).
    pub limit: Option<u32>,
    /// Skip this many, for the next page.
    pub offset: Option<u32>,
    /// Game language: es, es-MX, de or fr.
    pub lang: Option<String>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Quests {
    /// Quest id: return one quest instead of a list.
    pub id: Option<u32>,
    /// Name contains.
    pub q: Option<String>,
    /// Zone name contains.
    pub zone: Option<String>,
    /// Quest level at least.
    pub min_level: Option<u32>,
    /// Quest level at most.
    pub max_level: Option<u32>,
    /// alliance or horde.
    pub side: Option<String>,
    /// How many, 1 to 100 (default 25).
    pub limit: Option<u32>,
    /// Skip this many, for the next page.
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Vendors {
    /// Vendor id: return one vendor with its stock instead of a list.
    pub id: Option<u32>,
    /// Name or title contains.
    pub q: Option<String>,
    /// Zone name contains.
    pub zone: Option<String>,
    /// true: only vendors seen in Forever.
    pub seen: Option<bool>,
    /// How many, 1 to 100 (default 25).
    pub limit: Option<u32>,
    /// Skip this many, for the next page.
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Dungeons {
    /// Dungeon id: return one dungeon with bosses and loot instead of a list.
    pub id: Option<u32>,
    /// How many, 1 to 100 (default 25).
    pub limit: Option<u32>,
    /// Skip this many, for the next page.
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct Classes {
    /// Class name: return one class with its abilities instead of the list.
    pub name: Option<String>,
    /// Game language: es, es-MX, de or fr.
    pub lang: Option<String>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ItemSets {
    /// Item set id: return one set with pieces and bonuses instead of a list.
    pub id: Option<u32>,
    /// Name contains.
    pub q: Option<String>,
    /// How many, 1 to 100 (default 25).
    pub limit: Option<u32>,
    /// Skip this many, for the next page.
    pub offset: Option<u32>,
    /// Game language: es, es-MX, de or fr.
    pub lang: Option<String>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Professions {
    /// Profession slug: return one profession with trainers and recipes.
    pub slug: Option<String>,
    /// Recipe name contains (detail only).
    pub q: Option<String>,
    /// true: only recipes new in Forever (detail only).
    #[serde(rename = "new")]
    pub new_recipes: Option<bool>,
    /// true: only recipes changed from Classic (detail only).
    pub changed: Option<bool>,
    /// How many recipes, 1 to 100 (detail only, default 25).
    pub limit: Option<u32>,
    /// Skip this many recipes, for the next page (detail only).
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Gathering {
    /// herbalism, mining, skinning or fishing.
    pub slug: String,
    /// Only this zone: its map id, or part of its name (skinning also lists the zone's beasts).
    pub zone: Option<String>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Battlegrounds {
    /// How many, 1 to 100 (default 25).
    pub limit: Option<u32>,
    /// Skip this many, for the next page.
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Changes {
    /// item, npc, vendor, trainer or quest.
    pub kind: Option<String>,
    /// true: only Verified changes; false: only Not confirmed.
    pub verified: Option<bool>,
    /// How many, 1 to 100 (default 25).
    pub limit: Option<u32>,
    /// Skip this many, for the next page.
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Content {
    /// Article slug: return one article's blocks and sources.
    pub slug: Option<String>,
    /// Article type (news, guide ...) or the literal "posts" for Blizzard posts.
    pub kind: Option<String>,
    /// How many, 1 to 100 (default 25).
    pub limit: Option<u32>,
    /// Skip this many, for the next page.
    pub offset: Option<u32>,
    /// Game language: es, es-MX, de or fr.
    pub lang: Option<String>,
}

mod targets;

#[cfg(test)]
mod tests;
