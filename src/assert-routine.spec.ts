import {test} from 'kizu';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {assertScriptRoutine} from './assert-routine.ts';
import {busk} from './busk.ts';

GlobalRegistrator.register({url: 'https://busker.test', width: 800, height: 600});

test('assertScriptRoutine: rejects hand-timed duration', (assert) => {

    let message = '';

    try {
        assertScriptRoutine({duration: 1000, steps: [{wait: 1}]} as never);
    } catch (error) {
        message = error instanceof Error ? error.message : String(error);
    }

    assert.equal(message.includes('duration'), true);
    assert.equal(message.includes('removed in v2'), true);

});

test('assertScriptRoutine: rejects hand-timed moves', (assert) => {

    let message = '';

    try {
        assertScriptRoutine({
            moves: [{to: '#a', from: 0, until: 100}],
            steps: [{wait: 1}],
        } as never);
    } catch (error) {
        message = error instanceof Error ? error.message : String(error);
    }

    assert.equal(message.includes('moves'), true);

});

test('busk: throws before touching the DOM when the routine is hand-timed', (assert) => {

    document.body.innerHTML = '<div id="root"><span data-cursor></span></div>';
    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    let message = '';

    try {
        busk(root, {duration: 500} as never);
    } catch (error) {
        message = error instanceof Error ? error.message : String(error);
    }

    assert.equal(message.includes('removed in v2'), true);

});
