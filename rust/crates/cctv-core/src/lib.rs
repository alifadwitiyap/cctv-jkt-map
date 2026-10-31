mod cluster;
mod corridor;
mod ease;
mod geometry;
mod haversine;
mod parse;

pub use cluster::Cluster;
pub use corridor::{
    CorridorError, CorridorHit, CorridorRequest, embedded_cameras, inspect_corridor_polyline,
};
pub use ease::EaseKind;
pub use geometry::ClosestPoint;

use serde::{Deserialize, Serialize};

/// A surveillance camera / marker. Serde uses camelCase to match the frozen
/// TypeScript contract (`web/src/lib/wasm/contracts.ts`).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Camera {
    pub id: String,
    pub name: String,
    pub stream_url: String,
    pub stream_path: String,
    pub lat: f64,
    pub lng: f64,
    pub confidence: String,
}

pub type ParsedCamera = Camera;

use wasm_bindgen::prelude::*;

/// Placeholder version export.
#[wasm_bindgen]
pub fn version() -> String {
    "0.1.0".into()
}

#[wasm_bindgen]
pub fn parse_catalog(html: &str) -> JsValue {
    let parsed = parse::parse_catalog(html);
    serde_wasm_bindgen::to_value(&parsed).unwrap_or(JsValue::UNDEFINED)
}

#[wasm_bindgen]
pub fn haversine_m(a: JsValue, b: JsValue) -> f64 {
    let a: [f64; 2] = serde_wasm_bindgen::from_value(a).unwrap_or([0.0, 0.0]);
    let b: [f64; 2] = serde_wasm_bindgen::from_value(b).unwrap_or([0.0, 0.0]);
    haversine::haversine_m((a[0], a[1]), (b[0], b[1]))
}

#[wasm_bindgen]
pub fn cluster_markers(input: JsValue, zoom: f64) -> JsValue {
    let markers: Vec<Camera> = serde_wasm_bindgen::from_value(input).unwrap_or_default();
    let clusters = cluster::cluster_markers(&markers, zoom);
    serde_wasm_bindgen::to_value(&clusters).unwrap_or(JsValue::UNDEFINED)
}

#[wasm_bindgen]
pub fn ease(t: f64, kind: u8) -> f64 {
    ease::ease(t, EaseKind::from_u8(kind))
}

#[wasm_bindgen]
pub fn inspect_corridor(input: JsValue) -> Result<JsValue, JsValue> {
    let request: corridor::CorridorRequest =
        serde_wasm_bindgen::from_value(input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let hits = corridor::inspect_corridor(&request)
        .map_err(|e| JsValue::from_str(&format!("{}", e)))?;
    serde_wasm_bindgen::to_value(&hits).map_err(|e| JsValue::from_str(&e.to_string()))
}
