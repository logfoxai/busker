import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'kizu';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('coding-agents.md points at SKILL.md instead of embedding it', (assert) => {

    const skill = readFileSync(path.join(root, 'skills/busker/SKILL.md'), 'utf8')
        .replace(/\r\n/g, '\n')
        .replace(/\n$/, '');
    const page = readFileSync(path.join(root, 'src/content/docs/coding-agents.md'), 'utf8');

    assert.equal(page.includes('skills/busker/SKILL.md'), true);
    assert.equal(page.includes(skill), false);
    assert.equal(/````markdown title="SKILL\.md"/.test(page), false);

});
