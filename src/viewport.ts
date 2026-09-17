/** IntersectionObserver ratios are floating point; 1 is rarely exactly 1. */
export const VISIBILITY_SLACK = 0.001;

/** How much of `el` is inside the viewport, as a fraction of its own area. */
export function viewportVisibleFraction(el: Element): number {
    const rect = el.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return 0;

    const w = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const h = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);

    if (w <= 0 || h <= 0) return 0;

    return (w * h) / (rect.width * rect.height);
}

/** Same threshold math as {@link busk} uses for `Routine.visibility`. */
export function meetsViewportVisibility(el: Element, minFraction: number): boolean {
    return viewportVisibleFraction(el) >= minFraction - VISIBILITY_SLACK;
}
