/// Easing curve kinds. The numeric discriminants are the wire format for the
/// WASM `ease(t, kind)` export.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EaseKind {
    Linear = 0,
    EaseInQuad = 1,
    EaseOutQuad = 2,
    EaseInOutQuad = 3,
    EaseInCubic = 4,
    EaseOutCubic = 5,
    EaseInOutCubic = 6,
}

impl EaseKind {
    pub fn from_u8(v: u8) -> Self {
        match v {
            0 => EaseKind::Linear,
            1 => EaseKind::EaseInQuad,
            2 => EaseKind::EaseOutQuad,
            3 => EaseKind::EaseInOutQuad,
            4 => EaseKind::EaseInCubic,
            5 => EaseKind::EaseOutCubic,
            6 => EaseKind::EaseInOutCubic,
            _ => EaseKind::Linear,
        }
    }

    pub const ALL: [EaseKind; 7] = [
        EaseKind::Linear,
        EaseKind::EaseInQuad,
        EaseKind::EaseOutQuad,
        EaseKind::EaseInOutQuad,
        EaseKind::EaseInCubic,
        EaseKind::EaseOutCubic,
        EaseKind::EaseInOutCubic,
    ];

    /// Evaluate the easing curve at `t`. Input is clamped to [0, 1].
    pub fn apply(self, t: f64) -> f64 {
        let t = if t.is_nan() {
            0.0
        } else {
            t.clamp(0.0, 1.0)
        };
        match self {
            EaseKind::Linear => t,
            EaseKind::EaseInQuad => t * t,
            EaseKind::EaseOutQuad => t * (2.0 - t),
            EaseKind::EaseInOutQuad => {
                if t < 0.5 {
                    2.0 * t * t
                } else {
                    -1.0 + (4.0 - 2.0 * t) * t
                }
            }
            EaseKind::EaseInCubic => t * t * t,
            EaseKind::EaseOutCubic => {
                let u = 1.0 - t;
                1.0 - u * u * u
            }
            EaseKind::EaseInOutCubic => {
                if t < 0.5 {
                    4.0 * t * t * t
                } else {
                    let u = -2.0 * t + 2.0;
                    1.0 - u * u * u / 2.0
                }
            }
        }
    }
}

pub fn ease(t: f64, kind: EaseKind) -> f64 {
    kind.apply(t)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn linear_identity() {
        for &t in &[0.0, 0.25, 0.5, 0.75, 1.0] {
            assert!((ease(t, EaseKind::Linear) - t).abs() < 1e-12);
        }
    }

    #[test]
    fn endpoints_for_all_kinds() {
        for kind in EaseKind::ALL {
            assert_eq!(ease(0.0, kind), 0.0, "kind={kind:?}");
            assert_eq!(ease(1.0, kind), 1.0, "kind={kind:?}");
        }
    }

    #[test]
    fn cubic_midpoints() {
        assert!((ease(0.5, EaseKind::EaseInCubic) - 0.125).abs() < 1e-9);
        assert!((ease(0.5, EaseKind::EaseOutCubic) - 0.875).abs() < 1e-9);
        assert!((ease(0.5, EaseKind::EaseInOutCubic) - 0.5).abs() < 1e-9);
    }

    #[test]
    fn in_out_cubic_symmetry() {
        for &t in &[0.1, 0.3, 0.4, 0.6, 0.7, 0.9] {
            let sum = ease(t, EaseKind::EaseInOutCubic)
                + ease(1.0 - t, EaseKind::EaseInOutCubic);
            assert!((sum - 1.0).abs() < 1e-9, "t={t} sum={sum}");
        }
    }

    #[test]
    fn monotonic_non_decreasing() {
        for kind in EaseKind::ALL {
            let mut prev = ease(0.0, kind);
            for i in 1..=100 {
                let t = i as f64 / 100.0;
                let v = ease(t, kind);
                assert!(v + 1e-12 >= prev, "kind={kind:?} t={t} v={v} prev={prev}");
                prev = v;
            }
        }
    }

    #[test]
    fn quad_curves() {
        assert!((ease(0.5, EaseKind::EaseInQuad) - 0.25).abs() < 1e-9);
        assert!((ease(0.5, EaseKind::EaseOutQuad) - 0.75).abs() < 1e-9);
        assert!((ease(0.5, EaseKind::EaseInOutQuad) - 0.5).abs() < 1e-9);
    }

    #[test]
    fn unknown_kind_maps_to_linear() {
        assert!((ease(0.4, EaseKind::from_u8(99)) - 0.4).abs() < 1e-12);
    }

    #[test]
    fn clamps_input_range() {
        assert_eq!(ease(-1.0, EaseKind::Linear), 0.0);
        assert_eq!(ease(2.0, EaseKind::Linear), 1.0);
        assert_eq!(ease(f64::NAN, EaseKind::Linear), 0.0);
    }
}
