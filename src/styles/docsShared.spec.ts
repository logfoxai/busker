import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'kizu';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('header social links match Callspec (GitHub + Discord)', (assert) => {
    const astro = readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');

    assert.equal(astro.includes("icon: 'github'"), true);
    assert.equal(astro.includes("icon: 'discord'"), true);
    assert.equal(astro.includes('discord.gg/2wyYnBDhWQ'), true);
});

test('guide site footer is a Starlight override with GitHub and MIT', (assert) => {
    const astro = readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');
    const footer = readFileSync(path.join(root, 'src/overrides/Footer.astro'), 'utf8');
    const site = readFileSync(path.join(root, 'src/components/SiteFooter.astro'), 'utf8');

    assert.equal(astro.includes("Footer: './src/overrides/Footer.astro'"), true);
    assert.equal(footer.includes('SiteFooter'), true);
    assert.equal(site.includes('github.com/logfoxai/busker'), true);
    assert.equal(site.includes('MIT'), true);
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

test('header social icons use flat chrome stylesheet', (assert) => {
    const astro = readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');
    const social = readFileSync(path.join(root, 'src/styles/docs-social-icons.css'), 'utf8');
    const override = readFileSync(path.join(root, 'src/overrides/SocialIcons.astro'), 'utf8');

    assert.equal(astro.includes('./src/styles/docs-social-icons.css'), true);
    assert.equal(astro.includes("SocialIcons: './src/overrides/SocialIcons.astro'"), true);
    assert.equal(social.includes('background: transparent'), true);
    assert.equal(social.includes('border: none'), true);
    assert.equal(override.includes('<style>'), false);
});

test('Starlight CTAs load solid primary pill buttons', (assert) => {
    const astro = readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');
    const brand = readFileSync(path.join(root, 'src/styles/docs-brand-buttons.css'), 'utf8');

    assert.equal(astro.includes('./src/styles/docs-brand-buttons.css'), true);
    assert.equal(brand.includes('border-radius: 999px'), true);
    assert.equal(brand.includes('background: var(--docs-primary-bg)'), true);
    assert.equal(brand.includes('linear-gradient'), false);
    assert.equal(brand.includes('outline: 2px solid var(--docs-primary-bg)'), true);
});

test('lockup mark svg is block-level so explorer matches docs alignment', (assert) => {
    const shared = readFileSync(path.join(root, 'src/styles/docs-shared.css'), 'utf8');

    assert.equal(shared.includes('.cs-lockup__mark {\n    display: block;'), true);
    assert.equal(shared.includes('.cs-lockup__mark svg'), false);
    assert.equal(shared.includes('--cs-lockup-word-size: 1.3rem'), true);
    assert.equal(shared.includes(".cs-lockup[data-holes='overlay'] .cs-eq"), true);
});
