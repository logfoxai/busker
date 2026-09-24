/** Crema splash mock — click handlers and panel state (not part of busker). */
export function wireCremaMock(root: HTMLElement): (open?: string) => void {
    const panel = root.querySelector('[data-panel]');
    const summaryPlan = root.querySelector('[data-summary-plan]');
    const summaryPrice = root.querySelector('[data-summary-price]');

    const showScene = (scene: string): void => {
        root.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
            el.classList.toggle('is-active', el.dataset.scene === scene);
        });
        const nav =
            root.querySelector<HTMLElement>(`[data-scene="${scene}"]`)?.dataset.nav ?? scene;
        root.querySelectorAll<HTMLElement>('[data-nav-item]').forEach((el) => {
            el.classList.toggle('is-active', el.dataset.navItem === nav);
        });
    };

    const reset = (scene = 'beans'): void => {
        showScene(scene);
        panel?.classList.remove('is-open');
    };

    root.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const nav = target.closest<HTMLElement>('[data-nav-item]');
        if (nav?.dataset.navItem) {
            showScene(nav.dataset.navItem);
            return;
        }

        if (target.closest('[data-bean]')) {
            showScene('plans');
            return;
        }

        const plan = target.closest<HTMLElement>('[data-plan]');
        if (plan) {
            showScene('checkout');
            if (plan.dataset.name && summaryPlan) summaryPlan.textContent = plan.dataset.name;
            if (plan.dataset.price && summaryPrice) summaryPrice.textContent = plan.dataset.price;
            return;
        }

        if (target.closest('[data-checkout]')) {
            panel?.classList.add('is-open');
            return;
        }

        if (target.closest('[data-close]')) {
            panel?.classList.remove('is-open');
            showScene('beans');
        }
    });

    reset();
    return reset;
}
