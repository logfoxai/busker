import {busk} from '../../index.js';

/** Wire the Crema splash mock and start the demo loop. */
export function initCremaDemo(): void {
    const root = document.querySelector<HTMLElement>('[data-mock]');

    if (!root) return;

    const showScene = (scene: string): void => {
        root.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
            el.classList.toggle('is-active', el.dataset.scene === scene);
        });

        const nav = root.querySelector<HTMLElement>(`[data-scene="${scene}"]`)?.dataset.nav;

        root.querySelectorAll<HTMLElement>('[data-nav-item]').forEach((el) => {
            el.classList.toggle('is-active', el.dataset.navItem === nav);
        });
    };

    const wireScenes = (open: string = 'beans'): void => {
        showScene(open);
        root.querySelector('[data-panel]')?.classList.remove('is-open');
    };

    root.querySelector('[data-nav-item="beans"]')?.addEventListener('click', () => showScene('beans'));
    root.querySelector('[data-nav-item="plans"]')?.addEventListener('click', () => showScene('plans'));
    root.querySelector('[data-nav-item="roasters"]')?.addEventListener('click', () => showScene('roasters'));
    root.querySelector('[data-cta]')?.addEventListener('click', () => showScene('plans'));
    root.querySelectorAll('[data-plan]').forEach((plan) => {
        plan.addEventListener('click', () => showScene('checkout'));
    });
    root.querySelector('[data-checkout]')?.addEventListener('click', () => {
        root.querySelector('[data-panel]')?.classList.add('is-open');
    });
    root.querySelector('[data-close]')?.addEventListener('click', () => {
        root.querySelector('[data-panel]')?.classList.remove('is-open');
        showScene('beans');
    });

    root.querySelectorAll('[data-plan]').forEach((plan) => {
        plan.addEventListener('click', () => {
            const name = plan.getAttribute('data-name');
            const price = plan.getAttribute('data-price');
            if (name) root.querySelector('[data-summary-plan]')!.textContent = name;
            if (price) root.querySelector('[data-summary-price]')!.textContent = price;
        });
    });

    wireScenes('beans');

    busk(root, {
        start: [0.55, 0.3],
        onLoop: () => wireScenes('beans'),
        steps: [
            {wait: 900},
            {click: '[data-cta]'},
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
            '[data-cta]',
            '[data-plan="solo"]',
            '[data-plan="duo"]',
            '[data-plan="family"]',
            '[data-checkout]',
            '[data-close]',
        ],
    });
}
