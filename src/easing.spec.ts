import {test} from 'kizu';
import {cubicBezierEasing, cubicBezierEasingCached} from './easing.ts';
import {DEFAULT_EASING} from './timeline.ts';

test('cubicBezierEasing: endpoints and monotonic default curve', (assert) => {

    const ease = cubicBezierEasing(DEFAULT_EASING);

    assert.equal(ease(0), 0);
    assert.equal(ease(1), 1);
    assert.equal(ease(0.5) > 0.35 && ease(0.5) < 0.82, true);
    assert.equal(ease(0.25) < ease(0.75), true);

});

test('cubicBezierEasingCached: matches exact curve on sample points', (assert) => {

    const exact = cubicBezierEasing(DEFAULT_EASING);
    const cached = cubicBezierEasingCached(DEFAULT_EASING);

    for (const t of [0, 0.08, 0.25, 0.5, 0.75, 0.92, 1]) {
        assert.equal(Math.abs(cached(t) - exact(t)) < 0.002, true);
    }

});

test('cubicBezierEasing: linear bezier matches identity', (assert) => {

    const ease = cubicBezierEasing([0, 0, 1, 1]);

    assert.equal(Math.abs(ease(0.3) - 0.3) < 0.02, true);

});
