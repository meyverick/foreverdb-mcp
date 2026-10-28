use crate::target::Target;

use super::{
    Battlegrounds, Changes, Classes, Content, Dungeons, Gathering, ItemSets, Items, Professions,
    Quests, Spells, Vendors, text,
};

impl Items {
    pub fn target(&self) -> Target {
        if let Some(id) = self.id {
            return Target::path(&["items", &id.to_string()]).arg("lang", self.lang.clone());
        }
        Target::path(&["items"])
            .arg("q", self.q.clone())
            .arg("quality", self.quality)
            .arg("class", self.class)
            .arg("slot", self.slot)
            .arg("minLevel", self.min_level)
            .arg("maxLevel", self.max_level)
            .arg("limit", self.limit)
            .arg("offset", self.offset)
            .arg("lang", self.lang.clone())
    }
}

impl Spells {
    pub fn target(&self) -> Target {
        if let Some(id) = self.id {
            return Target::path(&["spells", &id.to_string()]).arg("lang", self.lang.clone());
        }
        Target::path(&["spells"])
            .arg("q", self.q.clone())
            .arg("limit", self.limit)
            .arg("offset", self.offset)
            .arg("lang", self.lang.clone())
    }
}

impl Quests {
    pub fn target(&self) -> Target {
        if let Some(id) = self.id {
            return Target::path(&["quests", &id.to_string()]);
        }
        Target::path(&["quests"])
            .arg("q", self.q.clone())
            .arg("zone", self.zone.clone())
            .arg("minLevel", self.min_level)
            .arg("maxLevel", self.max_level)
            .arg("side", self.side.clone())
            .arg("limit", self.limit)
            .arg("offset", self.offset)
    }
}

impl Vendors {
    pub fn target(&self) -> Target {
        if let Some(id) = self.id {
            return Target::path(&["vendors", &id.to_string()]);
        }
        Target::path(&["vendors"])
            .arg("q", self.q.clone())
            .arg("zone", self.zone.clone())
            .arg("seen", text(self.seen))
            .arg("limit", self.limit)
            .arg("offset", self.offset)
    }
}

impl Dungeons {
    pub fn target(&self) -> Target {
        if let Some(id) = self.id {
            return Target::path(&["dungeons", &id.to_string()]);
        }
        Target::path(&["dungeons"])
            .arg("limit", self.limit)
            .arg("offset", self.offset)
    }
}

impl Classes {
    pub fn target(&self) -> Target {
        match &self.name {
            Some(name) => Target::path(&["classes", name]).arg("lang", self.lang.clone()),
            None => Target::path(&["classes"]).arg("lang", self.lang.clone()),
        }
    }
}

impl ItemSets {
    pub fn target(&self) -> Target {
        if let Some(id) = self.id {
            return Target::path(&["itemsets", &id.to_string()]).arg("lang", self.lang.clone());
        }
        Target::path(&["itemsets"])
            .arg("q", self.q.clone())
            .arg("limit", self.limit)
            .arg("offset", self.offset)
            .arg("lang", self.lang.clone())
    }
}

impl Professions {
    pub fn target(&self) -> Target {
        let Some(slug) = &self.slug else {
            return Target::path(&["professions"]);
        };
        Target::path(&["professions", slug])
            .arg("q", self.q.clone())
            .arg("new", text(self.new_recipes))
            .arg("changed", text(self.changed))
            .arg("limit", self.limit)
            .arg("offset", self.offset)
    }
}

impl Gathering {
    pub fn target(&self) -> Target {
        Target::path(&["gathering", &self.slug]).arg("zone", self.zone.clone())
    }
}

impl Battlegrounds {
    pub fn target(&self) -> Target {
        Target::path(&["battlegrounds"])
            .arg("limit", self.limit)
            .arg("offset", self.offset)
    }
}

impl Changes {
    pub fn target(&self) -> Target {
        Target::path(&["changes-seen"])
            .arg("kind", self.kind.clone())
            .arg(
                "verified",
                self.verified.map(|verified| u8::from(verified).to_string()),
            )
            .arg("limit", self.limit)
            .arg("offset", self.offset)
    }
}

impl Content {
    pub fn target(&self) -> Target {
        if let Some(slug) = &self.slug {
            return Target::path(&["articles", slug]).arg("lang", self.lang.clone());
        }
        if self.kind.as_deref() == Some("posts") {
            return Target::path(&["posts"])
                .arg("limit", self.limit)
                .arg("offset", self.offset);
        }
        Target::path(&["articles"])
            .arg("type", self.kind.clone())
            .arg("limit", self.limit)
            .arg("offset", self.offset)
            .arg("lang", self.lang.clone())
    }
}
