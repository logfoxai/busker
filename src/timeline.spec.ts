import {test} from 'kizu';
import {
    compile,
    countdownText,
    DEFAULT_MOTION,
    easeInOutCubic,
    isOn,
    moveDurationMs,
    moveIndexAt,
    positionAt,
    stretchMoveGlide,
    typedText,
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

    const {moves, duration} = compile(
        [{wait: 100}, {click: '#a'}, {wait: 300}, {click: '#b'}],
        resolveTestTarget,
        FIXED_GLIDE,
        [0, 0],
    );

    assert.equal(moves[0], {to: '#a', from: 100, until: 200, press: 250});
    assert.equal(moves[1], {to: '#b', from: 750, until: 850, press: 900});
    assert.equal(duration, 1400);

});

test('compile: a click step follows the previous beat immediately when there is no wait', (assert) => {

    const {moves} = compile(
        [{click: '#a'}, {click: '#b'}],
        resolveTestTarget,
        {...FIXED_GLIDE, dwellMs: 10},
        [0, 0],
    );

    assert.equal(moves[0].press, 110);
    assert.equal(moves[1].from, 310);

});

test('compile: a loop that ends on a click still runs until the ring has read', (assert) => {

    const {duration} = compile([{click: '#a'}], resolveTestTarget, {...FIXED_GLIDE, dwellMs: 0}, [0, 0]);

    assert.equal(duration, 600);

});

test('compile: a move step glides without a press', (assert) => {

    const {moves, duration} = compile(
        [{wait: 100}, {move: [2, 0]}],
        resolveTestTarget,
        FIXED_GLIDE,
        [0, 0],
    );

    assert.equal(moves[0].press, undefined);
    assert.equal(duration, 200);

});

test('compile: a run step schedules a task without moving the cursor', (assert) => {

    const {moves, duration, tasks} = compile(
        [{wait: 100}, {run: (): void => {}}, {click: '#a'}],
        resolveTestTarget,
        {...FIXED_GLIDE, dwellMs: 0},
        [0, 0],
    );

    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].at, 100);
    assert.equal(moves[0].from, 100);
    assert.equal(duration, 700);

});

test('stretchMoveGlide: lengthens one beat and pushes the rest', (assert) => {

    const moves = [
        {to: '#a', from: 100, until: 180, press: 280},
        {to: '#b', from: 480, until: 580, press: 680},
    ];
    const tasks = [{at: 500, run: (): void => {}}];

    assert.equal(stretchMoveGlide(moves, tasks, 0, 500), 420);
    assert.equal(moves[0].until, 600);
    assert.equal(moves[0].press, 700);
    assert.equal(moves[1].from, 900);
    assert.equal(tasks[0].at, 920);

});

test('compile: hidden targets compile as a short glide until runtime remeasures', (assert) => {

    let listVisible = false;
    const resolveHiddenList = (to: string | Point, from: Point): Point | null => {
        if (Array.isArray(to)) return [to[0] * 100, to[1] * 100];
        if (to === '#nav') return [0, 0];
        if (to === '#row') return listVisible ? [400, 0] : null;

        return from;
    };

    const {moves} = compile(
        [{click: '#nav'}, {click: '#row'}],
        resolveHiddenList,
        {pxPerSecond: 400, minMoveMs: 80, dwellMs: 0},
        [0, 0],
    );

    assert.equal(moves[1].until - moves[1].from, 460);

    listVisible = true;
    const delta = stretchMoveGlide(moves, [], 1, moveDurationMs(400, {pxPerSecond: 400, minMoveMs: 80}));

    assert.equal(delta, 540);
    assert.equal(moves[1].until - moves[1].from, 1000);

});

test('moveDurationMs: constant speed with a floor at zero distance', (assert) => {

    assert.equal(moveDurationMs(0), 495);
    assert.equal(moveDurationMs(580), 1000);
    assert.equal(moveDurationMs(1160), 2000);

});

test('moveDurationMs: short hops get extra ms so easing reads', (assert) => {

    const short = moveDurationMs(40, {pxPerSecond: 520, minMoveMs: 80});
    const long = moveDurationMs(400, {pxPerSecond: 520, minMoveMs: 80});

    assert.equal(short > 80, true);
    assert.equal(short < long, true);
    assert.equal(long, Math.round((400 / 520) * 1000));

});

test('moveDurationMs: defaults feel human on taps vs cross-screen glides', (assert) => {

    const tap = moveDurationMs(36, DEFAULT_MOTION);
    const speedFloor = Math.max(
        DEFAULT_MOTION.minMoveMs,
        Math.round((36 / DEFAULT_MOTION.pxPerSecond) * 1000),
    );
    const cross = moveDurationMs(640, DEFAULT_MOTION);

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

test('moveIndexAt: nothing before the first beat, then the latest one to have started', (assert) => {

    const moves = [
        {to: '#a', from: 100, until: 200},
        {to: '#b', from: 300, until: 400},
    ];

    assert.equal(moveIndexAt(moves, 50), -1);
    assert.equal(moveIndexAt(moves, 150), 0);
    assert.equal(moveIndexAt(moves, 250), 0);
    assert.equal(moveIndexAt(moves, 1000), 1);

});

test('positionAt: parks on the target once it has arrived', (assert) => {

    const move = {to: '#a', from: 0, until: 100};

    assert.equal(positionAt([0, 0], [10, 20], move, 100), [10, 20]);
    assert.equal(positionAt([0, 0], [10, 20], null, 100), [10, 20]);

});

test('positionAt: default easing sits between start and end at halfway through time', (assert) => {

    const mid = positionAt([0, 0], [10, 20], {to: '#a', from: 0, until: 100}, 50);

    assert.equal(mid[0] > 3 && mid[0] < 9, true);
    assert.equal(mid[1] > 6 && mid[1] < 18, true);

});

test('isOn: holds from the start, lets go at the end', (assert) => {

    const toggle = {target: '#a', class: 'is-open', from: 100, until: 200};

    assert.equal(isOn(toggle, 99), false);
    assert.equal(isOn(toggle, 100), true);
    assert.equal(isOn(toggle, 199), true);
    assert.equal(isOn(toggle, 200), false);

});

test('typedText: nothing, then some of it, then all of it', (assert) => {

    const typing = {target: '#a', text: 'hello', from: 0, until: 100};

    assert.equal(typedText(typing, -1), '');
    assert.equal(typedText(typing, 50), 'h');
    assert.equal(typedText(typing, 100), 'hello');
    assert.equal(typedText(typing, 5000), 'hello');

});

test('typedText: clearAt wipes it, e.g. the message was sent', (assert) => {

    const typing = {target: '#a', text: 'hello', from: 0, until: 100, clearAt: 200};

    assert.equal(typedText(typing, 199), 'hello');
    assert.equal(typedText(typing, 200), '');

});

test('countdownText: m:ss, zero padded, and it stops at zero', (assert) => {

    const countdown = {target: '#a', startSeconds: 125};

    assert.equal(countdownText(countdown, 0), '2:05');
    assert.equal(countdownText(countdown, 60_000), '1:05');
    assert.equal(countdownText(countdown, 120_000), '0:05');
    assert.equal(countdownText(countdown, 999_000), '0:00');

});
