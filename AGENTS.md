For coding agents: read [skills/busker/SKILL.md](skills/busker/SKILL.md).

## Docs dev server (`localhost:4321`)

- **Never kill or `kill -9` the process on port 4321** (or 4322–4330). If the user has `npm run astro:dev` running, leave it alone.
- **`npm run validate` is OK while dev is running.** `astro:build` skips `astro sync` when dev is up so it does not rewrite `.astro` under the live server. Do not stop dev to validate. Do not run `clean-astro-cache` or `FORCE_ASTRO_FULL_BUILD=1` while the user has dev up.
- Start **`npm run astro:dev` (or `npm run dev`) only when nothing is listening on 4321–4330** — the script refuses a second dev server. Do not restart dev on the user's behalf unless they ask.
