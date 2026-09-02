import {defineConfig} from 'astro/config';
import {unified} from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import {devPagefindPlugin} from './src/integrations/devPagefind.mjs';
import {pagefindShimIntegration} from './src/integrations/pagefindShim.mjs';
import {remarkStarlightMdLinks} from './src/integrations/remark-starlight-md-links.mjs';
import {remarkDropTitle} from './src/integrations/remark-drop-title.mjs';
import {rehypeWrapTables} from './src/integrations/rehype-wrap-tables.mjs';

const isDev = process.env.NODE_ENV !== 'production';
const site = 'https://busker.logfox.ai';
const ogImage = `${site}/og.png`;
const ogImageAlt = 'busker — scripted cursor demos that really click';
const description =
    'Drive a fake product UI with a routine, not a stopwatch. The cursor really clicks, so the page changes through your own handlers — and visitors can take over.';

const ogTag = (property, content) => ({tag: 'meta', attrs: {property, content}});

export default defineConfig({
    // Hover-prefetching every sidebar link hammers Vite in dev and freezes tabs.
    prefetch: isDev ? false : {prefetchAll: true, defaultStrategy: 'hover'},
    devToolbar: {enabled: false},
    markdown: {
        processor: unified({
            remarkPlugins: [remarkDropTitle, remarkStarlightMdLinks],
            rehypePlugins: [rehypeWrapTables],
        }),
    },
    site,
    outDir: './docs-site',
    // Brand / docs static media — single source of truth (also used by README)
    publicDir: './assets',
    // Dev server only: Origin-bearing cross-site requests (proxies / some IDE previews).
    security: {
        allowedDomains: [{}],
    },
    // HTML + Vite modules — Cursor Simple Browser and Chrome otherwise keep stale CSS.
    server: {
        headers: {
            'Cache-Control': 'no-store',
        },
    },
    vite: {
        plugins: [...(isDev ? [devPagefindPlugin()] : [])],
        // Vite 8 defaults cssMinify to lightningcss, which drops unprefixed
        // backdrop-filter when -webkit- is present — Chromium then skips frost.
        // https://github.com/vitejs/vite/issues/22649
        build: {
            cssMinify: 'esbuild',
        },
        server: {
            cors: true,
            headers: {
                'Cache-Control': 'no-store',
            },
            watch: {
                // Build output must not reload dev — corrupts Starlight content sync.
                // c8 HTML reports during `npm test` / validate must not restart dev mid-session.
                ignored: ['**/docs-site/**', '**/coverage/**'],
            },
        },
    },
    integrations: [
        starlight({
            title: 'busker',
            description,
            // Custom 404 is src/pages/404.astro — Starlight's injected route would collide.
            disable404Route: true,
            logo: {
                light: './assets/busker-lockup-light.svg',
                dark: './assets/busker-lockup-dark.svg',
                replacesTitle: true,
            },
            favicon: '/favicon.svg',
            head: [
                ogTag('og:image', ogImage),
                ogTag('og:image:type', 'image/png'),
                ogTag('og:image:width', '1200'),
                ogTag('og:image:height', '630'),
                ogTag('og:image:alt', ogImageAlt),
                {tag: 'meta', attrs: {name: 'twitter:card', content: 'summary_large_image'}},
                {tag: 'meta', attrs: {name: 'twitter:image', content: ogImage}},
                {tag: 'meta', attrs: {name: 'twitter:image:alt', content: ogImageAlt}},
            ],
            // Code block chrome lives in ec.config.mjs (ui-components Code look)
            expressiveCode: true,
            customCss: [
                './src/styles/fonts.css',
                './src/styles/docs-shared.css',
                './src/styles/starlight-custom.css',
            ],
            components: {
                Head: './src/overrides/Head.astro',
                Header: './src/overrides/Header.astro',
                Hero: './src/overrides/Hero.astro',
                Search: './src/overrides/Search.astro',
                ThemeSelect: './src/overrides/ThemeSelect.astro',
                MobileMenuToggle: './src/overrides/MobileMenuToggle.astro',
                MobileMenuFooter: './src/overrides/MobileMenuFooter.astro',
                PageFrame: './src/overrides/PageFrame.astro',
                PageTitle: './src/overrides/PageTitle.astro',
                Footer: './src/overrides/Footer.astro',
            },
            social: [
                {
                    icon: 'github',
                    label: 'GitHub',
                    href: 'https://github.com/logfoxai/busker',
                },
            ],
            sidebar: [
                {
                    label: 'Introduction',
                    items: [
                        {label: 'Getting started', slug: 'getting-started'},
                        {label: 'Markup', slug: 'markup'},
                    ],
                },
                {
                    label: 'Routines',
                    items: [
                        {label: 'Click-driven routines', slug: 'routines'},
                        {label: 'Hand-timed routines', slug: 'timeline'},
                        {label: 'When a visitor takes over', slug: 'taking-over'},
                    ],
                },
                {
                    label: 'Reference',
                    items: [
                        {label: 'API reference', slug: 'api-reference'},
                        {label: 'Styling', slug: 'styling'},
                    ],
                },
                {
                    label: 'Project',
                    items: [{label: 'Development', slug: 'development'}],
                },
            ],
        }),
        pagefindShimIntegration(),
    ],
});
