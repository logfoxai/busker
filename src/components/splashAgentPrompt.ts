import {COPY_FEEDBACK_MS, copyButtonContent, tryCopyText} from './codeBlockTitles.js';

export const BUSKER_GITHUB = 'https://github.com/logfoxai/busker';
const BUSKER_RAW_MAIN = 'https://raw.githubusercontent.com/logfoxai/busker/main/';

export function githubRawPath(repoPath: string): string {
    return `${BUSKER_RAW_MAIN}${repoPath.replace(/^\//, '')}`;
}

const DEFAULT_TASK =
    '<what you want — e.g. add a homepage mock, wire a routine, fix demo hover styling>';

/** Clipboard text for Cursor, Claude Code, Copilot, etc. — GitHub markdown via raw URLs. */
export function buildBuskerAgentPrompt(
    task: string = DEFAULT_TASK,
): string {
    const docsBase = githubRawPath('src/content/docs/');
    return [
        `We're using busker (${BUSKER_GITHUB}) for a scripted cursor demo on our landing page.`,
        '',
        'Follow the busker skill.',
        '',
        `Task: ${task}`,
        '',
        'Docs are markdown in the GitHub repo — do not scrape busker.logfox.ai (HTML docs site). Read sources via raw.githubusercontent.com:',
        `- README (index): ${githubRawPath('README.md')}`,
        `- Skill: ${githubRawPath('skills/busker/SKILL.md')}`,
        '- Guides (start with these): getting-started.md, markup.md, routines.md, styling.md',
        `- Raw base for guides: ${docsBase}`,
        `  Example: ${githubRawPath('src/content/docs/getting-started.md')}`,
        '',
        'To browse the tree, use the GitHub repo and fetch file contents with raw URLs',
        `(https://raw.githubusercontent.com/logfoxai/busker/main/<path>).`,
        '',
        'Install or attach the skill: copy skills/busker/SKILL.md to .cursor/skills/busker/SKILL.md',
        '(or symlink to node_modules/@logfox/busker/skills/busker/SKILL.md from npm).',
    ].join('\n');
}

export function wireSplashAgentCopyButton(root: ParentNode = document): void {
    const trigger = root.querySelector<HTMLElement>('[data-splash-agent-copy]');
    if (!trigger || trigger.dataset.splashAgentCopyWired === 'true') {
        return;
    }
    trigger.dataset.splashAgentCopyWired = 'true';

    const labelEl = trigger.querySelector<HTMLElement>('[data-splash-agent-copy-label]');
    const idleLabel =
        trigger.dataset.splashAgentCopyIdleLabel
        ?? labelEl?.textContent?.trim()
        ?? 'For coding agents';

    trigger.addEventListener('click', (event) => {
        event.preventDefault();
        void tryCopyText(buildBuskerAgentPrompt()).then((ok) => {
            if (!ok || !labelEl) {
                return;
            }
            labelEl.textContent = copyButtonContent(true, idleLabel).label;
            window.setTimeout(() => {
                labelEl.textContent = idleLabel;
            }, COPY_FEEDBACK_MS);
        });
    });
}
