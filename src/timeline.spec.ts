import {test} from 'kizu';
import {
    compile,
    DEFAULT_MOTION,
    easeInOutCubic,
    glideDurationMs,
    glideIndexAt,
    positionAt,
    stretchGlide,
} from './timeline.ts';
import type {Point} from './types.ts';

const FIXED_GLIDE: Parameters<typeof compile>[2] = {
    minMoveMs: 100,
    pxPerSecond: 1e9,
    dwellMs: 50,
};

const resolveTestTarget = (to: string | Point, from: Point): Point | null => {
    if (Array.isArray(to)) return [to[0] * 100, to[1] * 100];
    /* >130px from origin and from each other so compile fixtures hit minMoveMs, not short-hop extras. */
    if (to === '#a') return [150, 0];
    if (to === '#b') return [300, 0];

    return from;
};

test('compile: waits and clicks run in order with auto glide timing', (assert) => {

    const {glides, duration} = compile(
        [{wait: 100}, {click: '#a'}, {wait: 300}, {click: '#b'}],
        resolveTestTarget,
        FIXED_GLIDE,
        [0, 0],
    );

    assert.equal(glides[0], {to: '#a', from: 100, until: 200, press: 250});
    assert.equal(glides[1], {to: '#b', from: 750, until: 850, press: 900});
    assert.equal(duration, 1400);

});

test('compile: a click step follows the previous beat immediately when there is no wait', (assert) => {

    const {glides} = compile(
        [{click: '#a'}, {click: '#b'}],
        resolveTestTarget,
        {...FIXED_GLIDE, dwellMs: 10},
        [0, 0],
    );

    assert.equal(glides[0].press, 110);
    assert.equal(glides[1].from, 310);

});

test('compile: a loop that ends on a click still runs until the ring has read', (assert) => {

    const {duration} = compile([{click: '#a'}], resolveTestTarget, {...FIXED_GLIDE, dwellMs: 0}, [0, 0]);

    assert.equal(duration, 600);

});

test('compile: a move step glides without a press', (assert) => {

    const {glides, duration} = compile(
        [{wait: 100}, {move: [2, 0]}],
        resolveTestTarget,
        FIXED_GLIDE,
        [0, 0],
    );

    assert.equal(glides[0].press, undefined);
    assert.equal(duration, 200);

});

test('compile: a run step schedules a scheduled run without moving the cursor', (assert) => {

    const {glides, duration, runs} = compile(
        [{wait: 100}, {run: (): void => {}}, {click: '#a'}],
        resolveTestTarget,
        {...FIXED_GLIDE, dwellMs: 0},
        [0, 0],
    );

    assert.equal(runs.length, 1);
    assert.equal(runs[0].at, 100);
    assert.equal(glides[0].from, 100);
    assert.equal(duration, 700);

});

test('stretchGlide: lengthens one beat and pushes the rest', (assert) => {

    const glides = [
        {to: '#a', from: 100, until: 180, press: 280},
        {to: '#b', from: 480, until: 580, press: 680},
    ];
    const runs = [{at: 500, run: (): void => {}}];

    assert.equal(stretchGlide(glides, runs, 0, 500), 420);
    assert.equal(glides[0].until, 600);
    assert.equal(glides[0].press, 700);
    assert.equal(glides[1].from, 900);
    assert.equal(runs[0].at, 920);

});

test('compile: hidden targets compile as a short glide until runtime remeasures', (assert) => {

    let listVisible = false;
    const resolveHiddenList = (to: string | Point, from: Point): Point | null => {
        if (Array.isArray(to)) return [to[0] * 100, to[1] * 100];
        if (to === '#nav') return [0, 0];
        if (to === '#row') return listVisible ? [400, 0] : null;

        return from;
    };

    const {glides} = compile(
        [{click: '#nav'}, {click: '#row'}],
        resolveHiddenList,
        {pxPerSecond: 400, minMoveMs: 80, dwellMs: 0},
        [0, 0],
    );

    assert.equal(glides[1].until - glides[1].from, 460);

    listVisible = true;
    const delta = stretchGlide(glides, [], 1, glideDurationMs(400, {pxPerSecond: 400, minMoveMs: 80}));

    assert.equal(delta, 540);
    assert.equal(glides[1].until - glides[1].from, 1000);

});

test('glideDurationMs: constant speed with a floor at zero distance', (assert) => {

    assert.equal(glideDurationMs(0), 495);
    assert.equal(glideDurationMs(580), 1000);
    assert.equal(glideDurationMs(1160), 2000);

});

test('glideDurationMs: short hops get extra ms so easing reads', (assert) => {

    const short = glideDurationMs(40, {pxPerSecond: 520, minMoveMs: 80});
    const long = glideDurationMs(400, {pxPerSecond: 520, minMoveMs: 80});

    assert.equal(short > 80, true);
    assert.equal(short < long, true);
    assert.equal(long, Math.round((400 / 520) * 1000));

});

test('glideDurationMs: defaults feel human on taps vs cross-screen glides', (assert) => {

    const tap = glideDurationMs(36, DEFAULT_MOTION);
    const speedFloor = Math.max(
        DEFAULT_MOTION.minMoveMs,
        Math.round((36 / DEFAULT_MOTION.pxPerSecond) * 1000),
    );
    const cross = glideDurationMs(640, DEFAULT_MOTION);

    assert.equal(tap > speedFloor, true);
    assert.equal(tap >= DEFAULT_MOTION.minMoveMs, true);
    assert.equal(tap >= 320, true);
    assert.equal(tap <= 420, true);
    assert.equal(cross, Math.round((640 / DEFAULT_MOTION.pxPerSecond) * 1000));
    assert.equal(cross > tap, true);

});

test('easeInOutCubic: still at both ends, halfway at halfway', (assert) => {

    assert.equal(easeInOutCubic(0), 0);
    assert.equal(easeInOutCubic(0.5), 0.5);
    assert.equal(easeInOutCubic(1), 1);

});

test('glideIndexAt: nothing before the first beat, then the latest one to have started', (assert) => {

    const glides = [
        {to: '#a', from: 100, until: 200},
        {to: '#b', from: 300, until: 400},
    ];

    assert.equal(glideIndexAt(glides, 50), -1);
    assert.equal(glideIndexAt(glides, 150), 0);
    assert.equal(glideIndexAt(glides, 250), 0);
    assert.equal(glideIndexAt(glides, 1000), 1);

});

test('positionAt: parks on the target once it has arrived', (assert) => {

    const glide = {to: '#a', from: 0, until: 100};

    assert.equal(positionAt([0, 0], [10, 20], glide, 100), [10, 20]);
    assert.equal(positionAt([0, 0], [10, 20], null, 100), [10, 20]);

});

test('positionAt: default easing sits between start and end at halfway through time', (assert) => {

    const mid = positionAt([0, 0], [10, 20], {to: '#a', from: 0, until: 100}, 50);

    assert.equal(mid[0] > 3 && mid[0] < 9, true);
    assert.equal(mid[1] > 6 && mid[1] < 18, true);

});
