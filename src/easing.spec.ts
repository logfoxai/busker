import {test} from 'kizu';
import {cubicBezierEasing} from './easing.ts';
import {DEFAULT_EASING} from './timeline.ts';

test('cubicBezierEasing: endpoints and monotonic default curve', (assert) => {

    const ease = cubicBezierEasing(DEFAULT_EASING);

    assert.equal(ease(0), 0);
    assert.equal(ease(1), 1);
    assert.equal(ease(0.5) > 0.4 && ease(0.5) < 0.7, true);
    assert.equal(ease(0.25) < ease(0.75), true);

});

test('cubicBezierEasing: linear bezier matches identity', (assert) => {

    const ease = cubicBezierEasing([0, 0, 1, 1]);

    assert.equal(Math.abs(ease(0.3) - 0.3) < 0.02, true);

});
