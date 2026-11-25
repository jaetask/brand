# Brand

Define and maintain your brands in one place.

Brand holds everything that makes each of your brands itself: who it is, what it believes, how it sounds and looks, and the plan it runs by. Your agents read the same brand over MCP, so every draft and post they make starts from it.

**[Read the user guide](https://jaetask.github.io/brand/)** (source: [`docs/index.html`](docs/index.html))

## What it is

- **Many brands, one app.** Each brand sits in the sidebar with a dot: orange while its plan is under 100%, green once every step is done. The Brands page adds, hides, archives and deletes brands; deleting writes a backup first.
- **A profile per brand.** Identity (picture, name, tagline, colours, images), goals, how it sounds (key phrases, borrowed phrases with credit, tone rules, an example), the peers it looks up to, where it posts, and its seasons. Each panel opens its own edit page with Back, Cancel and Save.
- **Lines.** Short, quotable sentences that define the brand's character, with credit. Agents suggest them; only you accept or reject them.
- **The plan.** hoeem's five steps from ["I want to turn my X account into income"](https://x.com/hooeem/status/2120955142438834287): Proof, Your person, Association, Product and Belt. Each step has a "Done when" panel, and every save is a new version.
- **Proof.** Entries count for step 1 when they are firsthand and have a link anyone can open; they fill the season's slots.
- **Seasons.** The plan runs 90 days at a time, each season with its dates, goal, path and target.
- **Built for agents.** Every change is an Action served over MCP. Agents connect with your approval and read [`skills/brand/SKILL.md`](skills/brand/SKILL.md), also served at `/skill.md`.

The words above are defined in the [glossary](GLOSSARY.md).

## How it is built

Brand is an App on [open-agent-kit](https://github.com/jaetask/open-agent-kit): every caller reaches it through one Call pipeline. Its brands live in a PGlite database in `data/pglite`. The shell is built from [@jaetask/toolkit](https://github.com/jaetask/toolkit).

```
src/mkt/       brands, the plan, lines, proof, peers and seasons, and their Actions
src/shared/    the plan's rules, shared by the server and the page
page/shell/    the app shell, routing and Connections
page/app/      the brand pages
skills/brand/  how agents use Brand
```

## Run it

```
npm install
npm run build
npm start
```

Brand runs at http://127.0.0.1:8093. It answers only requests from this computer, and agents connect over MCP at `/mcp`. Set `PORT`, `HOST` and `DATA_DIR` to change the defaults. To connect an agent, run `npm run connect -- "<name>"` and approve it on the Connections page.

## Bring brands over from Marketing

```
npm run migrate:marketing -- --from <a backup copy of Marketing's data/pglite>
```

It copies every brand with its guidance versions, lines, proof, channels, accounts, peers, seasons and history into a new `data/pglite`. It reads from a temporary copy of the backup, refuses Marketing's live database, never writes over an existing `data/pglite`, and checks each table's count.

## Your data stays yours

Brand is open source; your brands are not. Everything a brand holds lives in `data/` on your computer, which git ignores, and the pre-commit hook and `npm run check:data` refuse database files, `data/` and `.env`.

## Develop

```
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Node 22.13 or later. Push a branch, never main: `auto-pr` opens a pull request and it merges itself when `ci` passes.

## License

[MIT](LICENSE)
