# Brand

Define and maintain brands, many of them, in one place.

Brand holds everything that makes a brand itself: who it is, what it believes, its voice, colours and type, the words it defines, and the plan it runs by. Agents and other Apps read it over MCP, so every draft, page and post starts from the same brand.

**[Read the user guide](https://jaetask.github.io/brand/)** (source: [`docs/index.html`](docs/index.html))

## The goal

Recreate the brand side of the Marketing app as its own App on [open-agent-kit](https://github.com/jaetask/open-agent-kit), styled with [@jaetask/toolkit](https://github.com/jaetask/toolkit). For each brand:

- **Profile**: who you are, your peers, where you post.
- **What you believe**: the lines that define the brand's character.
- **Voice and look**: voice, colours, typography, logos and definitions.
- **Overview**: what you want, and how far along the plan is.
- **The plan**: hoeem's five steps from "I want to turn my X account into income": Proof, Your person, Association, Product and Belt.
- **The funnel and seasons**.

Content, calendars, results and interviews are not part of Brand; they will live in their own App.

## Run it

```
npm install
npm run build
npm start
```

Brand runs at http://127.0.0.1:8093 and keeps its data in `data/pglite`. It answers only requests from this computer, and agents connect over MCP at `/mcp`. Set `PORT`, `HOST` and `DATA_DIR` to change the defaults.

## Bring brands over from Marketing

```
npm run migrate:marketing -- --from <a backup copy of Marketing's data/pglite>
```

It copies every brand, its guidance versions, lines, proof, channels, accounts, peers, seasons and history into a new `data/pglite`. It reads from a temporary copy of the backup, refuses Marketing's live database, never writes over an existing `data/pglite`, and checks each table's count.

## Your data stays yours

Brand is open source; your brands are not. Everything a brand holds lives in `data/` on your machine, which git ignores, and a pre-commit hook refuses database files, `data/` and `.env`.

## License

[MIT](LICENSE)
