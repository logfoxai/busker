import {test} from 'kizu';
import {
    compile,
    countdownText,
    easeInOutCubic,
    isOn,
    moveIndexAt,
    positionAt,
    typedText,
} from './timeline';

test('compile: beats run back to back, so nothing has to be timed by hand', (assert) => {

    const {moves, duration} = compile([
        {click: '#a', wait: 100, moveFor: 200, dwell: 50},
        {click: '#b', wait: 300, moveFor: 400, dwell: 60},
    ]);

    assert.equal(moves[0], {to: '#a', from: 100, until: 300, press: 350});
    assert.equal(moves[1], {to: '#b', from: 650, until: 1050, press: 1110});
    assert.equal(duration, 1110);

});

test('compile: a step with no wait sets off the moment the last one finished', (assert) => {

    const {moves} = compile([
        {click: '#a', moveFor: 100, dwell: 10},
        {click: '#b', moveFor: 100, dwell: 10},
    ]);

    assert.equal(moves[0].press, 110);
    assert.equal(moves[1].from, 110);

});

test('compile: a drift has nothing to press', (assert) => {

    const {moves, duration} = compile([{to: [0.5, 0.5], wait: 100, moveFor: 200}]);

    assert.equal(moves[0].press, undefined);
    assert.equal(duration, 300);

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

test('positionAt: halfway through the glide is halfway there', (assert) => {

    assert.equal(positionAt([0, 0], [10, 20], {to: '#a', from: 0, until: 100}, 50), [5, 10]);

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

    const countdown = {target: '#a', seconds: 125};

    assert.equal(countdownText(countdown, 0), '2:05');
    assert.equal(countdownText(countdown, 60_000), '1:05');
    assert.equal(countdownText(countdown, 120_000), '0:05');
    assert.equal(countdownText(countdown, 999_000), '0:00');

});
