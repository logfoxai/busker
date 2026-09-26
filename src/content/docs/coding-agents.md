# Working with coding agents

If you build busks with Cursor, Claude Code, Copilot, or similar tools, give the agent a **skill** and a **starter prompt** so it follows busker conventions (real clicks and `{ run }` steps) instead of timing UI with `setTimeout`.

## Install the skill

The skill lives at [`skills/busker/SKILL.md`](../../skills/busker/SKILL.md) in this repo (and under `skills/` in the npm package).

**Cursor:** copy or symlink it to `.cursor/skills/busker/SKILL.md`. From npm:

```bash
mkdir -p .cursor/skills/busker
ln -sf "$(npm root)/@logfox/busker/skills/busker/SKILL.md" .cursor/skills/busker/SKILL.md
```

Adjust the path if you use a monorepo checkout instead of `node_modules`.

## Paste a starter prompt

On the [busker homepage](https://busker.logfox.ai/), **Get agent prompt** copies a ready-made message into your clipboard. Paste it into your agent chat, replace the `Task:` line with what you want (new mock, routine tweak, hover styling, etc.), and send.

Or copy the template below:

```text
We're using busker (https://github.com/logfoxai/busker) for a scripted cursor demo on our landing page.

Follow the busker skill.

Task: <what you want — e.g. add a homepage mock, wire a routine, fix demo hover styling>

Docs are markdown in the GitHub repo — do not scrape busker.logfox.ai (HTML docs site). Read sources via raw.githubusercontent.com:
- README (index): https://raw.githubusercontent.com/logfoxai/busker/main/README.md
- Skill: https://raw.githubusercontent.com/logfoxai/busker/main/skills/busker/SKILL.md
- Guides (start with these): getting-started.md, markup.md, routines.md, styling.md
- Raw base for guides: https://raw.githubusercontent.com/logfoxai/busker/main/src/content/docs/
  Example: https://raw.githubusercontent.com/logfoxai/busker/main/src/content/docs/getting-started.md

To browse the tree, use the GitHub repo and fetch file contents with raw URLs (https://raw.githubusercontent.com/logfoxai/busker/main/<path>).

Install or attach the skill: copy skills/busker/SKILL.md to .cursor/skills/busker/SKILL.md (or symlink to node_modules/@logfox/busker/skills/busker/SKILL.md from npm).
```

The block above is what the agent reads after you paste it. You do not need to hunt raw URLs yourself unless you are editing the prompt template in this repo.
