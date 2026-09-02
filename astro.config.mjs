import {defineConfig} from 'astro/config';
import {unified} from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import {remarkDropTitle} from './src/integrations/remark-drop-title.mjs';
import {remarkStarlightMdLinks} from './src/integrations/remark-starlight-md-links.mjs';

const site = 'https://busker.logfox.ai';
const ogImage = `${site}/og.png`;
const description = 'Scripted cursor demos that really click. Drive a fake product UI with a routine, not a stopwatch.';

const ogTag = (property, content) => ({tag: 'meta', attrs: {property, content}});

export default defineConfig({
    site,
    outDir: './docs-site',
    devToolbar: {enabled: false},
    // Brand art is the single source of truth for the README and the site.
    publicDir: './assets',
    markdown: {
        processor: unified({remarkPlugins: [remarkDropTitle, remarkStarlightMdLinks]}),
    },
    integrations: [
        starlight({
            title: 'busker',
            description,
            // The 404 is a guide page, so it gets the normal chrome.
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
                ogTag('og:image:alt', 'busker — scripted cursor demos that really click'),
                {tag: 'meta', attrs: {name: 'twitter:card', content: 'summary_large_image'}},
                {tag: 'meta', attrs: {name: 'twitter:image', content: ogImage}},
            ],
            customCss: ['./src/styles/custom.css'],
            components: {Hero: './src/overrides/Hero.astro'},
            social: [
                {icon: 'github', label: 'GitHub', href: 'https://github.com/logfoxai/busker'},
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
    ],
});
