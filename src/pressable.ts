/** Native buttons and anything explicitly marked in the mock markup. */
const PRESSABLE = 'button, [data-busker-press]';

const NOT_PRESSABLE = '[data-busker-no-press]';

/** Dropdown panels — clicks here should not press the field trigger behind them. */
const BUSKER_MENU = '[data-busker-menu]';

/**
 * The element that should receive `.is-pressed` while the demo cursor is down.
 * Returns null for opt-out targets and plain inline links.
 */
export function pressableElement(el: HTMLElement): HTMLElement | null {
    if (el.matches(NOT_PRESSABLE)) return null;

    if (el.closest(BUSKER_MENU)) return null;

    const candidate = el.closest<HTMLElement>(PRESSABLE);

    if (candidate) {
        return candidate.matches(NOT_PRESSABLE) ? null : candidate;
    }

    if (el.getAttribute('role') === 'button' && el.classList.contains('is-interactive')) {
        return el.matches(NOT_PRESSABLE) ? null : el;
    }

    return null;
}
