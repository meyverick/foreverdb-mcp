//! One upstream request: encoded path segments plus query pairs.

use reqwest::Url;

#[derive(Debug, Clone, Default)]
pub struct Target {
    segments: Vec<String>,
    query: Vec<(&'static str, String)>,
}

impl Target {
    /// Builds a target from path segments appended to the base URL's path.
    ///
    /// Segments go through the URL encoder, so a caller-supplied value cannot
    /// escape its path position or reach another endpoint.
    pub fn path(segments: &[&str]) -> Self {
        Self {
            segments: segments
                .iter()
                .map(|segment| (*segment).to_owned())
                .collect(),
            query: Vec::new(),
        }
    }

    /// Adds a query pair when the value is present.
    pub fn arg<T: ToString>(mut self, name: &'static str, value: Option<T>) -> Self {
        if let Some(value) = value {
            self.query.push((name, value.to_string()));
        }
        self
    }

    pub fn url(&self, base: &str) -> Result<Url, String> {
        let mut url =
            Url::parse(base).map_err(|error| format!("invalid upstream base url: {error}"))?;
        {
            let mut path = url
                .path_segments_mut()
                .map_err(|()| "upstream base url cannot carry a path".to_owned())?;
            path.pop_if_empty();
            for segment in &self.segments {
                path.push(segment);
            }
        }
        if !self.query.is_empty() {
            url.query_pairs_mut().extend_pairs(
                self.query
                    .iter()
                    .map(|(name, value)| (*name, value.as_str())),
            );
        }
        Ok(url)
    }

    /// Cache identity: path plus query, never the API key.
    pub fn cache_key(&self) -> String {
        let mut key = self.segments.join("/");
        for (name, value) in &self.query {
            key.push('|');
            key.push_str(name);
            key.push('=');
            key.push_str(value);
        }
        key
    }
}

#[cfg(test)]
mod tests {
    use super::Target;

    #[test]
    fn segments_and_query_are_encoded() {
        let url = Target::path(&["items", "19019"])
            .arg("q", Some("thunder fury&x"))
            .arg("limit", None::<u32>)
            .url("https://foreverdb.net/api/v1")
            .expect("url builds");
        assert_eq!(url.path(), "/api/v1/items/19019");
        assert_eq!(url.query(), Some("q=thunder+fury%26x"));
    }

    #[test]
    fn caller_segment_cannot_add_path_separators() {
        let url = Target::path(&["items", "../..", "meta"])
            .url("https://foreverdb.net/api/v1")
            .expect("url builds");
        assert_eq!(url.path(), "/api/v1/items/..%2F../meta");
    }

    #[test]
    fn cache_key_is_stable_across_calls() {
        let a = Target::path(&["items"]).arg("q", Some("sword")).cache_key();
        let b = Target::path(&["items"]).arg("q", Some("sword")).cache_key();
        assert_eq!(a, b);
    }
}
