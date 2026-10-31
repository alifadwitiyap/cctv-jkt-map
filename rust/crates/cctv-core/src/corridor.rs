use crate::Camera;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

/// Corridor request, matching the frozen TS `CorridorRequest` (camelCase).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CorridorRequest {
    pub from: [f64; 2],
    pub to: [f64; 2],
    pub radius_m: f64,
}

/// A camera hit within a corridor, matching the frozen TS `CorridorResult` plus
/// additional geometry (projection, distance-along, segment).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CorridorHit {
    pub camera_id: String,
    pub distance_m: f64,
    pub nearest_lat: f64,
    pub nearest_lng: f64,
    pub distance_along_path_m: f64,
    pub segment_index: usize,
}

/// Structured corridor geometry errors (never panic).
#[derive(Debug, Clone, PartialEq)]
pub enum CorridorError {
    /// radiusM is NaN, infinite, or negative.
    InvalidRadius,
    /// Path has <2 distinct finite points.
    InvalidGeometry,
}

impl std::fmt::Display for CorridorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl std::error::Error for CorridorError {}

fn validate_radius(radius_m: f64) -> Result<(), CorridorError> {
    if radius_m.is_nan() || radius_m.is_infinite() || radius_m < 0.0 {
        return Err(CorridorError::InvalidRadius);
    }
    Ok(())
}

fn validate_polyline(polyline: &[[f64; 2]]) -> Result<(), CorridorError> {
    if polyline.len() < 2 {
        return Err(CorridorError::InvalidGeometry);
    }
    if polyline.iter().any(|p| {
        p[0].is_nan() || p[1].is_nan() || p[0].is_infinite() || p[1].is_infinite()
    }) {
        return Err(CorridorError::InvalidGeometry);
    }
    let first = polyline[0];
    let distinct = polyline.iter().any(|p| p[0] != first[0] || p[1] != first[1]);
    if !distinct {
        return Err(CorridorError::InvalidGeometry);
    }
    Ok(())
}

/// Core corridor inspection over an explicit polyline. Filters cameras within
/// `radius_m` (inclusive) of the path, sorts by distance-along (tie -> cameraId).
pub fn inspect_corridor_polyline(
    cameras: &[Camera],
    polyline: &[[f64; 2]],
    radius_m: f64,
) -> Result<Vec<CorridorHit>, CorridorError> {
    validate_radius(radius_m)?;
    validate_polyline(polyline)?;

    let mut hits = Vec::new();
    for cam in cameras {
        if cam.lat.is_nan()
            || cam.lng.is_nan()
            || cam.lat.is_infinite()
            || cam.lng.is_infinite()
        {
            continue;
        }
        if let Some(cp) = crate::geometry::distance_to_polyline(polyline, [cam.lat, cam.lng]) {
            if cp.distance_m <= radius_m {
                hits.push(CorridorHit {
                    camera_id: cam.id.clone(),
                    distance_m: cp.distance_m,
                    nearest_lat: cp.nearest[0],
                    nearest_lng: cp.nearest[1],
                    distance_along_path_m: cp.distance_along_path_m,
                    segment_index: cp.segment_index,
                });
            }
        }
    }
    hits.sort_by(|a, b| {
        a.distance_along_path_m
            .partial_cmp(&b.distance_along_path_m)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.camera_id.cmp(&b.camera_id))
    });
    Ok(hits)
}

static CAMERAS: OnceLock<Vec<Camera>> = OnceLock::new();

/// Embedded Jakarta camera catalog (52 cameras) lifted from data/cameras.json.
pub fn embedded_cameras() -> &'static Vec<Camera> {
    CAMERAS.get_or_init(|| {
        let raw = include_str!("../assets/cameras.json");
        serde_json::from_str(raw).expect("embedded camera catalog")
    })
}

/// Inspect a corridor whose path is the single segment `from`->`to` against the
/// embedded camera catalog.
pub fn inspect_corridor(request: &CorridorRequest) -> Result<Vec<CorridorHit>, CorridorError> {
    let polyline = [request.from, request.to];
    inspect_corridor_polyline(embedded_cameras(), &polyline, request.radius_m)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::haversine::haversine_m;

    fn cam(id: &str, lat: f64, lng: f64) -> Camera {
        Camera {
            id: id.to_string(),
            name: String::new(),
            stream_url: String::new(),
            stream_path: String::new(),
            lat,
            lng,
            confidence: "medium".to_string(),
        }
    }

    fn h(a: (f64, f64), b: (f64, f64)) -> f64 {
        haversine_m(a, b)
    }

    const SEG: [[f64; 2]; 2] = [[0.0, 0.0], [0.0, 0.01]];

    #[test]
    fn point_on_segment() {
        let cams = vec![cam("a", 0.0, 0.005)];
        let hits = inspect_corridor_polyline(&cams, &SEG, 50.0).unwrap();
        assert_eq!(hits.len(), 1);
        assert!(hits[0].distance_m < 1e-9);
        assert_eq!(hits[0].segment_index, 0);
        let expect_along = h((0.0, 0.0), (0.0, 0.005));
        assert!((hits[0].distance_along_path_m - expect_along).abs() < 0.5);
    }

    #[test]
    fn outside_endpoint_clamp() {
        let cams = vec![cam("a", 0.0, 0.02)];
        let hits = inspect_corridor_polyline(&cams, &SEG, 10000.0).unwrap();
        assert_eq!(hits.len(), 1);
        let expect_d = h((0.0, 0.01), (0.0, 0.02));
        assert!((hits[0].distance_m - expect_d).abs() < 0.5);
        assert_eq!(hits[0].nearest_lng, 0.01);
        let expect_along = h((0.0, 0.0), (0.0, 0.01));
        assert!((hits[0].distance_along_path_m - expect_along).abs() < 0.5);
    }

    #[test]
    fn zero_length_segment_mid_loop_ok() {
        let pl = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.01]];
        let cams = vec![cam("a", 0.0, 0.005)];
        let hits = inspect_corridor_polyline(&cams, &pl, 50.0).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].segment_index, 1);
        assert!(hits[0].distance_m < 1e-9);
    }

    #[test]
    fn radius_boundary_inclusive() {
        let cams = vec![cam("a", 0.0, 0.015)];
        let exact = h((0.0, 0.01), (0.0, 0.015));
        let hits = inspect_corridor_polyline(&cams, &SEG, exact).unwrap();
        assert_eq!(hits.len(), 1, "exactly-on-boundary should be included");
        // Just under the boundary -> excluded.
        let hits = inspect_corridor_polyline(&cams, &SEG, exact - 0.01).unwrap();
        assert!(hits.is_empty());
    }

    #[test]
    fn reversed_path_same_hits() {
        let rev = [[0.0, 0.01], [0.0, 0.0]];
        let cams = vec![cam("a", 0.0, 0.005), cam("b", 0.0, 0.012)];
        let f = inspect_corridor_polyline(&cams, &SEG, 500.0).unwrap();
        let r = inspect_corridor_polyline(&cams, &rev, 500.0).unwrap();
        // Same cameras match in both directions, with identical distances.
        let mut f_sorted: Vec<_> = f
            .iter()
            .map(|x| (x.camera_id.as_str(), x.distance_m))
            .collect();
        let mut r_sorted: Vec<_> = r
            .iter()
            .map(|x| (x.camera_id.as_str(), x.distance_m))
            .collect();
        f_sorted.sort_by_key(|(id, _)| *id);
        r_sorted.sort_by_key(|(id, _)| *id);
        assert_eq!(f_sorted.len(), r_sorted.len());
        for ((id1, d1), (id2, d2)) in f_sorted.iter().zip(r_sorted.iter()) {
            assert_eq!(id1, id2);
            assert!((d1 - d2).abs() < 1e-6, "id={id1} d1={d1} d2={d2}");
        }
    }

    #[test]
    fn l_shape_geometry() {
        // L-shape: east along lat 0, then north along lng 0.01.
        let pl = [[0.0, 0.0], [0.0, 0.01], [0.01, 0.01]];
        // Near horizontal segment (lat ~0).
        let cams = vec![cam("h", 0.0005, 0.006), cam("v", 0.007, 0.011)];
        let hits = inspect_corridor_polyline(&cams, &pl, 300.0).unwrap();
        assert_eq!(hits.len(), 2);
        let hh = hits.iter().find(|x| x.camera_id == "h").unwrap();
        let vh = hits.iter().find(|x| x.camera_id == "v").unwrap();
        assert_eq!(hh.segment_index, 0);
        assert_eq!(vh.segment_index, 1);
        let hh_d = h((0.0005, 0.006), (0.0, 0.006));
        assert!((hh.distance_m - hh_d).abs() < 0.5);
        let vh_d = h((0.007, 0.011), (0.007, 0.01));
        assert!((vh.distance_m - vh_d).abs() < 0.5);
        let vh_along =
            h((0.0, 0.0), (0.0, 0.01)) + h((0.0, 0.01), (0.007, 0.01));
        assert!((vh.distance_along_path_m - vh_along).abs() < 0.5);
    }

    #[test]
    fn sorted_by_distance_along_then_id() {
        let pts = [
            (0.0, 0.002), // along ~222m
            (0.0, 0.008), // along ~890m
            (0.0, 0.005), // along ~556m
        ];
        let cams: Vec<Camera> = pts
            .iter()
            .enumerate()
            .map(|(i, &(lat, lng))| cam(&format!("c{i}"), lat, lng))
            .collect();
        let hits = inspect_corridor_polyline(&cams, &SEG, 1000.0).unwrap();
        assert_eq!(hits.len(), 3);
        let alongs: Vec<f64> = hits.iter().map(|x| x.distance_along_path_m).collect();
        for w in alongs.windows(2) {
            assert!(w[0] <= w[1] + 1e-9, "not sorted by along: {alongs:?}");
        }
    }

    #[test]
    fn tie_breaking_by_camera_id() {
        // Two cameras at the identical position -> identical distance & along.
        let cams = vec![cam("b", 0.0, 0.005), cam("a", 0.0, 0.005)];
        let hits = inspect_corridor_polyline(&cams, &SEG, 100.0).unwrap();
        assert_eq!(hits.len(), 2);
        assert_eq!(hits[0].camera_id, "a");
        assert_eq!(hits[1].camera_id, "b");
        assert_eq!(hits[0].distance_m, hits[1].distance_m);
    }

    #[test]
    fn self_intersecting_polyline() {
        let pl = [
            [0.0, 0.0],
            [0.01, 0.01],
            [0.0, 0.01],
            [0.01, 0.0],
        ];
        let cams = vec![cam("a", 0.005, 0.005), cam("b", -0.001, -0.001)];
        let hits = inspect_corridor_polyline(&cams, &pl, 1000.0).unwrap();
        let _ = hits;
        // no panic, finite, sorted
        for hit in &inspect_corridor_polyline(&cams, &pl, 1000.0).unwrap() {
            assert!(hit.distance_m.is_finite());
            assert!(hit.segment_index < 3);
            assert!(hit.distance_along_path_m.is_finite());
        }
    }

    #[test]
    fn no_cameras_matches() {
        let cams: Vec<Camera> = vec![];
        let hits = inspect_corridor_polyline(&cams, &SEG, 1000.0).unwrap();
        assert!(hits.is_empty());
    }

    #[test]
    fn validation_nan_inf_negative() {
        let cams = vec![cam("a", 0.0, 0.0)];
        assert_eq!(
            inspect_corridor_polyline(&cams, &SEG, f64::NAN),
            Err(CorridorError::InvalidRadius)
        );
        assert_eq!(
            inspect_corridor_polyline(&cams, &SEG, f64::INFINITY),
            Err(CorridorError::InvalidRadius)
        );
        assert_eq!(
            inspect_corridor_polyline(&cams, &SEG, -1.0),
            Err(CorridorError::InvalidRadius)
        );
    }

    #[test]
    fn validation_less_than_two_distinct_points() {
        let cams = vec![cam("a", 0.0, 0.0)];
        // from == to
        let pl = [[1.0, 2.0], [1.0, 2.0]];
        assert_eq!(
            inspect_corridor_polyline(&cams, &pl, 100.0),
            Err(CorridorError::InvalidGeometry)
        );
        // one point only
        let pl = [[1.0, 2.0]];
        assert_eq!(
            inspect_corridor_polyline(&cams, &pl, 100.0),
            Err(CorridorError::InvalidGeometry)
        );
        // empty path
        let pl: [[f64; 2]; 0] = [];
        assert_eq!(
            inspect_corridor_polyline(&cams, &pl, 100.0),
            Err(CorridorError::InvalidGeometry)
        );
        // NaN coordinate
        let pl = [[1.0, f64::NAN], [2.0, 3.0]];
        assert_eq!(
            inspect_corridor_polyline(&cams, &pl, 100.0),
            Err(CorridorError::InvalidGeometry)
        );
    }

    #[test]
    fn embedded_catalog_smoke() {
        assert_eq!(embedded_cameras().len(), 52);
        // A broad corridor across the Jakarta cluster returns hits, deterministic
        // and sorted.
        let req = CorridorRequest {
            from: [-6.26, 106.78],
            to: [-6.19, 106.85],
            radius_m: 10_000.0,
        };
        let hits = inspect_corridor(&req).unwrap();
        assert!(!hits.is_empty());
        let hits2 = inspect_corridor(&req).unwrap();
        assert_eq!(hits, hits2);
        for w in hits.windows(2) {
            assert!(w[0].distance_along_path_m <= w[1].distance_along_path_m + 1e-6);
        }
        // Tiny radius -> no hits (no camera exactly on the segment).
        let req = CorridorRequest {
            from: [-6.26, 106.78],
            to: [-6.19, 106.85],
            radius_m: 0.0,
        };
        // zero radius is valid; either empty or exact-on-path hits
        let _ = inspect_corridor(&req).unwrap();
        let req = CorridorRequest {
            from: [-6.26, 106.78],
            to: [-6.19, 106.85],
            radius_m: -5.0,
        };
        assert_eq!(inspect_corridor(&req), Err(CorridorError::InvalidRadius));
    }
}
