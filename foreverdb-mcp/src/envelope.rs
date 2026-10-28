//! Upstream failure classification and the structured codes tools return.

use serde::Deserialize;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UpstreamError {
    /// No API key configured; no request was attempted.
    MissingKey,
    /// The request exceeded the configured timeout.
    Timeout,
    /// The request failed before a response arrived.
    Network(String),
    /// The API answered with its own structured error document.
    Api { code: String, message: String },
    /// The API answered with an HTTP status only.
    Status(u16),
}

#[derive(Deserialize)]
struct ErrorBody {
    error: ErrorDetail,
}

#[derive(Deserialize)]
struct ErrorDetail {
    code: String,
    message: String,
}

/// Parses the API's `{"error": {"code", "message"}}` document.
pub fn api_error(body: &str) -> Option<(String, String)> {
    serde_json::from_str::<ErrorBody>(body)
        .ok()
        .map(|body| (body.error.code, body.error.message))
}

impl UpstreamError {
    /// Classifies a non-success response. Server errors win over a body code so
    /// a transient 5xx is reported as an upstream failure, not as client input.
    pub fn classify(status: u16, retry_after: Option<u64>, body: &str) -> Self {
        if status >= 500 {
            return UpstreamError::Status(status);
        }
        if let Some((code, message)) = api_error(body) {
            return UpstreamError::Api { code, message };
        }
        if status == 429 {
            return UpstreamError::Api {
                code: "rate_limit".to_owned(),
                message: match retry_after {
                    Some(seconds) => format!("Slow down: retry after {seconds}s."),
                    None => "Slow down: the key's request budget is spent.".to_owned(),
                },
            };
        }
        UpstreamError::Status(status)
    }

    pub fn code(&self) -> &str {
        match self {
            UpstreamError::MissingKey => "missing_api_key",
            UpstreamError::Timeout => "timeout",
            UpstreamError::Network(_) => "network_error",
            UpstreamError::Api { code, .. } => code,
            UpstreamError::Status(500..=599) => "upstream_unavailable",
            UpstreamError::Status(_) => "upstream_error",
        }
    }

    pub fn message(&self) -> String {
        match self {
            UpstreamError::MissingKey => {
                "FOREVERDB_API_KEY is not set; set it to a ForeverDB API key and restart the server."
                    .to_owned()
            }
            UpstreamError::Timeout => "The ForeverDB API did not answer within the request timeout.".to_owned(),
            UpstreamError::Network(detail) => format!("Could not reach the ForeverDB API: {detail}"),
            UpstreamError::Api { message, .. } => message.clone(),
            UpstreamError::Status(status) => {
                format!("The ForeverDB API answered HTTP {status}.")
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{UpstreamError, UpstreamError as E, api_error};

    #[test]
    fn upstream_document_is_preserved() {
        let error = E::classify(
            429,
            Some(2),
            r#"{"error":{"code":"rate_limit","message":"Slow down: this key allows 60 requests a minute."}}"#,
        );
        assert_eq!(
            error,
            UpstreamError::Api {
                code: "rate_limit".to_owned(),
                message: "Slow down: this key allows 60 requests a minute.".to_owned(),
            }
        );
        assert_eq!(error.code(), "rate_limit");
    }

    #[test]
    fn server_error_wins_over_body_code() {
        let error = E::classify(
            500,
            None,
            r#"{"error":{"code":"rate_limit","message":"x"}}"#,
        );
        assert_eq!(error.code(), "upstream_unavailable");
    }

    #[test]
    fn non_json_body_still_maps_to_a_code() {
        let error = E::classify(429, Some(7), "nope");
        assert_eq!(error.code(), "rate_limit");
        assert!(error.message().contains('7'));
    }

    #[test]
    fn missing_error_document_is_none() {
        assert!(api_error("{}").is_none());
    }
}
