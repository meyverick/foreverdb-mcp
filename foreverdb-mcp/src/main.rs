use std::process::ExitCode;

use foreverdb_mcp::ForeverDb;
use rmcp::ServiceExt;
use rmcp::transport::stdio;
use tracing_subscriber::EnvFilter;

const HELP: &str = "\
foreverdb - ForeverDB MCP server

Usage:
  foreverdb                  run the MCP server over stdio
  foreverdb --version, -V    print the version
  foreverdb --help, -h       print this help

Environment:
  FOREVERDB_API_KEY    ForeverDB API key (required). Ask for one at
                       https://foreverdb.net/join?next=%2Fdevelopers
  FOREVERDB_BASE_URL   API root; for tests only
  RUST_LOG             log filter. Logs always go to stderr.

Point your MCP client at the absolute path of this binary, because GUI
clients do not inherit your shell PATH:

  {
    \"mcpServers\": {
      \"foreverdb\": {
        \"command\": \"/absolute/path/to/foreverdb\",
        \"env\": { \"FOREVERDB_API_KEY\": \"fdb_your-key\" }
      }
    }
  }

Credit ForeverDB.net with a link to https://foreverdb.net wherever you show
its data; the API revokes keys used without credit.
";

#[tokio::main]
async fn main() -> ExitCode {
    let mut args = std::env::args().skip(1);
    match args.next().as_deref() {
        Some("--version" | "-V") => {
            println!("foreverdb {}", env!("CARGO_PKG_VERSION"));
            return ExitCode::SUCCESS;
        }
        Some("--help" | "-h") => {
            print!("{HELP}");
            return ExitCode::SUCCESS;
        }
        Some(other) => {
            eprintln!("foreverdb: unknown argument '{other}' (try --help)");
            return ExitCode::FAILURE;
        }
        None => {}
    }

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
