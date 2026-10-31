use crate::Camera;
use serde::{Deserialize, Serialize};

/// Result of grid clustering, matching the frozen TS `ClusterResult`.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cluster {
    pub count: usize,
    pub lat: f64,
    pub lng: f64,
    pub cameras: Vec<String>,
}

/// Grid cell size in degrees at a given zoom. Cell size halves per zoom level:
/// `180 / 2^zoom`.
pub fn cell_deg_for_zoom(zoom: f64) -> f64 {
    180.0 / f64::powf(2.0, zoom)
}

/// Simple grid clustering. Assigns each marker to a cell based on `zoom`,
/// returns one cluster per non-empty cell with centroid + member ids.
pub fn cluster_markers(cameras: &[Camera], zoom: f64) -> Vec<Cluster> {
    use std::collections::BTreeMap;
    use std::cmp::Ordering;

    if cameras.is_empty() {
        return Vec::new();
    }
    let cell = cell_deg_for_zoom(zoom);
    let mut grid: BTreeMap<(i64, i64), Vec<usize>> = BTreeMap::new();
    for (idx, c) in cameras.iter().enumerate() {
        let gx = (c.lng / cell).floor() as i64;
        let gy = (c.lat / cell).floor() as i64;
        grid.entry((gx, gy)).or_default().push(idx);
    }
    let mut clusters: Vec<Cluster> = grid
        .values()
        .map(|members| {
            let n = members.len();
            let lat = members.iter().map(|&i| cameras[i].lat).sum::<f64>() / n as f64;
            let lng = members.iter().map(|&i| cameras[i].lng).sum::<f64>() / n as f64;
            let mut cameras: Vec<String> = members.iter().map(|&i| cameras[i].id.clone()).collect();
            cameras.sort();
            Cluster {
                count: n,
                lat,
                lng,
                cameras,
            }
        })
        .collect();
    clusters.sort_by(|a, b| {
        a.lng
            .partial_cmp(&b.lng)
            .unwrap_or(Ordering::Equal)
            .then_with(|| a.lat.partial_cmp(&b.lat).unwrap_or(Ordering::Equal))
    });
    clusters
}

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn empty_input() {
        assert!(cluster_markers(&[], 5.0).is_empty());
    }

    #[test]
    fn single_camera() {
        let out = cluster_markers(&[cam("a", -6.2435, 106.7989)], 8.0);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].count, 1);
        assert_eq!(out[0].lat, -6.2435);
        assert_eq!(out[0].lng, 106.7989);
        assert_eq!(out[0].cameras, vec!["a".to_string()]);
    }

    #[test]
    fn two_near_cameras_one_cluster_at_low_zoom() {
        // 0.05 deg apart. At zoom 11 cell=0.0879 -> same cell.
        let cams = vec![cam("a", 0.0, 0.0), cam("b", 0.0, 0.05)];
        let out = cluster_markers(&cams, 11.0);
        assert_eq!(out.len(), 1, "out={out:?}");
        assert_eq!(out[0].count, 2);
        assert!((out[0].lat - 0.0).abs() < 1e-12);
        assert!((out[0].lng - 0.025).abs() < 1e-12);
        assert_eq!(out[0].cameras, vec!["a".to_string(), "b".to_string()]);
    }

    #[test]
    fn two_near_cameras_split_at_high_zoom() {
        // At zoom 15 cell=0.00549 -> two cells.
        let cams = vec![cam("a", 0.0, 0.0), cam("b", 0.0, 0.05)];
        let out = cluster_markers(&cams, 15.0);
        assert_eq!(out.len(), 2, "out={out:?}");
        let counts: Vec<usize> = out.iter().map(|c| c.count).collect();
        assert_eq!(counts, vec![1, 1]);
        // All member ids preserved exactly once.
        let ids: Vec<String> = out.iter().flat_map(|c| c.cameras.clone()).collect();
        assert_eq!(ids, vec!["a".to_string(), "b".to_string()]);
    }

    #[test]
    fn cell_boundary_deterministic() {
        // Place two cameras exactly one cell apart -> separate clusters even
        // though geographically adjacent. zoom=4 => cell=11.25 deg.
        let cams = vec![cam("a", 0.0, 0.0), cam("b", 0.0, 11.25)];
        let out = cluster_markers(&cams, 4.0);
        assert_eq!(out.len(), 2, "out={out:?}");
    }

    #[test]
    fn centroid_is_mean() {
        let cams = vec![
            cam("a", -6.2435, 106.7989),
            cam("b", -6.2458, 106.798),
            cam("c", -6.19, 106.84),
        ];
        let out = cluster_markers(&cams, 0.0); // cell=180 everything together
        assert_eq!(out.len(), 1);
        let lats: f64 = cams.iter().map(|c| c.lat).sum();
        let lngs: f64 = cams.iter().map(|c| c.lng).sum();
        assert!((out[0].lat - lats / 3.0).abs() < 1e-12);
        assert!((out[0].lng - lngs / 3.0).abs() < 1e-12);
        assert_eq!(out[0].count, 3);
        assert_eq!(out[0].cameras.len(), 3);
    }

    #[test]
    fn deterministic_order_out_of_order_input() {
        let cams = vec![cam("b", 0.0, 0.2), cam("a", 0.0, 0.1)];
        let a = cluster_markers(&cams, 9.0);
        let b = cluster_markers(&cams, 9.0);
        assert_eq!(a, b);
    }
}
