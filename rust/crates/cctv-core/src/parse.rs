use crate::Camera;

const IFRAME_BASE: &str = "https://dki-jkt.balitower.co.id:7028/";
const EMBED_SUFFIX: &str = "/embed.html\"";
const TITLE_OPEN: &str = "<div class=\"title\">";
const TITLE_CLOSE: &str = "</div>";

/// Parse the catalog HTML `data` endpoint into cameras. Each card yields an
/// iframe with `src="https://dki-jkt.balitower.co.id:7028/<streamName>/embed.html"`
/// and a `<div class="title">NAME</div>` title. Pairs streamPath with title by
/// order, truncating to the shorter collection, and emits deterministic ids.
pub fn parse_catalog(html: &str) -> Vec<Camera> {
    let streams = extract_streams(html);
    let titles = extract_titles(html);
    let n = streams.len().min(titles.len());
    let mut out = Vec::with_capacity(n);
    for i in 0..n {
        out.push(Camera {
            id: format!("cam_{:03}", i),
            name: titles[i].clone(),
            stream_url: format!("{}{}/embed.html", IFRAME_BASE, streams[i]),
            stream_path: streams[i].clone(),
            lat: 0.0,
            lng: 0.0,
            confidence: "medium".to_string(),
        });
    }
    out
}

fn extract_streams(html: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut rest = html;
    while let Some(pos) = rest.find(IFRAME_BASE) {
        let after = &rest[pos + IFRAME_BASE.len()..];
        match after.find(EMBED_SUFFIX) {
            Some(end) => {
                out.push(after[..end].to_string());
                rest = &after[end + EMBED_SUFFIX.len()..];
            }
            None => break,
        }
    }
    out
}

fn extract_titles(html: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut rest = html;
    while let Some(pos) = rest.find(TITLE_OPEN) {
        let after = &rest[pos + TITLE_OPEN.len()..];
        match after.find(TITLE_CLOSE) {
            Some(end) => {
                out.push(after[..end].trim().to_string());
                rest = &after[end + TITLE_CLOSE.len()..];
            }
            None => break,
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_html() -> String {
        format!(
            "<html><body>\
             <div class=\"card\">\
             <div class=\"title\">  Taman Literasi-C01  </div>\
             <iframe src=\"{}501478_JKS_SATPOLPP_TAMAN-LITERASI-C01_CCTV-01/embed.html\"></iframe>\
             </div>\
             <div class=\"card\">\
             <div class=\"title\">Simpang Jl. Panglima Polim-C01</div>\
             <iframe src=\"{}501493_JKP_SATPOLPP_PASAR-TANAH-ABANG-C02_CCTV-02/embed.html\"></iframe>\
             </div>\
             <div class=\"card\">\
             <div class=\"title\">Some Event Place</div>\
             <iframe src=\"{}502111_JKT_PEMDA_PROV-DKI-JAKARTA-DKI-JAKARTA_001/embed.html\"></iframe>\
             </div>\
             </body></html>",
            IFRAME_BASE, IFRAME_BASE, IFRAME_BASE
        )
    }

    #[test]
    fn parses_known_cards() {
        let out = parse_catalog(&sample_html());
        assert_eq!(out.len(), 3);
        assert_eq!(out[0].name, "Taman Literasi-C01");
        assert_eq!(
            out[0].stream_path,
            "501478_JKS_SATPOLPP_TAMAN-LITERASI-C01_CCTV-01"
        );
        assert_eq!(
            out[0].stream_url,
            "https://dki-jkt.balitower.co.id:7028/501478_JKS_SATPOLPP_TAMAN-LITERASI-C01_CCTV-01/embed.html"
        );
        assert!(out[0].id.starts_with("cam_"));
        assert_eq!(out[2].name, "Some Event Place");
        assert_eq!(out[2].stream_path, "502111_JKT_PEMDA_PROV-DKI-JAKARTA-DKI-JAKARTA_001");
    }

    #[test]
    fn new_mismatch_truncates() {
        let html = format!(
            "<div class=\"title\">OnlyTitle</div>\
             <iframe src=\"{}s1/embed.html\"></iframe>\
             <iframe src=\"{}s2/embed.html\"></iframe>",
            IFRAME_BASE, IFRAME_BASE
        );
        let out = parse_catalog(&html);
        // 1 title, 2 streams -> 1 camera.
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].name, "OnlyTitle");
        assert_eq!(out[0].stream_path, "s1");
    }

    #[test]
    fn empty_html() {
        assert!(parse_catalog("").is_empty());
        assert!(parse_catalog("<html></html>").is_empty());
    }

    #[test]
    fn titles_are_trimmed() {
        let out = parse_catalog(&sample_html());
        assert_eq!(out[0].name, "Taman Literasi-C01");
        assert!(!out[0].name.starts_with(' '));
        assert!(!out[0].name.ends_with(' '));
    }

    #[test]
    fn non_matching_content_ignored() {
        let html = "<p>no cameras here</p><div class=\"title\">not a camera</div>";
        assert!(parse_catalog(html).is_empty());
    }

    #[test]
    fn deterministic_ids() {
        assert_eq!(parse_catalog(&sample_html())[0].id, parse_catalog(&sample_html())[0].id);
    }
}
