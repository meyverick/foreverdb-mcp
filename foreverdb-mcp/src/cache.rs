//! In-memory response cache bounded by the API's documented cacheability.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Entries kept before a sweep of expired values runs on insert.
const MAX_ENTRIES: usize = 512;

pub struct TtlCache {
    ttl: Duration,
    entries: Mutex<HashMap<String, (Instant, String)>>,
}

impl TtlCache {
    pub fn new(ttl: Duration) -> Self {
        Self {
            ttl,
            entries: Mutex::new(HashMap::new()),
        }
    }

    pub fn get(&self, key: &str) -> Option<String> {
        let mut entries = self.entries.lock().expect("cache mutex poisoned");
        match entries.get(key) {
            Some((expires, value)) if *expires > Instant::now() => Some(value.clone()),
            Some(_) => {
                entries.remove(key);
                None
            }
            None => None,
        }
    }

    pub fn insert(&self, key: String, value: String) {
        let mut entries = self.entries.lock().expect("cache mutex poisoned");
        if entries.len() >= MAX_ENTRIES {
            let now = Instant::now();
            entries.retain(|_, (expires, _)| *expires > now);
        }
        entries.insert(key, (Instant::now() + self.ttl, value));
    }
}

#[cfg(test)]
mod tests {
    use std::thread::sleep;
    use std::time::Duration;

    use super::TtlCache;

    #[test]
    fn fresh_entry_is_returned_then_expires() {
        let cache = TtlCache::new(Duration::from_millis(20));
        cache.insert("items?q=a".to_owned(), "body".to_owned());
        assert_eq!(cache.get("items?q=a").as_deref(), Some("body"));
        sleep(Duration::from_millis(30));
        assert_eq!(cache.get("items?q=a"), None);
    }

    #[test]
    fn expired_entries_are_swept_instead_of_growing() {
        let cache = TtlCache::new(Duration::from_millis(1));
        for index in 0..600 {
            cache.insert(format!("key-{index}"), "body".to_owned());
        }
        sleep(Duration::from_millis(5));
        cache.insert("fresh".to_owned(), "body".to_owned());
        assert!(cache.entries.lock().expect("cache mutex poisoned").len() <= 512);
    }
}
