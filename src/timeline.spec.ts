import {test} from 'kizu';
import {
    compile,
    countdownText,
    easeInOutCubic,
    isOn,
    moveDurationMs,
    moveIndexAt,
    positionAt,
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
    if (to === '#a') return [10, 0];
    if (to === '#b') return [20, 0];

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
        [{wait: 100}, {move: [0.5, 0.5]}],
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

test('moveDurationMs: constant speed with a floor at zero distance', (assert) => {

    assert.equal(moveDurationMs(0), 80);
    assert.equal(moveDurationMs(720), 1000);
    assert.equal(moveDurationMs(1440), 2000);

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

    assert.equal(mid[0] > 3 && mid[0] < 7, true);
    assert.equal(mid[1] > 6 && mid[1] < 14, true);

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
