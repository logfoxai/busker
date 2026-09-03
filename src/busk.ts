import {
    PRESS_MS,
    RING_MS,
    compile,
    countdownText,
    isOn,
    moveIndexAt,
    positionAt,
    typedText,
} from './timeline.ts';
import type {Busker, Move, Point, Routine} from './types.ts';

const DEFAULT_START: Point = [0.5, 0.5];
/** IntersectionObserver ratios are floating point; 1 is rarely exactly 1. */
const VISIBILITY_SLACK = 0.001;
/** How long a missed click keeps the clickable things lit up. */
const HINT_MS = 1500;

/** How much of `el` is inside the viewport, as a fraction of its own area. */
function visibleFraction(el: Element): number {
    const rect = el.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return 0;

    const w = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const h = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);

    if (w <= 0 || h <= 0) return 0;

    return (w * h) / (rect.width * rect.height);
}

/**
 * Put on a show inside `root`.
 *
 * See the docs for the markup contract: `[data-cursor]` for the pointer,
 * `[data-scene]` for the pages, `[data-nav-item]` for the nav.
 */
export function busk(root: HTMLElement, routine: Routine): Busker {
    const cursor = root.querySelector<HTMLElement>('[data-cursor]');
    const scenes = new Map<string, HTMLElement>();
    const navItems = new Map<string, HTMLElement>();

    root.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
        scenes.set(el.dataset.scene as string, el);
    });
    root.querySelectorAll<HTMLElement>('[data-nav-item]').forEach((el) => {
        navItems.set(el.dataset.navItem as string, el);
    });

    // A script presses for real; a hand-timed routine only animates the press.
    const script = routine.steps ? compile(routine.steps) : null;
    const moves = script?.moves ?? routine.moves ?? [];
    const duration = script?.duration ?? routine.duration ?? 0;
    const start = routine.start ?? DEFAULT_START;
    const routes = routine.routes ?? [];
    const visibility = routine.visibility ?? 1;

    /** Selectors are resolved once; the elements they point at may not exist. */
    const found = <T extends {target: string}>(items: T[] | undefined): (T & {el: HTMLElement})[] =>
        (items ?? []).flatMap((item) => {
            const el = root.querySelector<HTMLElement>(item.target);

            return el ? [{...item, el}] : [];
        });

    const toggles = found(routine.toggles);
    const typings = found(routine.typing);
    const countdowns = found(routine.countdowns);

    /** Where a move target sits, in px relative to the root's top-left. */
    function resolve(target: string | Point): Point | null {
        if (Array.isArray(target)) return [target[0] * root.clientWidth, target[1] * root.clientHeight];

        const el = root.querySelector(target);

        if (!el) return null;

        const rootRect = root.getBoundingClientRect();
        const rect = el.getBoundingClientRect();

        return [
            rect.left - rootRect.left + rect.width / 2,
            rect.top - rootRect.top + rect.height / 2,
        ];
    }

    let elapsed = 0;
    let last = 0;
    let rafId = 0;
    let playing = false;
    let aside = false;
    let destroyed = false;
    /** Steps already pressed this time round, so each one fires exactly once. */
    const pressed = new Set<number>();
    /** Set while the show clicks for itself, so it does not mistake that for a visitor. */
    let clickingItself = false;

    // What the DOM already shows, so a 60fps loop is not writing the same values.
    let shownScene: string | null = null;
    let shownHover: Element | null = null;
    let shownPressing = false;
    let shownRinging = false;
    const shownToggle = new WeakMap<HTMLElement, string>();
    const shownText = new WeakMap<HTMLElement, string>();

    /** Show one scene and light up its nav item. Only ever caused by a click. */
    function activate(scene: string | null): void {
        if (scene === shownScene) return;
        shownScene = scene;
        scenes.forEach((el, key) => el.classList.toggle('is-active', key === scene));

        const nav = scene ? scenes.get(scene)?.dataset.nav : undefined;

        navItems.forEach((el, key) => el.classList.toggle('is-active', key === nav));
    }

    /**
     * Really click the steps whose press has lifted, each once per loop. The
     * click lands at the end of the stroke, the way a real one does, so the
     * cursor reads on the element before the click takes it away.
     */
    function press(t: number): void {
        if (!script) return;

        moves.forEach((move, i) => {
            if (move.press === undefined || t < move.press + PRESS_MS || pressed.has(i)) return;
            pressed.add(i);
            if (typeof move.to !== 'string') return;

            const el = root.querySelector<HTMLElement>(move.to);

            if (!el) return;

            clickingItself = true;
            try {
                el.click();
            } finally {
                clickingItself = false;
            }
        });
    }

    function drawCursor(move: Move | null, index: number, t: number): void {
        if (!cursor) return;

        const from = resolve(index > 0 ? moves[index - 1].to : start);
        const to = resolve(move ? move.to : start);

        if (from && to) {
            const [x, y] = positionAt(from, to, move, t);

            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
        }

        // Hovering starts the moment the cursor lands and ends when it sets off again.
        const hover = move && typeof move.to === 'string' && t >= move.until
            ? root.querySelector(move.to)
            : null;

        if (hover !== shownHover) {
            shownHover?.classList.remove('is-hover');
            shownHover = hover;
            hover?.classList.add('is-hover');
        }

        const pressing = move?.press !== undefined && t >= move.press && t < move.press + PRESS_MS;

        if (pressing !== shownPressing) {
            shownPressing = pressing;
            cursor.classList.toggle('is-pressing', pressing);
        }

        const ringing = move?.press !== undefined && t >= move.press && t < move.press + RING_MS;

        if (ringing !== shownRinging) {
            shownRinging = ringing;
            cursor.classList.toggle('is-ringing', ringing);
        }
    }

    function write(el: HTMLElement, text: string): void {
        if (shownText.get(el) === text) return;
        shownText.set(el, text);
        el.textContent = text;
    }

    function render(t: number): void {
        for (const toggle of toggles) {
            const key = `${toggle.class}:${isOn(toggle, t)}`;

            if (shownToggle.get(toggle.el) === key) continue;
            shownToggle.set(toggle.el, key);
            toggle.el.classList.toggle(toggle.class, isOn(toggle, t));
        }

        for (const typing of typings) write(typing.el, typedText(typing, t));
        for (const countdown of countdowns) write(countdown.el, countdownText(countdown, t));

        const index = moveIndexAt(moves, t);

        drawCursor(index >= 0 ? moves[index] : null, index, t);
    }

    function frame(now: number): void {
        if (!playing) return;

        const next = elapsed + (now - last);

        // Back to the top. Every pass restarts at 0 rather than carrying the
        // overshoot, so a stalled frame (backgrounded tab, slow paint) cannot
        // drop the start of the routine or fire a burst of catch-up clicks.
        if (next >= duration) {
            pressed.clear();
            activate(routine.initialScene ?? null);
            elapsed = 0;
        } else {
            elapsed = next;
        }

        last = now;
        render(elapsed);
        press(elapsed);
        rafId = requestAnimationFrame(frame);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function play(): void {
        if (playing || aside || destroyed || reducedMotion || duration <= 0) return;
        playing = true;
        last = performance.now();
        rafId = requestAnimationFrame(frame);
    }

    function pause(): void {
        playing = false;
        cancelAnimationFrame(rafId);
    }

    function stepAside(): void {
        if (aside) return;
        aside = true;
        pause();
        root.classList.add('is-aside');
        shownHover?.classList.remove('is-hover');
        shownHover = null;
        shownPressing = false;
        shownRinging = false;
    }

    const onClick = (e: Event): void => {
        if (destroyed) return;

        const hit = routes.find((route) => {
            const el = (e.target as Element).closest(route.click);

            return el !== null && root.contains(el);
        });

        if (hit) activate(hit.scene);

        // The show's own clicks route the mock but must not take it away from itself.
        if (clickingItself) return;

        stepAside();

        // They clicked something dead — show them what is not.
        if (hit) return;

        const targets = new Set<Element>();

        for (const route of routes) root.querySelectorAll(route.click).forEach((el) => targets.add(el));
        targets.forEach((el) => el.classList.add('is-hint'));
        setTimeout(() => targets.forEach((el) => el.classList.remove('is-hint')), HINT_MS);
    };

    const onVisibilityChange = (): void => {
        if (document.hidden) pause();
        else if (visibleFraction(root) >= visibility - VISIBILITY_SLACK) play();
    };

    function destroy(): void {
        if (destroyed) return;
        destroyed = true;
        pause();
        observer?.disconnect();
        root.removeEventListener('click', onClick);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        shownHover?.classList.remove('is-hover');
        shownHover = null;
        root.querySelectorAll('.is-hint').forEach((el) => el.classList.remove('is-hint'));
        root.querySelectorAll('.is-interactive').forEach((el) => el.classList.remove('is-interactive'));
        root.classList.remove('busker', 'is-aside');
        cursor?.classList.remove('is-visible', 'is-pressing', 'is-ringing');
    }

    root.classList.add('busker');

    // Anything the show can click, a visitor can click — so the pointer and the
    // wiring come from the same list, with no CSS to keep in step by hand.
    if (routes.length) {
        for (const route of routes) {
            root.querySelectorAll(route.click).forEach((el) => el.classList.add('is-interactive'));
        }
        root.addEventListener('click', onClick);
    }

    activate(routine.initialScene ?? null);

    const observer = reducedMotion
        ? undefined
        : new IntersectionObserver(
            () => {
                if (visibleFraction(root) >= visibility - VISIBILITY_SLACK) play();
                else pause();
            },
            {threshold: [...new Set([0, visibility, 1])]},
        );

    if (reducedMotion) {
        render(routine.freezeAt ?? 0);
    } else {
        observer?.observe(root);
        document.addEventListener('visibilitychange', onVisibilityChange);
        cursor?.classList.add('is-visible');
        render(elapsed);
    }

    return {duration, play, pause, stepAside, destroy};
}
