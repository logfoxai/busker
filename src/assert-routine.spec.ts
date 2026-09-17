import {test} from 'kizu';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {assertScriptRoutine} from './assert-routine.ts';
import {busk} from './busk.ts';

GlobalRegistrator.register({url: 'https://busker.test', width: 800, height: 600});

test('assertScriptRoutine: rejects unknown routine keys', (assert) => {

    let message = '';

    try {
        assertScriptRoutine({duration: 1000, steps: [{wait: 1}]});
    } catch (error) {
        message = error instanceof Error ? error.message : String(error);
    }

    assert.equal(message.startsWith('busker:'), true);
    assert.equal(message.includes('duration'), true);

});

test('assertScriptRoutine: rejects invalid steps', (assert) => {

    let message = '';

    try {
        assertScriptRoutine({steps: [{wait: 100, click: '#a'}]});
    } catch (error) {
        message = error instanceof Error ? error.message : String(error);
    }

    assert.equal(message.startsWith('busker:'), true);

});

test('busk: throws before touching the DOM when the routine is invalid', (assert) => {

    document.body.innerHTML = '<div id="root"><span data-cursor></span></div>';
    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    let message = '';

    try {
        // @ts-expect-error intentional invalid routine
        busk(root, {duration: 500});
    } catch (error) {
        message = error instanceof Error ? error.message : String(error);
    }

    assert.equal(message.startsWith('busker:'), true);
    assert.equal(root.classList.contains('busker'), false);

});
