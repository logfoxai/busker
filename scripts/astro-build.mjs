#!/usr/bin/env node
/**
 * Production docs build. When astro:dev is listening, skip `astro sync` so we do not
 * rewrite `.astro` under a live dev server (that is what knocks out localhost:4321).
 */
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {astroDevPortsInUse} from '../src/integrations/assertAstroDevFree.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args) {
    const result = spawnSync(command, args, {
        cwd: root,
        stdio: 'inherit',
        env: process.env,
    });

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

const busy = await astroDevPortsInUse();
const forceFull = process.env.FORCE_ASTRO_FULL_BUILD === '1';

if (busy.length === 0 || forceFull) {
    if (busy.length > 0 && forceFull) {
        console.warn(
            'FORCE_ASTRO_FULL_BUILD=1: running astro sync while dev is up (may disturb the dev server).',
        );
    }

    run('npx', ['astro', 'sync']);
} else {
    console.log(
        `astro-build: dev on port(s) ${busy.join(', ')} — skipping astro sync (dev server stays up).`,
    );
}

run('npx', ['astro', 'build']);
run('node', ['scripts/write-cs-pagefind-shim.mjs']);
