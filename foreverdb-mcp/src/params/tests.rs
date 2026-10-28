use super::{Content, Items, Professions};

#[test]
fn item_id_selects_detail_and_keeps_lang() {
    let params: Items = serde_json::from_str(r#"{"id":19019,"lang":"es"}"#).expect("parses");
    let url = params.target().url("https://x.test/api/v1").expect("url");
    assert_eq!(url.path(), "/api/v1/items/19019");
    assert_eq!(url.query(), Some("lang=es"));
}

#[test]
fn item_filters_are_forwarded() {
    let params: Items =
        serde_json::from_str(r#"{"q":"thunderfury","quality":5,"minLevel":60}"#).expect("parses");
    let url = params.target().url("https://x.test/api/v1").expect("url");
    assert_eq!(url.path(), "/api/v1/items");
    let query = url.query().expect("query");
    for pair in ["q=thunderfury", "quality=5", "minLevel=60"] {
        assert!(query.contains(pair), "{query} missing {pair}");
    }
}

#[test]
fn profession_filters_apply_only_to_detail() {
    let list: Professions = serde_json::from_str(r#"{"new":true}"#).expect("parses");
    assert_eq!(
        list.target()
            .url("https://x.test/api/v1")
            .expect("url")
            .query(),
        None
    );

    let detail: Professions =
        serde_json::from_str(r#"{"slug":"alchemy","new":true}"#).expect("parses");
    assert_eq!(
        detail
            .target()
            .url("https://x.test/api/v1")
            .expect("url")
            .query(),
        Some("new=true")
    );
}

#[test]
fn content_routes_posts_articles_and_detail() {
    let posts: Content = serde_json::from_str(r#"{"kind":"posts"}"#).expect("parses");
    assert_eq!(
        posts
            .target()
            .url("https://x.test/api/v1")
            .expect("url")
            .path(),
        "/api/v1/posts"
    );

    let articles: Content = serde_json::from_str(r#"{"kind":"news"}"#).expect("parses");
    assert_eq!(
        articles
            .target()
            .url("https://x.test/api/v1")
            .expect("url")
            .query(),
        Some("type=news")
    );

    let detail: Content = serde_json::from_str(r#"{"slug":"launch"}"#).expect("parses");
    assert_eq!(
        detail
            .target()
            .url("https://x.test/api/v1")
            .expect("url")
            .path(),
        "/api/v1/articles/launch"
    );
}

#[test]
fn pagination_and_language_pass_through() {
    let params: Items =
        serde_json::from_str(r#"{"limit":50,"offset":50,"lang":"de"}"#).expect("parses");
    let url = params.target().url("https://x.test/api/v1").expect("url");
    let query = url.query().expect("query");
    for pair in ["limit=50", "offset=50", "lang=de"] {
        assert!(query.contains(pair), "{query} missing {pair}");
    }
}
