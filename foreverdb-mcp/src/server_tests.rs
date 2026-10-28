use std::num::NonZeroU32;
use std::time::Duration;

use rmcp::model::CallToolRequestParams;
use rmcp::transport::async_rw::AsyncRwTransport;
use rmcp::{RoleClient, RoleServer, ServiceExt};

use super::ForeverDb;
use crate::ATTRIBUTION;
use crate::stub::{Reply, Stub};
use crate::upstream::Config;

const TOOL_NAMES: [&str; 15] = [
    "fdb_battlegrounds",
    "fdb_changes",
    "fdb_classes",
    "fdb_content",
    "fdb_disenchant",
    "fdb_dungeons",
    "fdb_gathering",
    "fdb_items",
    "fdb_itemsets",
    "fdb_meta",
    "fdb_poisons",
    "fdb_professions",
    "fdb_quests",
    "fdb_spells",
    "fdb_vendors",
];

fn config(stub: &Stub) -> Config {
    Config {
        base_url: stub.base.clone(),
        api_key: Some("fdb_test_key".to_owned()),
        per_minute: NonZeroU32::new(6000).expect("non-zero"),
        max_in_flight: 4,
        timeout: Duration::from_secs(2),
        cache_ttl: Duration::from_secs(60),
    }
}

/// Serves the MCP server over an in-memory pipe and returns the connected client.
async fn connect(server: ForeverDb) -> rmcp::service::RunningService<RoleClient, ()> {
    let (server_io, client_io) = tokio::io::duplex(1 << 16);
    let (server_read, server_write) = tokio::io::split(server_io);
    let (client_read, client_write) = tokio::io::split(client_io);

    let server_transport = AsyncRwTransport::<RoleServer, _, _>::new(server_read, server_write);
    let client_transport = AsyncRwTransport::<RoleClient, _, _>::new(client_read, client_write);

    tokio::spawn(async move {
        let running = server.serve(server_transport).await.expect("server serves");
        let _ = running.waiting().await;
    });

    ().serve(client_transport).await.expect("client connects")
}

#[tokio::test]
async fn lists_exactly_the_fifteen_domain_tools() {
    let stub = Stub::start(vec![Reply::json(r#"{"data":[],"meta":{}}"#)]).await;
    let client = connect(ForeverDb::new(config(&stub)).expect("server builds")).await;

    let result = client.list_tools(None).await.expect("tools list");
    let mut names: Vec<String> = result
        .tools
        .iter()
        .map(|tool| tool.name.to_string())
        .collect();
    names.sort();

    assert_eq!(names, TOOL_NAMES, "tool surface drifted");
    client.cancel().await.expect("client stops");
}

/// Every domain tool, with arguments that exercise list and detail routing.
const CALLS: [(&str, &str); 15] = [
    ("fdb_meta", "{}"),
    ("fdb_items", r#"{"id":19019}"#),
    ("fdb_spells", r#"{"q":"fire"}"#),
    ("fdb_quests", r#"{"limit":5}"#),
    ("fdb_vendors", r#"{"seen":true}"#),
    ("fdb_poisons", "{}"),
    ("fdb_disenchant", "{}"),
    ("fdb_dungeons", "{}"),
    ("fdb_classes", r#"{"name":"warrior"}"#),
    ("fdb_itemsets", r#"{"q":"tier"}"#),
    ("fdb_professions", r#"{"slug":"alchemy"}"#),
    ("fdb_gathering", r#"{"slug":"mining"}"#),
    ("fdb_battlegrounds", "{}"),
    ("fdb_changes", r#"{"verified":true}"#),
    ("fdb_content", r#"{"kind":"news"}"#),
];

#[tokio::test]
async fn every_domain_tool_keeps_the_envelope_and_carries_attribution() {
    let body = r#"{"data":[{"id":19019}],"meta":{"build":"1.15.0","total":1}}"#;
    let stub = Stub::start(vec![Reply::json(body)]).await;
    let client = connect(ForeverDb::new(config(&stub)).expect("server builds")).await;

    for (name, arguments) in CALLS {
        let arguments: serde_json::Map<String, serde_json::Value> =
            serde_json::from_str(arguments).expect("arguments parse");
        let result = client
            .call_tool(CallToolRequestParams::new(name).with_arguments(arguments))
            .await
            .expect("tool call");
        assert_eq!(
            result.is_error,
            Some(false),
            "{name} failed: {:?}",
            result.content
        );
        let text = content_text(&result);
        assert!(
            text.contains(ATTRIBUTION),
            "{name} missing attribution: {text}"
        );
        assert!(
            text.contains(r#""build":"1.15.0""#),
            "{name} lost meta: {text}"
        );
        assert!(text.contains(r#""total":1"#), "{name} lost meta: {text}");
    }
    assert_eq!(stub.hits(), 15, "each tool reaches upstream exactly once");
    client.cancel().await.expect("client stops");
}

#[tokio::test]
async fn upstream_error_keeps_code_and_message() {
    let stub = Stub::start(vec![
        Reply::json(r#"{"error":{"code":"rate_limit","message":"Slow down: this key allows 60 requests a minute."}}"#)
            .with_status(429),
    ])
    .await;
    let client = connect(ForeverDb::new(config(&stub)).expect("server builds")).await;

    let result = client
        .call_tool(CallToolRequestParams::new("fdb_meta"))
        .await
        .expect("tool call");

    assert_eq!(result.is_error, Some(true));
    let text = content_text(&result);
    assert!(text.contains(r#""code":"rate_limit""#), "{text}");
    assert!(text.contains("allows 60 requests a minute"), "{text}");
    assert!(!text.contains(ATTRIBUTION), "errors carry no data credit");
    client.cancel().await.expect("client stops");
}

#[tokio::test]
async fn missing_key_is_reported_and_never_leaks_a_key() {
    let stub = Stub::start(vec![Reply::json(r#"{"data":[]}"#)]).await;
    let mut config = config(&stub);
    config.api_key = Some("fdb_super_secret".to_owned());
    let client = connect(ForeverDb::new(config).expect("server builds")).await;

    let result = client
        .call_tool(CallToolRequestParams::new("fdb_items"))
        .await
        .expect("tool call");
    assert!(!content_text(&result).contains("fdb_super_secret"));

    let mut config = config_from(&stub);
    config.api_key = None;
    let client = connect(ForeverDb::new(config).expect("server builds")).await;
    let result = client
        .call_tool(CallToolRequestParams::new("fdb_items"))
        .await
        .expect("tool call");
    let text = content_text(&result);
    assert!(text.contains("FOREVERDB_API_KEY"), "{text}");
    assert_eq!(result.is_error, Some(true));
    client.cancel().await.expect("client stops");
}

fn config_from(stub: &Stub) -> Config {
    config(stub)
}

fn content_text(result: &rmcp::model::CallToolResult) -> String {
    result
        .content
        .iter()
        .filter_map(|content| content.as_text().map(|text| text.text.clone()))
        .collect::<Vec<_>>()
        .join("\n")
}
