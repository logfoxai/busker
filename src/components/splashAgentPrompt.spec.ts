import {test} from 'kizu';
import {
    BUSKER_GITHUB,
    buildBuskerAgentPrompt,
    githubRawPath,
} from './splashAgentPrompt.js';

test('buildBuskerAgentPrompt points at GitHub raw markdown, not the docs site', (assert) => {
    const prompt = buildBuskerAgentPrompt('wire a crema-style demo');

    assert.equal(prompt.includes('wire a crema-style demo'), true);
    assert.equal(prompt.includes(BUSKER_GITHUB), true);
    assert.equal(prompt.includes('raw.githubusercontent.com/logfoxai/busker/main/'), true);
    assert.equal(prompt.includes(githubRawPath('skills/busker/SKILL.md')), true);
    assert.equal(prompt.includes(githubRawPath('src/content/docs/getting-started.md')), true);
    assert.equal(prompt.includes('do not scrape busker.logfox.ai'), true);
    assert.equal(prompt.includes('busker.logfox.ai/getting-started'), false);
});
