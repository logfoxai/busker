import {readFile} from 'node:fs/promises';
import {docsLoader} from '@astrojs/starlight/loaders';
import type {Loader} from 'astro/loaders';

/**
 * Starlight requires a frontmatter `title`; the guides use a GitHub-friendly
 * `# Title` instead so the same file reads correctly in a checkout. Inject the
 * title from the first heading before schema validation.
 */
export function githubFriendlyDocsLoader(): Loader {
    const inner = docsLoader();

    return {
        name: 'github-friendly-docs-loader',
        load: async (context) => {
            const parseData = context.parseData.bind(context);

            context.parseData = async (props) => {
                const {data, filePath} = props;

                if (!data.title && filePath?.endsWith('.md')) {
                    const contents = await readFile(filePath, 'utf-8');

                    if (!contents.startsWith('---')) {
                        const match = contents.match(/^# (.+)\r?\n/);

                        if (match) return parseData({...props, data: {...data, title: match[1]}});
                    }
                }

                return parseData(props);
            };

            return inner.load(context);
        },
    };
}
