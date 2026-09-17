import {test} from 'kizu';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {pressableElement} from './pressable.ts';

GlobalRegistrator.register({url: 'https://busker.test', width: 1024, height: 768});

test('pressableElement finds buttons and data-busker-press', (assert) => {
    document.body.innerHTML = `
        <button id="btn">Save</button>
        <span class="mock-btn" data-busker-press id="chip">Add</span>
        <span class="mock-inv__filter mock-inv__filter--select" data-busker-press id="filter">Level</span>
    `;

    assert.equal(pressableElement(document.getElementById('btn')!), document.getElementById('btn'));
    assert.equal(pressableElement(document.getElementById('chip')!), document.getElementById('chip'));
    assert.equal(pressableElement(document.getElementById('filter')!), document.getElementById('filter'));
});

test('pressableElement skips data-busker-no-press', (assert) => {
    document.body.innerHTML = `
        <span class="mock-inv__back" data-busker-no-press id="back">← Monitors</span>
        <button id="ok">OK</button>
    `;

    assert.equal(pressableElement(document.getElementById('back')!), null);
    assert.equal(pressableElement(document.getElementById('ok')!), document.getElementById('ok'));
});

test('pressableElement walks up to a button wrapper from an inner step target', (assert) => {
    document.body.innerHTML = `
        <button class="mock-logs__trace-drill" id="drill">
            <span data-live-trace="two" id="row">trace</span>
        </button>
    `;

    const row = document.getElementById('row')!;

    assert.equal(pressableElement(row), document.getElementById('drill'));
});

test('pressableElement does not press the trigger when the step target is in a busker menu', (assert) => {
    document.body.innerHTML = `
        <span class="mock-inv__filter mock-inv__filter--select" data-busker-press id="filter">
            <b>Info+</b>
            <span class="mock-inv__filter-menu" data-busker-menu>
                <span class="mock-inv__filter-option" id="warn">Warn+</span>
            </span>
        </span>
    `;

    assert.equal(pressableElement(document.getElementById('warn')!), null);
    assert.equal(pressableElement(document.getElementById('filter')!), document.getElementById('filter'));
});

test('pressableElement allows role=button clickTargets that are not inline chrome', (assert) => {
    document.body.innerHTML = `
        <div role="button" class="mock-logs__trace-log-clickable is-interactive" id="hit">log</div>
        <div role="button" class="mock-inv__back is-interactive" data-busker-no-press id="back">back</div>
    `;

    assert.equal(pressableElement(document.getElementById('hit')!), document.getElementById('hit'));
    assert.equal(pressableElement(document.getElementById('back')!), null);
});
