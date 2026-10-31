/// Haversine distance between two geographic points in meters.
/// Inputs are (lat, lng) in decimal degrees. Sphere radius 6371000 m.
pub fn haversine_m(a: (f64, f64), b: (f64, f64)) -> f64 {
    const EARTH_RADIUS_M: f64 = 6_371_000.0;
    let (la1, lo1) = (a.0.to_radians(), a.1.to_radians());
    let (la2, lo2) = (b.0.to_radians(), b.1.to_radians());
    let d_lat = la2 - la1;
    let d_lng = lo2 - lo1;
    let s = (d_lat / 2.0).sin().powi(2)
        + la1.cos() * la2.cos() * (d_lng / 2.0).sin().powi(2);
    2.0 * EARTH_RADIUS_M * s.sqrt().asin()
}

#[cfg(test)]
mod tests {
    use super::*;

    const EARTH_R: f64 = 6371000.0;

    fn rad(d: f64) -> f64 {
        d.to_radians()
    }

    /// Reference haversine (independent of the impl under test).
    fn ref_haversine(a: (f64, f64), b: (f64, f64)) -> f64 {
        let (d_lat, d_lng) = (rad(b.0 - a.0), rad(b.1 - a.1));
        let s = (d_lat / 2.0).sin().powi(2)
            + rad(a.0).cos() * rad(b.0).cos() * (d_lng / 2.0).sin().powi(2);
        2.0 * EARTH_R * s.sqrt().asin()
    }

    #[test]
    fn zero_distance() {
        let a = (-6.2435, 106.7989);
        assert_eq!(haversine_m(a, a), 0.0);
    }

    #[test]
    fn known_equator_arc() {
        // 1 degree along the equator ~= 111,195 m.
        let d = haversine_m((0.0, 0.0), (0.0, 1.0));
        assert!((d - 111195.0).abs() < 50.0, "d={d}");
    }

    #[test]
    fn known_jakarta_cameras() {
        // Two real cameras from data/cameras.json.
        let a = (-6.2435, 106.7989);
        let b = (-6.2458, 106.798);
        let d = haversine_m(a, b);
        let expected = ref_haversine(a, b);
        assert!((d - expected).abs() < 0.1, "d={d} expected={expected}");
    }

    #[test]
    fn symmetric() {
        let a = (-6.2435, 106.7989);
        let b = (-6.19, 106.84);
        assert!((haversine_m(a, b) - haversine_m(b, a)).abs() < 1e-9);
    }

    #[test]
    fn distant_points() {
        let d = haversine_m((0.0, 0.0), (0.0, 180.0));
        // Half the equator circumference.
        let expected = std::f64::consts::PI * EARTH_R;
        assert!((d - expected).abs() < 1.0, "d={d} expected={expected}");
    }

    #[test]
    fn float_inputs() {
        let d = haversine_m((0.0, 0.0), (0.0, 0.0));
        assert!(d.is_finite());
    }
}
