import path from 'node:path';

const DOCS_SEGMENT = `${path.sep}src${path.sep}content${path.sep}docs${path.sep}`;

/**
 * Guides open with a GitHub-friendly `# Title` and no frontmatter. Starlight
 * already prints that title above the content, so drop the heading from the
 * body — otherwise every page says its name twice.
 */
export function remarkDropTitle() {
    return (tree, file) => {
        if (!file.path?.includes(DOCS_SEGMENT)) return;

        const first = tree.children[0];

        if (first?.type === 'heading' && first.depth === 1) tree.children.shift();
    };
}
