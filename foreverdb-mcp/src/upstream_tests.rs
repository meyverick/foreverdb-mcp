use std::num::NonZeroU32;
use std::sync::Arc;
use std::time::Duration;

use governor::RateLimiter;

use super::{Config, Upstream, normalize_key, quota};
use crate::envelope::UpstreamError;
use crate::stub::{Reply, Stub};
use crate::target::Target;

fn config(stub: &Stub, per_minute: u32, max_in_flight: usize) -> Config {
    Config {
        base_url: stub.base.clone(),
        api_key: Some("fdb_test_key".to_owned()),
        per_minute: NonZeroU32::new(per_minute).expect("non-zero"),
        max_in_flight,
        timeout: Duration::from_millis(300),
        cache_ttl: Duration::from_secs(60),
    }
}

#[tokio::test]
async fn missing_key_makes_no_request() {
    let stub = Stub::start(vec![Reply::json(r#"{"data":[]}"#)]).await;
    let mut config = config(&stub, 6000, 4);
    config.api_key = None;
    let upstream = Upstream::new(config).expect("upstream builds");

    let error = upstream
        .get(&Target::path(&["meta"]))
        .await
        .expect_err("missing key fails");
    assert_eq!(error, UpstreamError::MissingKey);
    assert!(error.message().contains("FOREVERDB_API_KEY"));
    assert_eq!(stub.hits(), 0);
}

#[test]
fn budget_allows_at_most_sixty_immediate_requests() {
    let limiter = RateLimiter::direct(quota(NonZeroU32::new(60).expect("non-zero")));
    let allowed = (0..70).filter(|_| limiter.check().is_ok()).count();
    assert!(allowed <= 60, "allowed {allowed} in one minute");

    let limiter = RateLimiter::direct(quota(NonZeroU32::new(60).expect("non-zero")));
    limiter.check().expect("first request is inside the budget");
}

#[tokio::test]
async fn in_flight_requests_respect_the_semaphore() {
    let stub = Stub::start(vec![
        Reply::json(r#"{"data":[]}"#).with_delay(Duration::from_millis(60)),
    ])
    .await;
    let upstream = Arc::new(Upstream::new(config(&stub, 60_000, 2)).expect("upstream builds"));

    let mut tasks = Vec::new();
    for _ in 0..6 {
        let upstream = Arc::clone(&upstream);
        tasks.push(tokio::spawn(async move {
            upstream.get(&Target::path(&["battlegrounds"])).await
        }));
    }
    for task in tasks {
        task.await.expect("task joins").expect("request succeeds");
    }
    assert!(stub.peak() <= 2, "peak concurrency {}", stub.peak());
}

#[tokio::test]
async fn one_retry_after_429_then_success() {
    let stub = Stub::start(vec![
        Reply::json(r#"{"error":{"code":"rate_limit","message":"slow"}}"#).with_status(429),
        Reply::json(r#"{"data":[1],"meta":{}}"#),
    ])
    .await;
    let upstream = Upstream::new(config(&stub, 6000, 4)).expect("upstream builds");

    let fetched = upstream
        .get(&Target::path(&["meta"]))
        .await
        .expect("retry succeeds");
    assert_eq!(fetched.body, r#"{"data":[1],"meta":{}}"#);
    assert!(!fetched.cached);
    assert_eq!(fetched.upstream_status, Some(200));
    assert_eq!(stub.hits(), 2);
}

#[tokio::test]
async fn second_429_is_a_rate_limit_error() {
    let stub = Stub::start(vec![
        Reply::json(r#"{"error":{"code":"rate_limit","message":"slow down"}}"#).with_status(429),
        Reply::json(r#"{"error":{"code":"rate_limit","message":"still slow"}}"#).with_status(429),
    ])
    .await;
    let upstream = Upstream::new(config(&stub, 6000, 4)).expect("upstream builds");

    let error = upstream
        .get(&Target::path(&["meta"]))
        .await
        .expect_err("second 429 fails");
    assert_eq!(error.code(), "rate_limit");
    assert_eq!(stub.hits(), 2);
}

#[tokio::test]
async fn double_server_error_is_upstream_unavailable() {
    let stub = Stub::start(vec![Reply::json("{}").with_status(500)]).await;
    let upstream = Upstream::new(config(&stub, 6000, 4)).expect("upstream builds");

    let error = upstream
        .get(&Target::path(&["meta"]))
        .await
        .expect_err("double 500 fails");
    assert_eq!(error.code(), "upstream_unavailable");
    assert_eq!(stub.hits(), 2);
}

#[tokio::test]
async fn timeout_is_reported_without_retry() {
    let stub = Stub::start(vec![
        Reply::json("{}").with_delay(Duration::from_millis(400)),
    ])
    .await;
    let upstream = Upstream::new(config(&stub, 6000, 4)).expect("upstream builds");

    let error = upstream
        .get(&Target::path(&["meta"]))
        .await
        .expect_err("timeout fails");
    assert_eq!(error.code(), "timeout");
    assert_eq!(stub.hits(), 1);
}

#[tokio::test]
async fn repeat_lookup_is_served_from_cache() {
    let stub = Stub::start(vec![Reply::json(r#"{"data":[]}"#)]).await;
    let upstream = Upstream::new(config(&stub, 6000, 4)).expect("upstream builds");
    let target = Target::path(&["spells"]).arg("q", Some("fire"));

    upstream.get(&target).await.expect("first call");
    upstream.get(&target).await.expect("second call");
    assert_eq!(stub.hits(), 1);
}

#[test]
fn cache_key_never_contains_the_api_key() {
    let config = Config {
        base_url: "https://foreverdb.net/api/v1".to_owned(),
        api_key: Some("fdb_secret_value".to_owned()),
        per_minute: NonZeroU32::new(60).expect("non-zero"),
        max_in_flight: 1,
        timeout: Duration::from_secs(1),
        cache_ttl: Duration::from_secs(60),
    };
    let rendered = format!("{config:?}");
    assert!(!rendered.contains("fdb_secret_value"), "{rendered}");
    let upstream = Upstream::new(config).expect("upstream builds");
    let key = Target::path(&["items", "1"]).cache_key();
    assert!(!key.contains("fdb"), "{key}");
    assert_eq!(upstream.permits.available_permits(), 1);
}

#[test]
fn blank_keys_count_as_absent() {
    assert_eq!(normalize_key(None), None);
    assert_eq!(normalize_key(Some(String::new())), None);
    assert_eq!(normalize_key(Some("   ".to_owned())), None);
    assert_eq!(
        normalize_key(Some(" fdb_x ".to_owned())).as_deref(),
        Some("fdb_x")
    );
}
