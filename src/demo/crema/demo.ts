import {busk} from '../../index.js';

import {wireCremaMock} from './mock.js';

/** Start the Crema splash mock demo loop. */
export function initCremaDemo(): void {
    const root = document.querySelector<HTMLElement>('[data-mock]');

    if (!root) return;

    const wireScenes = wireCremaMock(root);

    busk(root, {
        start: [0.55, 0.3],
        onLoop: () => wireScenes('beans'),
        steps: [
            {wait: 900},
            {click: '[data-bean="oaxaca"]'},
            {wait: 1500},
            {click: '[data-plan="duo"]'},
            {wait: 2200},
            {click: '[data-checkout]'},
            {wait: 2600},
            {click: '[data-close]'},
            {wait: 900},
            {click: '[data-nav-item="plans"]'},
            {wait: 1400},
            {click: '[data-plan="solo"]'},
            {wait: 900},
            {move: [0.55, 0.3]},
        ],
        clickTargets: [
            '[data-nav-item="beans"]',
            '[data-nav-item="plans"]',
            '[data-nav-item="roasters"]',
            '[data-bean="huila"]',
            '[data-bean="oaxaca"]',
            '[data-bean="yirgacheffe"]',
            '[data-plan="solo"]',
            '[data-plan="duo"]',
            '[data-plan="family"]',
            '[data-checkout]',
            '[data-close]',
        ],
    });
}
