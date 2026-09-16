/** CSS `cubic-bezier(x1, y1, x2, y2)` control points (endpoints are (0,0) and (1,1)). */
export type CubicBezier = [number, number, number, number];

const BEzier_A = (t: number, p0: number, p1: number, p2: number, p3: number): number => {
    const u = 1 - t;

    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
};

/** Sample x(u) and y(u) for u in [0, 1]. */
const sample = (u: number, [x1, y1, x2, y2]: CubicBezier): {x: number; y: number} => ({
    x: BEzier_A(u, 0, x1, x2, 1),
    y: BEzier_A(u, 0, y1, y2, 1),
});

/**
 * Easing function for cursor glides: linear time in, eased progress out.
 * Same curve as CSS `transition-timing-function: cubic-bezier(...)`.
 */
export function cubicBezierEasing(curve: CubicBezier): (t: number) => number {
    return (t: number): number => {
        if (t <= 0) return 0;
        if (t >= 1) return 1;

        let lo = 0;
        let hi = 1;

        for (let i = 0; i < 12; i += 1) {
            const mid = (lo + hi) / 2;
            const {x} = sample(mid, curve);

            if (x < t) lo = mid;
            else hi = mid;
        }

        return sample((lo + hi) / 2, curve).y;
    };
}
