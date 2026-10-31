/// Result of projecting a point onto a polyline.
#[derive(Clone, Copy, Debug)]
pub struct ClosestPoint {
    /// Geodesic (haversine) distance from the point to the polyline, meters.
    pub distance_m: f64,
    /// (lat, lng) of the nearest point on the polyline.
    pub nearest: [f64; 2],
    /// Distance along the polyline from its start to the nearest point, meters.
    pub distance_along_path_m: f64,
    /// Index of the segment containing the nearest point.
    pub segment_index: usize,
}

/// Projection uses a local equirectangular frame (longitude scaled by cos of the
/// polyline's mean latitude), which is consistent with spherical haversine
/// distances for the short segments typical of map corridors. All reported
/// distances are geodesic via `haversine_m`.
pub fn distance_to_polyline(polyline: &[[f64; 2]], point: [f64; 2]) -> Option<ClosestPoint> {
    if polyline.is_empty() {
        return None;
    }
    // Single point: closest is that point itself.
    if polyline.len() == 1 {
        let d = crate::haversine::haversine_m(
            (point[0], point[1]),
            (polyline[0][0], polyline[0][1]),
        );
        return Some(ClosestPoint {
            distance_m: d,
            nearest: polyline[0],
            distance_along_path_m: d,
            segment_index: 0,
        });
    }

    let ref_lat_rad = polyline.iter().map(|p| p[0]).sum::<f64>() / polyline.len() as f64;
    let ref_lat_rad = ref_lat_rad.to_radians();
    let scale = |lat_rad: f64| {
        let c = lat_rad.cos();
        if c.abs() < 1e-9 {
            1.0
        } else {
            c
        }
    };
    let to_planar =
        |p: [f64; 2], ref_lat: f64| -> (f64, f64) {
            (p[1].to_radians() * scale(ref_lat), p[0].to_radians())
        };
    let from_planar = |x: f64, y: f64, ref_lat: f64| -> [f64; 2] {
        [y.to_degrees(), (x / scale(ref_lat)).to_degrees()]
    };

    let pp = to_planar(point, ref_lat_rad);
    let mut best: Option<ClosestPoint> = None;
    let mut cum = 0.0_f64;

    for i in 0..polyline.len() - 1 {
        let a = polyline[i];
        let b = polyline[i + 1];
        let pa = to_planar(a, ref_lat_rad);
        let pb = to_planar(b, ref_lat_rad);
        let abx = pb.0 - pa.0;
        let aby = pb.1 - pa.1;
        let len2 = abx * abx + aby * aby;
        let t = if len2 > 0.0 {
            (((pp.0 - pa.0) * abx + (pp.1 - pa.1) * aby) / len2).clamp(0.0, 1.0)
        } else {
            0.0
        };
        let nearest = from_planar(pa.0 + t * abx, pa.1 + t * aby, ref_lat_rad);
        let dist = crate::haversine::haversine_m(
            (point[0], point[1]),
            (nearest[0], nearest[1]),
        );
        let partial = if t > 0.0 {
            crate::haversine::haversine_m((a[0], a[1]), (nearest[0], nearest[1]))
        } else {
            0.0
        };
        let along = cum + partial;
        cum += crate::haversine::haversine_m((a[0], a[1]), (b[0], b[1]));
        let better = match &best {
            Some(cur) => dist < cur.distance_m,
            None => true,
        };
        if better {
            best = Some(ClosestPoint {
                distance_m: dist,
                nearest,
                distance_along_path_m: along,
                segment_index: i,
            });
        }
    }
    best
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Reference haversine for expectations.
    fn h(a: (f64, f64), b: (f64, f64)) -> f64 {
        crate::haversine::haversine_m(a, b)
    }

    #[test]
    fn point_on_segment() {
        let pl = [[0.0, 0.0], [0.0, 0.01]];
        let cp = distance_to_polyline(&pl, [0.0, 0.005]).unwrap();
        assert!(cp.distance_m < 1e-9, "d={}", cp.distance_m);
        assert_eq!(cp.segment_index, 0);
        let expect_along = h((0.0, 0.0), (0.0, 0.005));
        assert!((cp.distance_along_path_m - expect_along).abs() < 0.5);
    }

    #[test]
    fn clamp_past_endpoint() {
        let pl = [[0.0, 0.0], [0.0, 0.01]];
        let cp = distance_to_polyline(&pl, [0.0, 0.02]).unwrap();
        let expect_d = h((0.0, 0.01), (0.0, 0.02));
        assert!((cp.distance_m - expect_d).abs() < 0.5);
        assert_eq!(cp.nearest, [0.0, 0.01]);
        let expect_along = h((0.0, 0.0), (0.0, 0.01));
        assert!((cp.distance_along_path_m - expect_along).abs() < 0.5);
    }

    #[test]
    fn clamp_before_startpoint() {
        let pl = [[0.0, 0.0], [0.0, 0.01]];
        let cp = distance_to_polyline(&pl, [0.0, -0.01]).unwrap();
        let expect_d = h((0.0, 0.0), (0.0, -0.01));
        assert!((cp.distance_m - expect_d).abs() < 0.5);
        assert_eq!(cp.nearest, [0.0, 0.0]);
        assert_eq!(cp.distance_along_path_m, 0.0);
    }

    #[test]
    fn l_shape_horizontal_projection() {
        let pl = [[0.0, 0.0], [0.01, 0.0], [0.01, 0.01]];
        let cp = distance_to_polyline(&pl, [0.008, 0.001]).unwrap();
        assert_eq!(cp.segment_index, 0);
        let expect_d = h((0.008, 0.001), (0.008, 0.0));
        assert!((cp.distance_m - expect_d).abs() < 0.5, "d={}", cp.distance_m);
        let expect_along = h((0.0, 0.0), (0.008, 0.0));
        assert!((cp.distance_along_path_m - expect_along).abs() < 0.5);
    }

    #[test]
    fn l_shape_vertical_projection() {
        let pl = [[0.0, 0.0], [0.01, 0.0], [0.01, 0.01]];
        let cp = distance_to_polyline(&pl, [0.011, 0.006]).unwrap();
        assert_eq!(cp.segment_index, 1);
        let expect_d = h((0.011, 0.006), (0.01, 0.006));
        assert!((cp.distance_m - expect_d).abs() < 0.5);
        let expect_along = h((0.0, 0.0), (0.01, 0.0))
            + h((0.01, 0.0), (0.01, 0.006));
        assert!((cp.distance_along_path_m - expect_along).abs() < 0.5);
    }

    #[test]
    fn zero_length_segment_within_polyline() {
        let pl = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.01]];
        let cp = distance_to_polyline(&pl, [0.0, 0.005]).unwrap();
        assert!(cp.distance_m < 1e-9);
        // Nearest non-degenerate segment is index 1.
        assert_eq!(cp.segment_index, 1);
        let expect_along = h((0.0, 0.0), (0.0, 0.005));
        assert!((cp.distance_along_path_m - expect_along).abs() < 0.5);
    }

    #[test]
    fn degenerate_single_point_polyline() {
        let cp = distance_to_polyline(&[[0.0, 0.0]], [0.0, 0.005]).unwrap();
        let expect = h((0.0, 0.0), (0.0, 0.005));
        assert!((cp.distance_m - expect).abs() < 0.5);
        assert_eq!(cp.segment_index, 0);
    }

    #[test]
    fn empty_polyline() {
        assert!(distance_to_polyline(&[], [0.0, 0.0]).is_none());
    }

    #[test]
    fn self_intersecting_polyline_does_not_panic() {
        let pl = [
            [0.0, 0.0],
            [0.01, 0.01],
            [0.0, 0.01],
            [0.01, 0.0],
        ];
        for pt in [[0.005, 0.005], [0.0, 0.0], [0.01, 0.01], [0.02, 0.005]] {
            let cp = distance_to_polyline(&pl, pt).expect("non-empty");
            assert!(cp.distance_m >= 0.0 && cp.distance_m.is_finite());
            assert!(cp.segment_index < pl.len() - 1);
            assert!(cp.distance_along_path_m >= 0.0);
        }
    }

    #[test]
    fn reversed_path_same_distance() {
        let fwd = [[0.0, 0.0], [0.0, 0.01]];
        let rev = [[0.0, 0.01], [0.0, 0.0]];
        let p = [0.0, 0.005];
        let a = distance_to_polyline(&fwd, p).unwrap();
        let b = distance_to_polyline(&rev, p).unwrap();
        assert!((a.distance_m - b.distance_m).abs() < 1e-6);
        // Midpoint distance-along is symmetric.
        assert!((a.distance_along_path_m - b.distance_along_path_m).abs() < 0.5);
        assert_eq!(a.nearest, b.nearest);
    }
}
