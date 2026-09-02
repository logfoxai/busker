#!/usr/bin/env node
/**
 * Copy self-hosted Latin woff2 files into assets/fonts/.
 * - Inter: @fontsource-variable/inter (resolved from node_modules)
 * - JetBrainsMono Nerd Font Mono: committed OFL woff2 (upstream restructured
 *   away from serving raw files, so the committed copies are the source of
 *   truth and are only verified here)
 *
 * Committed copies are served from publicDir (/fonts/…) so docs work without
 * relying on node_modules path resolution at runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destDir = path.join(root, 'assets/fonts');

const fontsource = [
    [
        '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
        'inter-latin-wght-normal.woff2',
    ],
];

const nerdFonts = ['jetbrains-mono-nerd-mono-400.woff2', 'jetbrains-mono-nerd-mono-600.woff2'];

const retired = [
    'geist-latin-wght-normal.woff2',
    'outfit-latin-wght-normal.woff2',
    'jetbrains-mono-latin-400-normal.woff2',
    'jetbrains-mono-latin-600-normal.woff2',
    'plus-jakarta-sans-latin-wght-normal.woff2',
    'space-grotesk-latin-wght-normal.woff2',
    'ibm-plex-sans-latin-wght-normal.woff2',
    'ibm-plex-mono-latin-400-normal.woff2',
    'ibm-plex-mono-latin-600-normal.woff2',
    'caveat-latin-600-normal.woff2',
];

fs.mkdirSync(destDir, {recursive: true});

for (const [pkgPath, filename] of fontsource) {
    const src = require.resolve(pkgPath);
    const dest = path.join(destDir, filename);
    fs.copyFileSync(src, dest);
    console.log(`sync-fonts: ${filename}`);
}

for (const filename of nerdFonts) {
    const dest = path.join(destDir, filename);
    if (!fs.existsSync(dest)) {
        console.error(`sync-fonts: missing committed font ${filename} (re-add from upstream nerd-fonts-woff2)`);
        process.exit(1);
    }
    console.log(`sync-fonts: ${filename} (committed)`);
}

for (const filename of retired) {
    const dest = path.join(destDir, filename);
    if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
        console.log(`sync-fonts: removed ${filename}`);
    }
}
