use std::process::ExitCode;

use foreverdb_mcp::ForeverDb;
use rmcp::ServiceExt;
use rmcp::transport::stdio;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> ExitCode {
    // MCP owns stdout: every log line goes to stderr, and no code logs the key.
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_env_filter(EnvFilter::from_default_env())
        .with_ansi(false)
        .init();

    let server = match ForeverDb::from_env() {
        Ok(server) => server,
        Err(error) => {
            eprintln!("foreverdb: {error}");
            return ExitCode::FAILURE;
        }
    };
    if std::env::var("FOREVERDB_API_KEY").is_err() {
        eprintln!(
            "foreverdb: FOREVERDB_API_KEY is not set; tool calls will report it until it is."
        );
    }

    match server.serve(stdio()).await {
        Ok(running) => {
            let _ = running.waiting().await;
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("foreverdb: serve failed: {error}");
            ExitCode::FAILURE
        }
    }
}
