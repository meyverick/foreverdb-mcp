//! ForeverDB API client: key handling, rate budget, cache, bounded concurrency.

use std::num::NonZeroU32;
use std::time::Duration;

use governor::{Quota, RateLimiter, clock::DefaultClock, state::InMemoryState};
use reqwest::StatusCode;
use tokio::sync::Semaphore;

use crate::cache::TtlCache;
use crate::envelope::UpstreamError;
use crate::target::Target;

pub type DirectRateLimiter = RateLimiter<
    governor::state::NotKeyed,
    InMemoryState,
    DefaultClock,
    governor::middleware::NoOpMiddleware,
>;

/// The API allows 60 requests a minute and 10,000 a day per key.
pub const REQUESTS_PER_MINUTE: u32 = 60;

#[derive(Clone)]
pub struct Config {
    pub base_url: String,
    pub api_key: Option<String>,
    pub per_minute: NonZeroU32,
    pub max_in_flight: usize,
    pub timeout: Duration,
    pub cache_ttl: Duration,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            base_url: std::env::var("FOREVERDB_BASE_URL")
                .unwrap_or_else(|_| "https://foreverdb.net/api/v1".to_owned()),
            api_key: normalize_key(std::env::var("FOREVERDB_API_KEY").ok()),
            per_minute: NonZeroU32::new(REQUESTS_PER_MINUTE).expect("60 is non-zero"),
            max_in_flight: 8,
            timeout: Duration::from_secs(15),
            cache_ttl: Duration::from_secs(60),
        }
    }
}

/// Redacts the API key so a stray log line cannot leak it.
impl std::fmt::Debug for Config {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("Config")
            .field("base_url", &self.base_url)
            .field("api_key", &self.api_key.as_ref().map(|_| "***"))
            .field("per_minute", &self.per_minute)
            .field("max_in_flight", &self.max_in_flight)
            .field("timeout", &self.timeout)
            .field("cache_ttl", &self.cache_ttl)
            .finish()
    }
}

pub struct Upstream {
    http: reqwest::Client,
    base_url: String,
    api_key: Option<String>,
    limiter: DirectRateLimiter,
    permits: Semaphore,
    cache: TtlCache,
    timeout: Duration,
}

impl Upstream {
    pub fn new(config: Config) -> Result<Self, String> {
        let http = reqwest::Client::builder()
            .pool_idle_timeout(Duration::from_secs(90))
            .build()
            .map_err(|error| format!("could not build HTTP client: {error}"))?;
        Ok(Self {
            http,
            base_url: config.base_url,
            api_key: config.api_key,
            limiter: RateLimiter::direct(quota(config.per_minute)),
            permits: Semaphore::new(config.max_in_flight),
            cache: TtlCache::new(config.cache_ttl),
            timeout: config.timeout,
        })
    }

    /// Fetches a target, honoring the API contract for key, budget, and caching.
    pub async fn get(&self, target: &Target) -> Result<String, UpstreamError> {
        let Some(api_key) = self.api_key.as_deref() else {
            return Err(UpstreamError::MissingKey);
        };
        let url = target.url(&self.base_url).map_err(UpstreamError::Network)?;
        let cache_key = target.cache_key();
        if let Some(body) = self.cache.get(&cache_key) {
            return Ok(body);
        }

        self.limiter.until_ready().await;
        let _permit = self
            .permits
            .acquire()
            .await
            .expect("semaphore is never closed");

        let mut attempt = 0_u8;
        loop {
            attempt += 1;
            let response = self
                .http
                .get(url.clone())
                .header("X-API-Key", api_key)
                .timeout(self.timeout)
                .send()
                .await;

            let response = match response {
                Ok(response) => response,
                Err(error) if error.is_timeout() => return Err(UpstreamError::Timeout),
                Err(error) => return Err(UpstreamError::Network(error.to_string())),
            };

            let status = response.status();
            let retry_after = retry_after_seconds(&response);
            let body = response
                .text()
                .await
                .map_err(|error| UpstreamError::Network(error.to_string()))?;

            if status.is_success() {
                self.cache.insert(cache_key, body.clone());
                return Ok(body);
            }
            if attempt == 1 && (status == StatusCode::TOO_MANY_REQUESTS || status.is_server_error())
            {
                if let Some(seconds) = retry_after {
                    tokio::time::sleep(Duration::from_secs(seconds)).await;
                }
                continue;
            }
            return Err(UpstreamError::classify(status.as_u16(), retry_after, &body));
        }
    }
}

/// An empty or whitespace-only key is treated as absent, never sent.
fn normalize_key(raw: Option<String>) -> Option<String> {
    raw.filter(|key| !key.trim().is_empty())
        .map(|key| key.trim().to_owned())
}

fn quota(per_minute: NonZeroU32) -> Quota {
    Quota::per_minute(per_minute)
}

fn retry_after_seconds(response: &reqwest::Response) -> Option<u64> {
    response
        .headers()
        .get(reqwest::header::RETRY_AFTER)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.trim().parse().ok())
}

#[cfg(test)]
#[path = "upstream_tests.rs"]
mod tests;
