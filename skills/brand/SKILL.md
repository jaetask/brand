---

name: brand
description: Use when working with a brand's profile, lines, voice and look, or hoeem's five-step plan in the Brand app (proof, your person, association, product, belt, seasons). Read a brand with brand__brand-read before writing anything in its voice.
---

# Brand

Brand holds every brand: who it is, what it believes, how it sounds and looks, and the plan it runs by. Connect to it over MCP at `http://127.0.0.1:8093/mcp`. Every tool below is an Action; the page uses the same ones.

## The method

Every brand runs by hoeem's "I want to turn my X account into income (full course)" (@hooeem, https://x.com/hooeem/status/2120955142438834287). When a decision is unclear, check what the article says first. When content is easy to make, proof is what people trust: show real work, real results and real mistakes. Never invent a result.

## Read first

- `brand__brand-list`: the brands, in sidebar order.
- `brand__brand-read`: one brand in full. `guidance` holds the voice, look, principles, conduct, audience promise and the plan. `plan.levels` says which step is done, partial or empty, and what is missing.

Before drafting anything for a brand, read its voice (`guidance.voice`, `guidance.verbalStyle`), its accepted lines (`identity` with status `accepted`) and its principles. Credit every borrowed phrase.

## The five steps

1. **Proof** (`plan.proof.path`, A or B, and `proof`): an entry counts when it is firsthand and has a `proofUrl` anyone can open. Add with `brand__proof-add`.
2. **Your person** (`plan.person`): who, their pain, what they pay for, and the four tests scored 1 to 10 with a note.
3. **Association** (`plan.association`): 5 themes with a post idea, 3 Anti-Brand items with our standard, 2 or 3 visual constants, and the verbal style.
4. **Product** (`plan.product.freeProducts`): the free thing, its hook, and its release gates. It delivers when every gate is ticked.
5. **Belt** (`plan.belt`): the public project, its exact promise, target, launch date, where the deadline shows, the delay plan and the weekly check-in day.

Save any of these with `brand__guidance-save`, giving each changed step whole (for example `plan: { person: {...} }`) and a short `note`. Every save is a new version; nothing is overwritten.

## Lines

`brand__identity-add` adds a line as suggested. Only the owner accepts, rejects or retires lines (`brand__identity-status-set`). Give the credit when the idea is someone else's.

## Seasons

90 days each: `brand__season-save` sets dates, goal, path, target and proof needed; `brand__season-idea-save` keeps an idea for a later season.

## Rules

- Change brands only through these tools.
- Brand data is private. Never copy it into a repository, an issue or anything public.
