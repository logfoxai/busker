# Working with Coding Agents

Copy-paste prompts for Cursor, Claude Code, Copilot, and similar tools &mdash; so agents adopt busker conventions instead of timing page changes with `setTimeout`.

## Docs prose

In `src/content/docs/`, write em dashes as `&mdash;` in prose (not the Unicode `—` character). Starlight and GitHub decode it on render; it keeps agents from copying literal em dashes into new edits. Leave dashes inside fenced code blocks and string literals as-is.

## busker skill

[`skills/busker/SKILL.md`](../../skills/busker/SKILL.md) (also in the npm package under `skills/`)

**Cursor:** save as `.cursor/skills/busker/SKILL.md` (or symlink that path to `node_modules/@logfox/busker/skills/busker/SKILL.md` / this repo).

## Reading docs from GitHub

Guides are markdown in this repo under `src/content/docs/`. Prefer a checkout; when fetching over HTTP, use **`raw.githubusercontent.com/logfoxai/busker/main/`** + path (plain markdown). Do not scrape [busker.logfox.ai](https://busker.logfox.ai) &mdash; that is HTML.

## Prompt: work with busker

Install or attach the skill first, then:

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

The splash homepage **For coding agents** button copies this prompt.
