import {validateRoutine, validateSteps} from './routine-schema.ts';
import type {Routine, Step} from './types.ts';

const PREFIX = 'busker:';

function formatErrors(errors: Record<string, string>): string {
    return Object.entries(errors)
        .map(([path, message]) => (path === 'root' ? message : `${path}: ${message}`))
        .join('; ');
}

/** Throw if `routine` is not a valid {@link Routine}. Does not touch the DOM. */
export function assertScriptRoutine(routine: unknown): asserts routine is Routine {
    const result = validateRoutine(routine);

    if (!result.isValid) {
        throw new Error(`${PREFIX} ${formatErrors(result.errors)}`);
    }
}

/** Throw if `steps` is not a non-empty array of atomic script beats. */
export function assertSteps(value: unknown): asserts value is Step[] {
    const result = validateSteps(value);

    if (!result.isValid) {
        throw new Error(`${PREFIX} ${formatErrors(result.errors)}`);
    }
}
