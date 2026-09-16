import type {Routine} from './types.ts';

const LEGACY =
    'busker: routines must use `steps` only. Hand-timed `duration` / `moves` were removed in v2.';

/** Reject the pre-v2 hand-timed routine shape at runtime (and loose JS callers). */
export function assertScriptRoutine(routine: Routine & Record<string, unknown>): void {
    if ('duration' in routine && routine.duration !== undefined) {
        throw new Error(LEGACY);
    }

    if ('moves' in routine && routine.moves !== undefined) {
        throw new Error(LEGACY);
    }

    if (!routine.steps?.length) {
        throw new Error(`${LEGACY} Pass a non-empty \`steps\` array.`);
    }
}
