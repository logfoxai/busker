import {predicates as p, type Infer, type Pred} from 'runtyp';

const nonNegativeNumber = p.number({range: {min: 0, max: Number.MAX_SAFE_INTEGER}});

const runCallback = p.custom(
    (input: unknown): input is () => void => typeof input === 'function',
    'must be a function',
);

const point = p.custom(
    (input: unknown): input is [number, number] =>
        Array.isArray(input) &&
        input.length === 2 &&
        typeof input[0] === 'number' &&
        typeof input[1] === 'number' &&
        Number.isFinite(input[0]) &&
        Number.isFinite(input[1]),
    'must be [x, y] with finite numbers',
);

const nonEmptyString = p.string({len: {min: 1, max: Number.MAX_SAFE_INTEGER}});

const moveTarget = p.union(
    [nonEmptyString, point],
    'must be a selector string or [x, y] point',
);

const clickStep = p.object({click: nonEmptyString});
const moveStep = p.object({move: moveTarget});
const waitStep = p.object({wait: nonNegativeNumber});
const runStep = p.object({run: runCallback});

const step = p.union(
    [clickStep, moveStep, waitStep, runStep],
    'must be { click }, { move }, { wait }, or { run }',
);

const cubicBezier = p.custom(
    (input: unknown): input is [number, number, number, number] =>
        Array.isArray(input) &&
        input.length === 4 &&
        input.every((n) => typeof n === 'number' && Number.isFinite(n)),
    'must be four finite numbers',
);

const motionConfig = p.object({
    pxPerSecond: p.optional(nonNegativeNumber),
    minMoveMs: p.optional(nonNegativeNumber),
    dwellMs: p.optional(nonNegativeNumber),
    easing: p.optional(cubicBezier),
});

const exploreHintConfig = p.object({
    text: p.optional(nonEmptyString),
    dismissAfterMs: p.optional(nonNegativeNumber),
    durationMs: p.optional(nonNegativeNumber),
    offsetX: p.optional(nonEmptyString),
});

const exploreHint = p.union(
    [p.boolean(), nonEmptyString, exploreHintConfig],
    'must be true, a label, or an ExploreHintConfig',
);

const routine = p.object({
    steps: p.array(step, {len: {min: 1}}),
    start: p.optional(point),
    motion: p.optional(motionConfig),
    clickTargets: p.optional(p.array(nonEmptyString)),
    onLoop: p.optional(runCallback),
    visibility: p.optional(p.number({range: {min: 0, max: 1}})),
    freezeAt: p.optional(nonNegativeNumber),
    exploreHint: p.optional(exploreHint),
});

export type RoutineInput = Infer<typeof routine>;

const steps = p.array(step, {len: {min: 1}});

export function validateRoutine(value: unknown): ReturnType<Pred<RoutineInput>> {
    return routine(value);
}

export function validateSteps(value: unknown): ReturnType<Pred<Infer<typeof steps>>> {
    return steps(value);
}
