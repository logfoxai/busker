/** Crema splash mock — click handlers and panel state (not part of busker). */
export function wireCremaMock(root: HTMLElement): (open?: string) => void {
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

    root.querySelectorAll('[data-nav-item="beans"]').forEach((el) => {
        el.addEventListener('click', () => showScene('beans'));
    });
    root.querySelector('[data-nav-item="plans"]')?.addEventListener('click', () => showScene('plans'));
    root.querySelector('[data-nav-item="roasters"]')?.addEventListener('click', () => showScene('roasters'));
    root.querySelectorAll('[data-bean]').forEach((bean) => {
        bean.addEventListener('click', () => showScene('plans'));
    });
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

    return wireScenes;
}
