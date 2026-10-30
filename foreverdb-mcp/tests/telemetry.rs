//! The shipped binary must emit exactly one structured wide event per tool call,
//! on stderr, with stdout reserved for the protocol.

use std::io::Write;
use std::process::{Command, Stdio};

const INITIALIZE: &str = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"telemetry","version":"1"}}}"#;
const INITIALIZED: &str = r#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#;
const CALL: &str =
    r#"{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"fdb_meta","arguments":{}}}"#;

#[test]
fn binary_emits_one_wide_event_per_call() {
    // An unroutable base URL keeps the test offline; the event must still fire.
    let mut child = Command::new(env!("CARGO_BIN_EXE_foreverdb"))
        .env("FOREVERDB_API_KEY", "fdb_telemetry_test")
        .env("FOREVERDB_BASE_URL", "http://127.0.0.1:1/api/v1")
        .env("RUST_LOG", "info")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("server starts");

    {
        let stdin = child.stdin.as_mut().expect("stdin is piped");
        for line in [INITIALIZE, INITIALIZED, CALL] {
            writeln!(stdin, "{line}").expect("request is written");
        }
    }

    let output = child.wait_with_output().expect("server exits");
    let stderr = String::from_utf8_lossy(&output.stderr);
    let events: Vec<&str> = stderr
        .lines()
        .filter(|line| line.contains(r#""tool":"fdb_meta""#))
        .collect();

    assert_eq!(events.len(), 1, "expected one wide event, got: {stderr}");
    let event = events[0];
    for field in [
        r#""route":"#,
        r#""status":"#,
        r#""duration_ms":"#,
        r#""cached":"#,
        r#""upstream_status":"#,
    ] {
        assert!(event.contains(field), "missing {field}: {event}");
    }
    assert!(
        event.contains(r#""status":"network_error""#),
        "unreachable API must be reported: {event}"
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout
            .lines()
            .all(|line| line.trim_start().starts_with('{')),
        "stdout carries something other than protocol messages: {stdout}"
    );
}
