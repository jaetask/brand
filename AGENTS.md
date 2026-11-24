# AGENTS.md

Brand: define and maintain many brands, an App on [@jaetask/open-agent-kit](https://github.com/jaetask/open-agent-kit). TypeScript, Node 22.13+, ESM, built with tsc. Read [README.md](README.md) first.

- **Your data stays yours**: Brand is open source. Brand data lives in `data/` and is never committed. The pre-commit hook and `check:data` (part of `lint`) refuse `data/`, database files and `.env`. Tests use in-memory databases and made-up brands only.
- **Language**: use the words in [GLOSSARY.md](GLOSSARY.md), never their _Avoid_ synonyms.
- **The plan is hoeem's method**: every brand runs by the five steps of hoeem's "I want to turn my X account into income". Keep his step names, his order and the link back to his guide on each step.
- **Every caller goes through the Call pipeline**: the page, agents and other Apps change brands only by invoking Actions in `src/mkt/domain.ts`. The brand logic in `src/mkt` and the page in `page/app` come from the Marketing app and keep its behaviour, names and look; only the colours differ (`page/app/palette.css`, Tasks' neutral greys). Brand data is a PGlite database in `data/pglite`.
- **History is kept**: guidance, lines and proof are versioned and never rewritten. Archive is how a brand is retired.
- **The page** is in `page/`: the shell (`page/shell`) is built from [@jaetask/toolkit](https://github.com/jaetask/toolkit) and checked by `toolkit-guard`; the brand pages (`page/app`) are Marketing's, with panels and edit pages that open with Back, Cancel and Save.
- **Checks**: `npm run typecheck`, `lint`, `format:check`, `test`, `build`. Hooks in `.agents/guardrails/hooks` run them on commit and push; `npm run format` fixes formatting.
- **Branches**: push a branch, never main. `auto-pr` opens a pull request to main and it merges itself when the `ci` check passes; the pre-push hook refuses main.
- **Commits are made as jaetask**: the pre-commit hook refuses any other author.
- **Public docs state decisions only** and use plain, literal language. `npm run check:docs` (part of `lint`) enforces it.
- **No code comments**: say it in the code, a name or a test. `check-comments` (part of `lint`) fails any new comment.
- Skills pave, visualize, guardrails, delete-comment, remove-the-human and trail come from jaetask/skills and ux-flow from jaetask/toolkit, pinned in `skills-lock.json`. Update with `npx skills update`.
- Log friction and decisions with the trail skill. When corrected, or when the same friction repeats, use the pave skill.
