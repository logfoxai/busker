import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'kizu';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('guide site footer is a Starlight override with GitHub and MIT', (assert) => {
    const astro = readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');
    const footer = readFileSync(path.join(root, 'src/overrides/Footer.astro'), 'utf8');
    const site = readFileSync(path.join(root, 'src/components/SiteFooter.astro'), 'utf8');

    assert.equal(astro.includes("Footer: './src/overrides/Footer.astro'"), true);
    assert.equal(footer.includes('SiteFooter'), true);
    assert.equal(site.includes('github.com/logfoxai/busker'), true);
    assert.equal(site.includes('MIT'), true);
    assert.equal(site.includes('discord.gg/'), false);
});

test('custom pages are Astro, not collection MDX', (assert) => {
    const astro = readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');

    assert.equal(existsSync(path.join(root, 'src/pages/index.astro')), true);
    assert.equal(existsSync(path.join(root, 'src/pages/404.astro')), true);
    assert.equal(existsSync(path.join(root, 'src/content/docs/index.mdx')), false);
    assert.equal(existsSync(path.join(root, 'src/content/docs/404.mdx')), false);
    assert.equal(astro.includes('disable404Route: true'), true);
});

test('docs highlight aliases the primary fill token', (assert) => {
    const shared = readFileSync(path.join(root, 'src/styles/docs-shared.css'), 'utf8');
    const starlight = readFileSync(path.join(root, 'src/styles/starlight-custom.css'), 'utf8');

    assert.equal(shared.includes('--docs-link: var(--docs-primary-bg)'), true);
    assert.equal(shared.includes('--cs-cyan: var(--docs-primary-bg)'), true);
    assert.equal(shared.includes('--cs-link: var(--docs-primary-bg)'), true);
    assert.equal(starlight.includes('--sl-color-text-accent: var(--docs-primary-bg)'), true);
    assert.equal(starlight.includes('--sl-color-accent-high: var(--docs-primary-bg)'), true);
    assert.equal(shared.includes('--docs-primary-hover-bg: var(--docs-primary-bg)'), true);
});

test('lockup mark svg is block-level so explorer matches docs alignment', (assert) => {
    const shared = readFileSync(path.join(root, 'src/styles/docs-shared.css'), 'utf8');

    assert.equal(shared.includes('.cs-lockup__mark {\n    display: block;'), true);
    assert.equal(shared.includes('.cs-lockup__mark svg'), false);
    assert.equal(shared.includes('--cs-lockup-word-size: 1.3rem'), true);
    assert.equal(shared.includes(".cs-lockup[data-holes='overlay'] .cs-eq"), true);
});
