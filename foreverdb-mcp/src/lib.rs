//! MCP server exposing the ForeverDB API to LLM clients.
//!
//! The server is a thin, contract-enforcing proxy: it forwards requests to the
//! ForeverDB REST API, caches for at most the documented minute, pre-throttles
//! to the per-key rate budget, and attaches the attribution the API requires.

pub mod cache;
pub mod envelope;
pub mod params;
pub mod server;
pub mod target;
pub mod upstream;

pub use server::ForeverDb;

/// Attribution the ForeverDB API terms require wherever its data is shown.
pub const ATTRIBUTION: &str = "Data from ForeverDB.net <https://foreverdb.net>";

#[cfg(test)]
pub(crate) mod stub;
