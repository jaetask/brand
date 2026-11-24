import { z } from "zod";

import { ENTITY_ICONS } from "../shared/entity-appearance.js";

export const id = z.string().min(1).max(120);
export const writer = {
  by: id.describe(
    "Actor ID making this change: the owner's ID for the UI (get-owner), codex (in-app assistant) or your registered harness ID such as claude. Caller-attested attribution, not verified identity.",
  ),
  requestId: id
    .optional()
    .describe("Unique request ID; reuse the same ID and arguments when retrying a create."),
};

export const creator = {
  ...writer,
  requestId: id.describe(
    "Unique request ID; reuse the same ID and arguments when retrying a create.",
  ),
};
export const expectedVersion = z
  .number()
  .int()
  .positive()
  .describe("Current version from the latest read; stale versions are rejected.");
export const name = z.string().trim().min(1).max(160);
export const text = (max = 5000) => z.string().max(max);
export const list = (max = 30, len = 500) => z.array(z.string().trim().min(1).max(len)).max(max);
export const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Use an HTTP or HTTPS URL");

export const deleteKind = z.enum(["entity", "channel", "account"]);
export const previewDelete = z.object({
  kind: deleteKind.describe(
    "What to delete: an entity (with everything under it), a channel (with its accounts) or an account.",
  ),
  id: id.describe("ID of the entity, channel or account."),
});
export const deleteItem = z.object({
  ...writer,
  kind: deleteKind.describe(
    "What to delete: an entity (with everything under it), a channel (with its accounts) or an account.",
  ),
  id: id.describe("ID of the entity, channel or account."),
  confirmName: z
    .string()
    .max(160)
    .describe(
      "The item's exact current name, typed by the owner to confirm. Entities must be archived first.",
    ),
});

export const saveEntity = z.object({
  id: id.optional().describe("Existing entity ID to update; omit to create."),
  expectedVersion: expectedVersion.optional(),
  name: name.optional(),
  purpose: text(2000).optional(),
  audiences: list(20).optional().describe("Intended audiences."),
  goals: list(20).optional().describe("Goals, e.g. acquire the first suitable real user."),
  icon: z.enum(ENTITY_ICONS).optional().describe("Sidebar icon."),
  colour: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Use a #rrggbb colour")
    .optional()
    .describe("Sidebar colour (#rrggbb)."),
  image: z
    .union([
      z.literal(""),
      z
        .string()
        .max(500_000)
        .regex(
          /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/,
          "Use a PNG, JPEG or WebP data URL",
        ),
    ])
    .optional()
    .describe(
      "Profile picture as a data URL (PNG, JPEG or WebP, up to ~500 KB), stored locally; empty string removes it.",
    ),
  images: z
    .array(
      z
        .string()
        .max(700_000)
        .regex(
          /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/,
          "Use a PNG, JPEG or WebP data URL",
        ),
    )
    .max(8)
    .optional()
    .describe("Brand images as data URLs (up to 8), stored locally; replaces the whole list."),
  archived: z
    .boolean()
    .optional()
    .describe("Archive preserves history and blocks new work for this entity."),
  ...writer,
});

export const reorderEntities = z.object({
  entities: z
    .array(z.object({ id, expectedVersion }))
    .min(1)
    .max(500)
    .describe(
      "Every active entity exactly once, in the desired sidebar order, with current versions.",
    ),
  ...writer,
});

export const channelKind = z.enum(["x", "blog", "newsletter", "website", "other"]);
export const saveChannel = z.object({
  id: id.optional(),
  expectedVersion: expectedVersion.optional(),
  entityId: id.optional().describe("Owning entity; required when creating."),
  kind: channelKind.optional().describe("Required when creating; fixed afterwards."),
  name: name.optional(),
  description: text(2000).optional(),
  url: httpUrl.optional(),
  archived: z.boolean().optional(),
  ...writer,
});

export const saveAccount = z.object({
  id: id.optional(),
  expectedVersion: expectedVersion.optional(),
  entityId: id.optional().describe("Owning entity; required when creating."),
  channelId: id.optional().describe("Channel of the same entity; fixed afterwards."),
  name: name.optional(),
  handle: z.string().trim().max(120).optional().describe("Handle without @, e.g. acme."),
  url: httpUrl.optional(),
  role: z
    .string()
    .trim()
    .max(80)
    .optional()
    .describe("Free-text role such as primary, meme or company blog. Not a fixed taxonomy."),
  instructions: text(5000).optional().describe("Account operating instructions."),
  archived: z.boolean().optional(),
  ...writer,
});

const short = (max = 500) => z.string().trim().max(max).default("");
const personTest = z
  .object({
    score: z.number().int().min(1).max(10).nullable().default(null),
    note: short(1000),
  })
  .prefault({});
export const planProof = z.object({
  path: z
    .enum(["", "A", "B"])
    .default("")
    .describe("A: rare, measurable results you already have. B: a volume sprint to earn them."),
});
export const planPerson = z.object({
  who: short().describe("Who the one person is."),
  pain: short().describe("Their urgent or expensive problem, and what it costs them."),
  pays: short().describe("What they already spend money on and would pay you for."),
  tests: z
    .object({
      growingMarket: personTest,
      acutePain: personTest,
      purchasingPower: personTest,
      algorithmicClarity: personTest,
    })
    .prefault({})
    .describe("The four tests, each scored 1-10 with a reason."),
  reviewed: z
    .object({ purpose: short(40), goals: short(40) })
    .partial()
    .optional()
    .describe("When purpose and goals were last confirmed (YYYY-MM-DD)."),
});
export const planAssociation = z.object({
  amplify: z
    .array(
      z.object({
        title: short(120).describe("Short theme title, shown on the calendar."),
        item: short(300),
        postIdea: short(1000),
      }),
    )
    .max(10)
    .default([])
    .describe(
      "Align & Amplify: desires, tools, books or people your person loves (5), each with a post idea.",
    ),
  antiBrand: z
    .array(
      z.object({
        item: short(300),
        standard: short(1000),
        suggestion: z
          .string()
          .trim()
          .max(1000)
          .optional()
          .describe("A proposed standard waiting for the owner to accept."),
      }),
    )
    .max(6)
    .default([])
    .describe("Anti-Brand: what your person can't stand (3), each with how we show our standard."),
  visualConstants: list(5, 300)
    .default([])
    .describe(
      "2 or 3 visual constants kept for a year: profile picture, article cover template, a formatting style.",
    ),
  keep: z
    .array(z.string().max(300))
    .max(20)
    .optional()
    .describe(
      "Visual constants the owner chose to keep as written when the app suggested an update.",
    ),
});
export const planProduct = z.object({
  freeProducts: z
    .array(
      z.object({
        name: short(200),
        hook: short(1000),
        url: z.string().trim().max(2000).default(""),
        delivers: z.enum(["unknown", "yes", "no"]).default("unknown"),
        fixes: short(2000),
        gates: z
          .array(
            z.object({
              label: z.string().trim().min(1).max(300),
              done: z.boolean().default(false),
            }),
          )
          .max(20)
          .optional()
          .describe("Release gates; all ticked means it delivers on its hook."),
        later: z
          .array(z.string().trim().min(1).max(300))
          .max(20)
          .optional()
          .describe("Ideas kept for later."),
        shelved: z
          .boolean()
          .optional()
          .describe("On the shelf: kept but not worked on or counted."),
        suggestedHook: z
          .string()
          .trim()
          .max(1000)
          .optional()
          .describe("A proposed hook waiting for the owner to accept."),
      }),
    )
    .max(20)
    .default([])
    .describe(
      "Free things you ship (a prompt, checklist, bot or article), the hook that sells each, and whether it delivers.",
    ),
});
export const planBelt = z.object({
  project: short(1000),
  promise: short(1000).describe("The exact promise."),
  target: short(200).describe("The target number."),
  launchDate: short(40).describe("Launch date, YYYY-MM-DD."),
  deadlineShown: short(500).describe("Where the deadline is displayed."),
  delayPlan: short(1000).describe("How a delay or missed target will be explained."),
  checkInDay: short(40).describe("Weekly check-in day, e.g. Friday."),
  apps: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        status: z.enum(["public", "private", "planned"]).default("planned"),
        url: z.string().trim().max(2000).optional(),
      }),
    )
    .max(50)
    .optional()
    .describe(
      "The belt's things, one square each: public (a link anyone can open), private (running, not public yet) or planned (not built).",
    ),
  suggestedPromise: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .describe("A proposed wording for the promise, waiting for the owner to accept."),
});
export const brandPlan = z
  .object({
    proof: planProof.prefault({}),
    person: planPerson.prefault({}),
    association: planAssociation.prefault({}),
    product: planProduct.prefault({}),
    belt: planBelt.prefault({}),
  })
  .prefault({});

export const guidance = z.object({
  principles: list(30, 1000),
  conduct: text(5000).default(""),
  audiencePromise: text(2000).default(""),
  verbalStyle: text(5000).default(""),
  voice: z
    .object({
      keyPhrases: list(30, 200).default([]),
      borrowedPhrases: z
        .array(
          z.object({
            phrase: z.string().trim().min(1).max(200),
            from: z.string().trim().max(160).default(""),
          }),
        )
        .max(30)
        .default([]),
      toneRules: text(3000).default(""),
      example: text(3000).default(""),
    })
    .optional()
    .describe(
      "How the brand sounds, structured: key phrases, borrowed phrases with who they're from, tone rules and an example in their words.",
    ),
  visual: z
    .object({
      colours: list(20, 40).default([]),
      typography: text(500).default(""),
      logos: list(10, 2000).default([]).describe("Logo asset paths or URLs; no design editor."),
    })
    .default({ colours: [], typography: "", logos: [] }),
  plan: brandPlan,
});
export const updateGuidance = z.object({
  entityId: id,
  expectedVersion: expectedVersion.describe("Current entity version."),
  guidance: guidance.extend({
    plan: brandPlan
      .optional()
      .describe(
        "The five-level plan. Omit to keep the current plan (save-plan-level edits one level).",
      ),
  }),
  note: text(1000).default("").describe("Why this guidance changed."),
  ...writer,
});

export const persona = z.object({
  tone: text(2000).default(""),
  traits: list(20, 200).default([]),
  audience: text(2000).default(""),
  topics: list(30, 200).default([]),
  boundaries: list(30, 500).default([]),
  examples: list(20, 2000).default([]),
});
export const savePlanLevel = z.object({
  entityId: id,
  expectedVersion: expectedVersion.describe("Current entity version."),
  level: z
    .enum(["proof", "person", "association", "product", "belt"])
    .describe("Which level to save: proof, person, association, product or belt."),
  values: z
    .record(z.string(), z.unknown())
    .describe(
      "That level's fields. proof: {path}. person: {who, pain, pays, tests:{growingMarket:{score,note},…}, audiences?, audiencePromise?, purpose?, goals?}. association: {amplify:[{item,postIdea}], antiBrand:[{item,standard}], visualConstants, verbalStyle?, principles?, conduct?, visual?}. product: {freeProducts:[{name,hook,url,delivers,fixes,gates?:[{label,done}],later?,shelved?,suggestedHook?}]}. belt: {project, promise, target, launchDate, deadlineShown, delayPlan, checkInDay}. Fields left out keep their current value.",
    ),
  note: text(1000).default("").describe("Why this changed (kept with the version)."),
  ...writer,
});
export const getPlan = z.object({
  entityId: id.describe("The brand (entity) id or name."),
});

const dayStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const slotKind = z.enum(["post", "reply", "article", "check-in", "other"]);
export const calendarList = z.object({
  entityId: id.describe("The brand (entity) id or name."),
  from: dayStr.optional().describe("First day, YYYY-MM-DD (default today)."),
  days: z.coerce.number().int().min(1).max(92).default(30),
  accountId: id.optional().describe("Only this account's slots."),
});
export const slotSave = z.object({
  id: z
    .string()
    .min(1)
    .max(300)
    .optional()
    .describe(
      'A stored slot id, or an occurrence id from calendar-list ("rule:<ruleId>:<day>:<n>"); omit to add a one-off slot.',
    ),
  expectedVersion: expectedVersion.optional(),
  entityId: id
    .optional()
    .describe("The brand (entity) id or name; required for a new one-off slot."),
  accountId: id.nullable().optional(),
  day: dayStr.optional(),
  kind: slotKind.optional(),
  title: z.string().trim().max(240).optional(),
  theme: z
    .string()
    .trim()
    .max(300)
    .optional()
    .describe("The Align & Amplify theme it serves (its text)."),
  status: z
    .enum(["planned", "drafted", "in_review", "approved", "published", "skipped"])
    .optional(),
  briefId: id.nullable().optional().describe("The brief that is this slot's content."),
  note: text(2000).optional(),
  ...writer,
});
export const ruleList = z.object({
  entityId: id.describe("The brand (entity) id or name."),
  includeInactive: z.coerce.boolean().default(false),
});
export const ruleSave = z.object({
  id: id.optional().describe("Existing rule to edit; omit to add one."),
  expectedVersion: expectedVersion.optional(),
  entityId: id.optional().describe("The brand (entity) id or name; required when adding."),
  accountId: id.nullable().optional(),
  kind: slotKind.optional(),
  label: z.string().trim().max(160).optional(),
  rrule: z
    .string()
    .trim()
    .max(500)
    .optional()
    .describe(
      'An RFC 5545 rule without DTSTART, e.g. "FREQ=DAILY", "FREQ=WEEKLY;BYDAY=MO", "FREQ=WEEKLY;BYDAY=MO,WE,FR".',
    ),
  perOccurrence: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Slots per occurrence, e.g. 5 replies a day."),
  startDay: dayStr.optional(),
  active: z.coerce.boolean().optional(),
  ...writer,
});
export const calendarSettingsGet = z.object({
  entityId: id.describe("The brand (entity) id or name."),
});
export const calendarSettingsSave = z.object({
  entityId: id.describe("The brand (entity) id or name."),
  startsOn: dayStr
    .nullable()
    .optional()
    .describe("The first day recurring rules make slots (YYYY-MM-DD); null means not started."),
  paused: z.coerce.boolean().optional().describe("Paused calendars make no new slots."),
  expectedVersion: expectedVersion.optional(),
  ...writer,
});
export const runwayGet = z.object({
  entityId: id.describe("The brand (entity) id or name."),
  target: z.coerce.number().int().min(1).max(60).default(7),
});

const identityFields = {
  line: z.string().trim().min(1).max(280).describe("The statement: short and quotable."),
  credit: z
    .string()
    .trim()
    .max(200)
    .optional()
    .describe('"own", or who it comes from, e.g. "Lauren Tan" or "Traction, Gabriel Weinberg".'),
  creditUrl: httpUrl.optional(),
  thought: text(5000)
    .optional()
    .describe("The fuller thought behind it, in the owner's own words."),
  themes: z
    .array(z.string().trim().min(1).max(300))
    .max(10)
    .optional()
    .describe("Align & Amplify themes (or Anti-Brand items) it supports, by their text."),
};
export const listIdentity = z.object({
  entityId: id.describe("The brand (entity) id or name."),
  status: z.enum(["suggested", "accepted", "rejected", "retired", "all"]).default("all"),
  theme: z
    .string()
    .max(300)
    .optional()
    .describe("Only statements supporting this theme (its text)."),
});
export const saveIdentity = z.object({
  id: id.optional().describe("Existing statement to edit; omit to add one."),
  expectedVersion: expectedVersion.optional(),
  entityId: id.optional().describe("The brand (entity) id or name; required when adding."),
  ...identityFields,
  line: identityFields.line.optional(),
  status: z
    .enum(["suggested", "accepted", "rejected", "retired"])
    .optional()
    .describe(
      "Only a person may set accepted or rejected. A person adding a statement accepts it; anyone else's lands as suggested.",
    ),
  note: text(1000).default("").describe("Why this changed (kept with the version)."),
  ...writer,
});
export const suggestIdentity = z.object({
  entityId: id.describe("The brand (entity) id or name."),
  ...identityFields,
  note: text(1000).default(""),
  ...writer,
});
export const decideIdentity = z.object({
  id,
  expectedVersion,
  note: text(1000).default("").describe("Why (kept with the version)."),
  ...writer,
});

export const updatePersona = z.object({
  accountId: id,
  expectedVersion: expectedVersion.describe("Current account version."),
  persona,
  note: text(1000).default(""),
  ...writer,
});

export const guidanceVersions = z.object({
  subjectKind: z.enum(["entity", "account"]),
  subjectId: id,
});

export const knowledgeKind = z.enum(["story", "opinion", "fact", "reference"]);
export const provenance = z
  .enum(["firsthand", "third_party", "unverified"])
  .describe(
    "firsthand: the speaker experienced it; third_party: quoted or heard from someone else; unverified: an assertion without support.",
  );
const knowledgeFields = {
  kind: knowledgeKind.optional(),
  provenance: provenance.optional(),
  title: z.string().trim().max(240).optional(),
  body: text(20000).optional(),
  source: text(1000).optional().describe("Where this came from, e.g. 'Chat interview 2026-11-06'."),
  sourceUrl: httpUrl.optional(),
  proofUrl: httpUrl
    .optional()
    .describe(
      "Evidence a reader can check: a link, screenshot or dataset. An entry with one counts as proof (plan level 1).",
    ),
  speaker: z.string().trim().max(160).optional().describe("Who said or experienced it."),
  subject: z.string().trim().max(240).optional().describe("Who or what it is about."),
  occurredOn: z
    .string()
    .trim()
    .max(40)
    .optional()
    .describe("When it happened, as known (may be approximate)."),
  topics: list(30, 120).optional(),
  uncertainty: text(1000)
    .optional()
    .describe("Known uncertainty; keep it rather than smoothing it away."),
};
export const saveKnowledge = z.object({
  id: id.optional().describe("Existing knowledge ID to edit; omit to create."),
  expectedVersion: expectedVersion.optional(),
  entityId: id.optional().describe("Owning entity; required when creating."),
  accountId: id.nullable().optional().describe("Optional account scope within the same entity."),
  ...knowledgeFields,
  status: z
    .enum(["active", "archived", "withdrawn"])
    .optional()
    .describe(
      "archived hides from use; withdrawn marks material that must never be used for new generation.",
    ),
  note: text(1000).optional().describe("Why this changed (kept in version history)."),
  ...writer,
});
export const runLinkChecks = z.object({ entityId: id, ...writer });
export const getLinkCheck = z.object({
  url: z.string().trim().min(1).max(2000).describe("The link to check."),
});
export const listKnowledge = z.object({
  entityId: id,
  accountId: id.optional(),
  status: z.enum(["active", "archived", "withdrawn", "all"]).default("active"),
  kind: knowledgeKind.optional(),
  text: z.string().max(300).optional(),
});
export const importTranscript = z.object({
  entityId: id,
  title: z.string().trim().min(1).max(240),
  sourceContext: text(2000).default("").describe("Where and when the interview happened."),
  speaker: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .optional()
    .describe("Interviewee whose experiences this transcript records. Defaults to the owner."),
  transcript: z.string().trim().min(1).max(200000),
  ...writer,
});
export const proposeKnowledge = z.object({
  importId: id,
  proposals: z
    .array(
      z.object({
        kind: knowledgeKind,
        provenance,
        title: z.string().trim().min(1).max(240),
        body: z.string().trim().min(1).max(20000),
        speaker: z.string().trim().min(1).max(160),
        uncertainty: text(1000).default(""),
      }),
    )
    .min(1)
    .max(50),
  ...writer,
});
export const reviewProposal = z.object({
  proposalId: id,
  expectedVersion,
  decision: z.enum(["accept", "reject"]),
  edits: z.object(knowledgeFields).optional().describe("Corrections applied when accepting."),
  ...writer,
});
export const gapList = z.object({
  entityId: id,
  status: z.enum(["open", "answered", "dismissed", "all"]).default("open"),
});
export const saveGap = z.object({
  id: id.optional(),
  expectedVersion: expectedVersion.optional(),
  entityId: id.optional(),
  accountId: id.nullable().optional(),
  question: z.string().trim().min(1).max(1000).optional(),
  topic: z.string().trim().max(200).optional(),
  reason: text(1000).optional(),
  sourceId: id.nullable().optional(),
  status: z.enum(["open", "answered", "dismissed"]).optional(),
  knowledgeId: id.nullable().optional().describe("Knowledge entry that answers this gap."),
  ...writer,
});
export const draftContext = z.object({
  accountId: id.describe("Destination account; retrieval stays inside its entity."),
  sourceId: id.optional().describe("Peer post being replied to, if any."),
  topic: z.string().max(500).optional(),
  text: z.string().max(5000).optional().describe("Extra text to match, e.g. the post or brief."),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const handle = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .transform(
    (v) =>
      v
        .replace(/^@/, "")
        .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
        .split(/[/?#]/)[0],
  );
export const savePeer = z.object({
  id: id.optional().describe("Existing peer ID to edit; omit to add."),
  expectedVersion: expectedVersion.optional(),
  accountId: id
    .optional()
    .describe("Participating account that follows this peer; required when adding."),
  handle: handle.optional().describe("X handle or profile URL."),
  name: z.string().trim().max(160).optional(),
  url: httpUrl.optional(),
  sector: z.string().trim().max(160).optional(),
  reason: text(1000)
    .optional()
    .describe("Why this account wants to contribute to this person's conversations."),
  status: z
    .enum(["active", "removed"])
    .optional()
    .describe("removed stops collection and suggestions while keeping referenced history."),
  ...writer,
});
export const listPeers = z.object({
  accountId: id.optional(),
  entityId: id.optional(),
  status: z.enum(["active", "removed", "all"]).default("active"),
});
export const importedPost = z.object({
  url: httpUrl
    .default("")
    .describe("Post URL, e.g. https://x.com/handle/status/123. Used for dedupe when present."),
  text: z
    .string()
    .trim()
    .min(1)
    .max(10000)
    .describe("Exact post text as published; never paraphrase or invent."),
  authorHandle: z.string().trim().max(120).default(""),
  authorName: z.string().trim().max(160).default(""),
  publishedAt: z
    .string()
    .trim()
    .max(40)
    .default("")
    .describe("ISO time if known; leave empty when unknown."),
  inReplyToUrl: httpUrl
    .default("")
    .describe("URL of the post this one replies to (thread context)."),
  parentText: z
    .string()
    .trim()
    .max(10000)
    .default("")
    .describe("Exact text of the parent post, if available."),
  media: z.array(httpUrl).max(10).default([]),
});
export const importPeerPosts = z.object({
  accountId: id.describe("Account whose feed receives these posts."),
  posts: z.array(importedPost).min(1).max(50),
  ...writer,
});
export const collectPeerPosts = z.object({
  accountId: id,
  maxPages: z.number().int().min(1).max(10).default(2).describe("Bounded backfill: pages per run."),
  ...writer,
});
export const listFeed = z.object({
  includeArchived: z.coerce
    .boolean()
    .default(false)
    .describe(
      "Include items of archived entities/accounts. They are always included when that entity or account is requested explicitly.",
    ),
  accountId: id.optional(),
  entityId: id.optional(),
  state: z.enum(["new", "skipped", "snoozed", "handled", "all"]).default("new"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const updateFeedItem = z.object({
  id,
  expectedVersion,
  state: z.enum(["new", "skipped", "snoozed", "handled"]),
  reason: text(1000).default("").describe("Why it was skipped, snoozed or revisited."),
  snoozeUntil: z
    .string()
    .trim()
    .max(40)
    .optional()
    .describe("ISO time to resurface a snoozed item."),
  ...writer,
});
export const markSource = z.object({
  sourceId: id,
  expectedVersion,
  availability: z.enum(["available", "deleted", "unavailable"]),
  ...writer,
});

export const intent = z
  .object({
    audience: z.string().trim().min(1).max(1000).describe("Who this is for."),
    purpose: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .describe("Intended outcome, e.g. start a substantive conversation or build trust."),
    rationale: z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .describe("Why this should help; an established practice is fine for routine work."),
    practice: z
      .enum(["routine", "experiment"])
      .default("routine")
      .describe(
        "Most work is routine practice; use experiment only to resolve meaningful uncertainty.",
      ),
    hypothesis: text(2000).default("").describe("Required for experiments."),
    expectation: text(1000)
      .default("")
      .describe("Qualitative expectations are fine; numeric targets need a recorded baseline."),
    baseline: text(1000).default("").describe("Known baseline, or leave empty when unknown."),
    evidence: text(2000).default("").describe("Relevant evidence for doing this."),
    reviewPoint: text(500)
      .default("")
      .describe("When or how results will be reviewed. Required for experiments."),
    strategyRef: text(300)
      .default("")
      .describe("Optional free-text strategy label until MKT-254/274 settle the model."),
  })
  .describe("Audience, purpose and rationale for this work (MKT-273).");
export const workKind = z.enum(["reply", "post", "article", "guide", "thread"]);
export const contribution = z
  .enum(["answer", "explanation", "experience", "question", "perspective", "none"])
  .describe("What the draft contributes. Use none when there is no worthwhile reply.");
export const createDraft = z.object({
  accountId: id.describe("Destination account; fixed for the life of the draft."),
  kind: workKind.default("reply"),
  feedItemId: id
    .optional()
    .describe("Feed item being replied to (must belong to the same account)."),
  sourceId: id
    .optional()
    .describe("Source post for a reply outside the peer feed (e.g. an incoming conversation)."),
  title: z.string().trim().max(240).default(""),
  text: z
    .string()
    .max(20000)
    .default("")
    .describe("Draft text. Empty only when contribution is none."),
  contribution,
  noReplyReason: text(1000).default("").describe("Required when contribution is none."),
  intent,
  knowledgeIds: z
    .array(id)
    .max(20)
    .default([])
    .describe(
      "Knowledge entries the draft relies on; first-person claims need a cited firsthand entry.",
    ),
  gapIds: z.array(id).max(10).default([]).describe("Knowledge gaps recorded while drafting."),
  lessonIds: z
    .array(id)
    .max(20)
    .default([])
    .describe("Approved lessons from get-draft-context that informed this draft."),
  workflow: z
    .string()
    .trim()
    .max(120)
    .optional()
    .describe("Workflow identifier, e.g. assistant-reply-v1."),
  model: z
    .string()
    .trim()
    .max(160)
    .default("")
    .describe("Model that generated the text, as reported by the caller (attested, not verified)."),
  ...creator,
});
export const reviseWork = z.object({
  id,
  expectedVersion,
  text: z.string().trim().min(1).max(20000),
  note: text(1000).default(""),
  origin: z.enum(["edited", "regenerated"]).default("edited"),
  knowledgeIds: z
    .array(id)
    .max(20)
    .optional()
    .describe("For regenerated text: knowledge relied on (defaults to the previous citations)."),
  model: z.string().trim().max(160).default(""),
  ...writer,
});
export const updateIntent = z.object({
  id,
  expectedVersion,
  intent,
  ...writer,
});
export const reviewWork = z.object({
  id,
  expectedVersion,
  decision: z.enum(["approve", "reject", "defer", "reopen", "archive"]),
  reason: text(1000).default(""),
  ...writer,
});
export const listWork = z.object({
  includeArchived: z.coerce
    .boolean()
    .default(false)
    .describe(
      "Include items of archived entities/accounts. They are always included when that entity or account is requested explicitly.",
    ),
  entityId: id.optional(),
  accountId: id.optional(),
  state: z
    .enum([
      "draft",
      "approved",
      "rejected",
      "deferred",
      "published",
      "no_reply",
      "archived",
      "open",
      "all",
    ])
    .default("open"),
  kind: workKind.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const gradeWork = z.object({
  id,
  revision: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Revision being graded; defaults to the current one."),
  score: z
    .number()
    .int()
    .min(1)
    .max(4)
    .describe("1 Not usable · 2 Needs major changes · 3 Good with edits · 4 Ready as written."),
  reason: text(2000).default(""),
  ...writer,
});
export const recordPublication = z.object({
  workId: id,
  url: z
    .string()
    .trim()
    .url()
    .max(2000)
    .describe("Published URL that the owner supplies after posting manually."),
  publishedAt: z
    .string()
    .trim()
    .max(40)
    .optional()
    .describe("ISO time it was published; defaults to now."),
  confirm: z.literal(true).describe("Explicit confirmation that this was really published."),
  acknowledgeMismatch: z
    .boolean()
    .default(false)
    .describe("Record even though the URL does not match the account handle."),
  ...writer,
});
export const correctPublication = z.object({
  id,
  expectedVersion,
  url: z.string().trim().url().max(2000).optional(),
  publishedAt: z.string().trim().max(40).optional(),
  reason: z.string().trim().min(1).max(1000),
  ...writer,
});

export const limitsPatch = z.object({
  maxUnreviewed: z.number().int().min(0).max(500).optional(),
  dailyDrafts: z.number().int().min(0).max(500).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  heavyDailyUnits: z.number().int().min(0).max(100000).optional(),
  paused: z.boolean().optional(),
  pauseReason: text(500).optional(),
});
export const setLimits = z.object({
  scope: id.describe(
    '"global" or an account ID. Account limits override global ones field by field.',
  ),
  expectedVersion: expectedVersion
    .optional()
    .describe("Required when the scope already has limits."),
  limits: limitsPatch,
  ...writer,
});
export const getLimits = z.object({ accountId: id.optional() });
export const startJob = z.object({
  kind: z.string().trim().min(1).max(40).describe("draft, collect, production, demo, refresh…"),
  accountId: id.optional(),
  costClass: z
    .enum(["light", "heavy"])
    .describe("heavy = paid or slow production; needs approval or an explicit allowance."),
  estimateUnits: z
    .number()
    .min(0)
    .max(100000)
    .nullable()
    .default(null)
    .describe("Estimated cost units; null means unknown (unknown never means unlimited)."),
  input: z.record(z.string(), z.unknown()).default({}),
  requestKey: id.describe("Stable idempotency key; the same key returns the same job."),
  ...writer,
});
export const updateJob = z.object({
  id,
  expectedVersion,
  action: z.enum(["start", "complete", "fail", "retry", "cancel", "approve", "pause", "resume"]),
  usedUnits: z.number().min(0).max(100000).optional(),
  error: text(2000).optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  reason: text(1000).default(""),
  ...writer,
});
export const listJobs = z.object({
  accountId: id.optional(),
  status: z
    .enum([
      "queued",
      "awaiting_approval",
      "running",
      "succeeded",
      "failed",
      "canceled",
      "paused",
      "blocked",
      "active",
      "all",
    ])
    .default("all"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export const getToday = z.object({
  entityId: id.optional(),
  accountId: id.optional(),
});

export const replyOpportunities = z.object({
  accountId: id,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const prepareInterview = z.object({
  entityId: id,
  feedItemIds: z
    .array(id)
    .max(50)
    .optional()
    .describe("Peer posts to ask about; defaults to the most relevant recent posts."),
  maxPosts: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe("Twenty is an example, not a required session length."),
  ...writer,
});
export const answerInterview = z.object({
  interviewId: id,
  answers: z
    .array(z.object({ gapId: id, text: z.string().trim().min(1).max(20000) }))
    .min(1)
    .max(50)
    .describe("Answers given in chat, each linked to the question (gap) it answers."),
  speaker: z.string().trim().min(1).max(160).optional(),
  ...writer,
});
export const createBriefing = z.object({
  entityId: id,
  windowDays: z.number().int().min(1).max(90).default(7),
  ...creator,
});
export const updateTopic = z.object({
  id,
  expectedVersion,
  status: z.enum(["new", "saved", "dismissed"]),
  reason: text(500).default(""),
  ...writer,
});
export const listTopics = z.object({
  entityId: id,
  status: z.enum(["new", "saved", "dismissed", "all"]).default("all"),
});

export const claim = z.object({
  text: z.string().trim().min(1).max(1000),
  knowledgeIds: z.array(id).max(10).default([]),
  sourceUrls: z.array(httpUrl).max(10).default([]),
});
export const briefFields = {
  title: z.string().trim().max(240).optional(),
  audience: text(1000).optional(),
  purpose: text(1000).optional().describe("Intended outcome."),
  claims: z
    .array(claim)
    .max(20)
    .optional()
    .describe("Key claims, each with supporting knowledge IDs or source URLs."),
  format: z.enum(["post", "thread", "article", "guide"]).optional(),
  destinationAccountId: id.nullable().optional(),
  origin: z.enum(["manual", "topic", "product_fact", "customer_question"]).optional(),
  topicId: id.nullable().optional(),
  notes: text(5000).optional(),
};
export const saveBrief = z.object({
  id: id.optional(),
  expectedVersion: expectedVersion.optional(),
  entityId: id.optional(),
  ...briefFields,
  status: z.enum(["active", "archived"]).optional(),
  note: text(1000).default("").describe("Why this revision changed."),
  ...writer,
});
export const deriveBrief = z.object({
  briefId: id,
  destinationAccountId: id,
  format: z.enum(["post", "thread", "article", "guide"]),
  ...writer,
});
export const listBriefs = z.object({
  entityId: id,
  status: z.enum(["active", "archived", "all"]).default("active"),
});
export const draftFromBrief = z.object({
  briefId: id,
  text: z.string().trim().min(1).max(50000),
  title: z.string().trim().max(240).default(""),
  knowledgeIds: z.array(id).max(20).default([]),
  adaptedFromWorkId: id
    .optional()
    .describe("Original work item this variant adapts; keeps lineage, never shares approval."),
  model: z.string().trim().max(160).default(""),
  workflow: z.string().trim().max(120).optional(),
  ...creator,
});
export const runChecks = z.object({ workId: id, ...writer });
export const overrideCheck = z.object({
  workId: id,
  checkId: z.string().trim().min(1).max(80),
  reason: z.string().trim().min(1).max(1000),
  ...writer,
});

export const strategy = z
  .enum(["contribution", "origination"])
  .describe(
    "contribution = replies in peers' conversations; origination = the account's own posts, articles and guides.",
  );
export const setMix = z.object({
  accountId: id,
  strategy,
  targets: z
    .record(z.string().trim().min(1).max(60), z.number().int().min(0).max(100))
    .describe("Category → percentage; must sum to 100."),
  enabled: z.boolean().default(true),
  note: text(500).default(""),
  ...writer,
});
export const getMix = z.object({
  accountId: id,
  strategy,
  windowDays: z.coerce.number().int().min(1).max(365).default(28),
});
export const setWorkCategory = z.object({
  id,
  expectedVersion,
  category: z.string().trim().max(60).nullable().describe("Mix category, or null to clear."),
  outsideMix: text(500)
    .default("")
    .describe("Reason when deliberately outside the mix; excluded from deficit suggestions."),
  ...writer,
});
export const recordSnapshots = z.object({
  publicationId: id,
  snapshots: z
    .array(
      z.object({
        metric: z
          .string()
          .trim()
          .min(1)
          .max(60)
          .describe("e.g. likes, replies, reposts, impressions, profile_visits."),
        value: z
          .number()
          .min(0)
          .nullable()
          .describe("null records a known gap (unknown), never zero."),
        measuredAt: z
          .string()
          .trim()
          .min(10)
          .max(40)
          .describe("When the platform value applied (ISO)."),
        source: z.enum(["manual", "import", "x_api"]).default("manual"),
        definition: text(300).default(""),
      }),
    )
    .min(1)
    .max(200),
  ...writer,
});
export const recordOutcome = z.object({
  entityId: id,
  kind: z.enum([
    "first_suitable_user",
    "signup",
    "meaningful_conversation",
    "guide_useful",
    "customer_success",
    "other",
  ]),
  occurredAt: z.string().trim().min(10).max(40),
  description: z.string().trim().min(1).max(2000),
  source: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe("Where this evidence came from (e.g. signup form referral field, DM)."),
  attribution: z
    .enum(["none", "weak", "supported"])
    .default("none")
    .describe(
      "supported = explicit link (e.g. stated referral); weak = timing only; none = unknown.",
    ),
  workIds: z
    .array(id)
    .max(20)
    .default([])
    .describe("Linked work only when attribution is weak or supported."),
  dedupeKey: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("Stable key for this real-world event so repeated reports count once."),
  ...writer,
});
export const listOutcomes = z.object({
  entityId: id,
  kind: z.string().optional(),
});
export const recordDecision = z.object({
  entityId: id,
  workId: id.optional(),
  decision: z.enum(["repeat", "change", "stop", "gather_evidence"]),
  observations: z
    .string()
    .trim()
    .min(1)
    .max(5000)
    .describe("What was observed, kept separate from explanations."),
  explanation: text(5000).default("").describe("Possible explanation; not a causal claim."),
  sideEffects: text(2000).default(""),
  conclusion: z.enum(["supported", "challenged", "inconclusive"]).default("inconclusive"),
  nextStep: text(2000)
    .default("")
    .describe("Next bounded iteration; never expands volume, spend or scope by itself."),
  ...writer,
});
export const listDecisions = z.object({ entityId: id, workId: id.optional() });
export const saveLesson = z.object({
  id: id.optional(),
  expectedVersion: expectedVersion.optional(),
  entityId: id.optional(),
  accountId: id
    .nullable()
    .optional()
    .describe(
      "Style lessons must be account-scoped; voice never propagates across accounts automatically.",
    ),
  kind: z
    .enum(["style", "substance", "strategy"])
    .optional()
    .describe("strategy lessons are suggestions only and never applied to drafting."),
  text: z.string().trim().min(1).max(2000).optional(),
  evidenceWorkIds: z.array(id).max(20).optional(),
  status: z.enum(["proposed", "approved", "withdrawn", "rejected"]).optional(),
  reason: text(1000).default(""),
  ...writer,
});
export const listLessons = z.object({
  entityId: id,
  accountId: id.optional(),
  status: z.enum(["proposed", "approved", "withdrawn", "rejected", "all"]).default("all"),
});

export const conversationIntent = z.enum([
  "bug_report",
  "question",
  "disagreement",
  "praise",
  "abuse",
  "feature_request",
  "other",
]);
export const importIncoming = z.object({
  accountId: id,
  replies: z
    .array(
      z.object({
        url: httpUrl.default(""),
        text: z.string().trim().min(1).max(10000).describe("Exact reply text."),
        authorHandle: z.string().trim().max(120).default(""),
        publishedAt: z.string().trim().max(40).default(""),
        inReplyToUrl: httpUrl.default("").describe("Our post this replies to, when known."),
      }),
    )
    .min(1)
    .max(50),
  ...writer,
});
export const listConversations = z.object({
  includeArchived: z.coerce
    .boolean()
    .default(false)
    .describe(
      "Include items of archived entities/accounts. They are always included when that entity or account is requested explicitly.",
    ),
  accountId: id.optional(),
  entityId: id.optional(),
  state: z.enum(["new", "triaged", "responded", "closed", "all"]).default("all"),
  intent: conversationIntent.optional(),
});
export const classifyConversation = z.object({
  id,
  expectedVersion,
  intent: conversationIntent.optional(),
  sentiment: z.enum(["negative", "neutral", "positive"]).optional(),
  state: z.enum(["new", "triaged", "responded", "closed"]).optional(),
  note: text(1000).default(""),
  ...writer,
});
export const createCommitment = z.object({
  entityId: id,
  conversationId: id.optional(),
  workId: id.optional().describe("The approved draft that makes the promise, if any."),
  promise: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .describe("What was promised, e.g. 'We'll investigate the export bug'."),
  dueAt: z.string().trim().max(40).optional(),
  productIssue: z
    .boolean()
    .default(false)
    .describe("true when product work belongs in Tasks (linked, not implemented here)."),
  ...creator,
});
export const linkCommitmentTask = z.object({
  id,
  expectedVersion,
  outcome: z
    .enum(["linked", "failed"])
    .describe(
      "linked after a Tasks ticket was created or found; failed when Tasks was unavailable.",
    ),
  ticketId: z
    .string()
    .trim()
    .max(40)
    .optional()
    .describe("Tasks ticket ID, e.g. JT-123. Required when linked."),
  error: text(1000).default(""),
  ...writer,
});
export const resolveCommitment = z.object({
  id,
  expectedVersion,
  state: z.enum(["open", "awaiting_evidence", "resolved", "cancelled"]),
  evidence: z
    .object({
      kind: z.enum(["release", "fix_verified", "guide", "explanation", "other"]),
      reference: z
        .string()
        .trim()
        .min(1)
        .max(2000)
        .describe("Release URL, version, merged PR, guide URL…"),
      verifiedBy: z.string().trim().max(160).default(""),
    })
    .optional()
    .describe("Required to resolve."),
  reason: text(1000).default(""),
  ...writer,
});
export const listCommitments = z.object({
  entityId: id.optional(),
  state: z.enum(["open", "awaiting_evidence", "resolved", "cancelled", "all"]).default("all"),
});
export const draftResolution = z.object({
  conversationId: id,
  commitmentId: id.optional(),
  approach: z
    .enum(["fix", "guide", "answer", "acknowledgement", "none"])
    .describe("fix requires a resolved commitment with release or verified-fix evidence."),
  text: z.string().max(5000).default(""),
  knowledgeIds: z.array(id).max(20).default([]),
  reason: text(1000).default("").describe("Why no reply, when approach is none."),
  model: z.string().trim().max(160).default(""),
  ...creator,
});

export const listRuns = z.object({
  accountId: id.optional(),
  status: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export const recoverRuns = z.object({
  olderThanMinutes: z
    .number()
    .int()
    .min(0)
    .max(10080)
    .default(30)
    .describe("Running work not updated for this long is treated as interrupted."),
  ...writer,
});
export const restoreData = z.object({
  export: z.record(z.string(), z.unknown()).describe("A document produced by get-export."),
  confirm: z
    .literal(true)
    .describe("Restore only runs into an empty Marketing database (a safe test environment)."),
  ...writer,
});
export const setSchedule = z.object({
  accountId: id,
  expectedVersion: expectedVersion.optional(),
  enabled: z.boolean(),
  timezone: z.string().trim().min(1).max(60).default("Europe/London"),
  cadenceMinutes: z
    .number()
    .int()
    .min(60)
    .max(10080)
    .default(360)
    .describe("At least hourly; must stay within verified provider limits."),
  windowStartHour: z.number().int().min(0).max(23).default(8),
  windowEndHour: z.number().int().min(1).max(24).default(20),
  collect: z.boolean().default(true),
  prepareDrafts: z
    .boolean()
    .default(false)
    .describe("Queue a bounded draft job for an agent; never generates or publishes by itself."),
  ...writer,
});
export const runDueSchedules = z.object({
  at: z
    .string()
    .trim()
    .max(40)
    .optional()
    .describe("Evaluate as of this ISO time (defaults to now)."),
  ...writer,
});

export const requestProduction = z.object({
  workId: id.describe("Work item the media accompanies; results return to its review."),
  adapter: z.string().trim().min(1).max(60).describe("Adapter name from list-production-adapters."),
  stage: z
    .enum(["preview", "full"])
    .describe("A full render requires an approved preview of the same request."),
  prompt: z.string().trim().min(1).max(5000).describe("Concept or script; explicit inputs only."),
  previewJobId: id.optional().describe("Approved preview job, required for full renders."),
  requestKey: id.describe(
    "Stable idempotency key; the same key never triggers a second (possibly paid) request.",
  ),
  ...writer,
});
export const runProduction = z.object({ jobId: id, ...writer });
export const approvePreview = z.object({
  jobId: id,
  expectedVersion,
  note: text(1000).default(""),
  ...writer,
});
export const requestDemo = z.object({
  workId: id,
  adapter: z.string().trim().min(1).max(60).default("fixture-demo"),
  repo: z.string().trim().min(1).max(300).describe("Repository the demo is bound to."),
  commit: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{7,40}$/i, "Use a commit SHA")
    .describe("Exact version shown."),
  environmentUrl: httpUrl.describe(
    "Local or fixture environment only; production hosts are refused.",
  ),
  steps: z
    .array(
      z.object({
        action: z.enum(["goto", "click", "type", "expect", "capture"]),
        target: z.string().max(500),
        value: z.string().max(500).default(""),
      }),
    )
    .min(1)
    .max(50),
  requestKey: id,
  ...writer,
});
export const verifyDemo = z.object({
  jobId: id,
  expectedVersion,
  matchesProduct: z
    .boolean()
    .describe("The owner confirms the captured behaviour matches the real product."),
  note: text(1000).default(""),
  ...writer,
});

export const startPipelineRun = z.object({
  entityId: id.describe("The entity the piece is for."),
  kind: z
    .enum(["article", "article-reviewed"])
    .default("article")
    .describe(
      "Which workflow to run: article, or article-reviewed (a domain agent from Knowledge checks the piece against its playbooks before the publish gate).",
    ),
  reviewer: z
    .string()
    .max(120)
    .optional()
    .describe(
      "article-reviewed: the domain agent in Knowledge that reviews, by its slug, e.g. alex-hormozi.",
    ),
  seed: z
    .string()
    .min(3)
    .max(8000)
    .describe(
      "What the piece starts from: a tweet's text, a post, or an idea in a sentence or two.",
    ),
  url: z.string().url().max(500).optional().describe("A link the seed came from, if there is one."),
  notes: z
    .string()
    .max(4000)
    .optional()
    .describe("Anything the owner wants the piece to say or avoid."),
  title: z
    .string()
    .max(120)
    .optional()
    .describe("A working title. Left out, the start of the seed is used."),
  ...writer,
});
export const findPipelineRuns = z.object({
  entityId: id.optional(),
  status: z
    .enum(["running", "waiting", "completed", "failed", "cancelled"])
    .optional()
    .describe("waiting = at a gate, waiting for the owner."),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export const decidePipelineGate = z.object({
  runId: id,
  blockId: id.optional().describe("Which gate, when more than one is waiting. Usually left out."),
  decision: z.enum(["accept", "reject"]),
  grade: z.coerce
    .number()
    .int()
    .min(1)
    .max(4)
    .describe("1 not usable, 2 needs major changes, 3 good with edits, 4 ready as written."),
  reason: z.string().min(1).max(2000).describe("A line on why."),
  blame: id
    .optional()
    .describe(
      "The stage the owner blames when it fell short: the block's id, such as research, angle, write, score, pick or rewrite.",
    ),
  ...writer,
});
export const cancelPipelineRun = z.object({ runId: id, ...writer });

const seasonPath = z
  .enum(["", "A", "B"])
  .describe("A: outcome flex (results you already have). B: a 30-day volume sprint to earn them.");
export const listSeasons = z.object({
  entityId: id.describe("The brand (entity) id or name."),
});
export const saveSeason = z.object({
  entityId: id.describe("The brand (entity) id or name."),
  n: z.coerce.number().int().min(1).optional().describe("Which season; default the current one."),
  start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .describe("First day, YYYY-MM-DD."),
  end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .describe("Last day, YYYY-MM-DD."),
  goal: z
    .string()
    .trim()
    .max(500)
    .optional()
    .describe("The season's goal in one line. Empty shows the Belt project and target."),
  target: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .nullable()
    .optional()
    .describe(
      "The season's target number, e.g. 8 apps. Sets the Proof step's slots and what the Belt counts toward; null clears it.",
    ),
  proofNeeded: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Linked proof entries needed to pass step 1 (default 3)."),
  path: seasonPath.optional(),
  notes: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .describe("Private notes on the season (not shown on the Plan)."),
  expectedVersion: expectedVersion
    .optional()
    .describe("The season's version, to avoid overwriting someone else's edit."),
  ...writer,
});
export const createSeason = z.object({
  entityId: id.describe("The brand (entity) id or name."),
  start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .describe("First day; default the day after the last season ends."),
  days: z.coerce
    .number()
    .int()
    .min(7)
    .max(366)
    .default(90)
    .describe("Length in days (hoeem's seasons are 90)."),
  goal: z.string().trim().max(500).default(""),
  path: seasonPath.optional().describe("Default: the last season's path."),
  target: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .nullable()
    .optional()
    .describe(
      "The season's target number, e.g. 8 apps. Sets the Proof step's slots and what the Belt counts toward; default the last season's target.",
    ),
  proofNeeded: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Linked proof entries needed to pass step 1 (default the last season's)."),
  ...creator,
});
export const saveSeasonIdea = z.object({
  entityId: id.describe("The brand (entity) id or name."),
  n: z.coerce.number().int().min(1).max(100).describe("Season number; it needn't be planned yet."),
  idea: z
    .string()
    .trim()
    .max(500)
    .describe(
      "A short note on what this season is for, e.g. 'Ship the core tools'. Empty clears it.",
    ),
  ...writer,
});

export const GetBriefInput = z.object({ id: z.string().min(1) });

export const GetEntityInput = z.object({ id: z.string().min(1) });

export const GetExportInput = z.object({});

export const GetIdentityStatementInput = z.object({ id: z.string().min(1) });

export const GetInterviewInput = z.object({ id: z.string().min(1) });

export const GetKnowledgeInput = z.object({ id: z.string().min(1) });

export const GetPerformanceInput = z.object({ workId: z.string().min(1) });

export const GetPipelineRunInput = z.object({ id: z.string().min(1) });

export const GetPipelineStepInput = z.object({ id: z.string().min(1) });

export const GetProtocolInput = z.object({});

export const GetWorkExportInput = z.object({ id: z.string().min(1) });

export const GetWorkMediaInput = z.object({ workId: z.string().min(1) });

export const GetWorkInput = z.object({ id: z.string().min(1) });

export const ListAccountsInput = z.object({
  entityId: z.string().optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export const ListBriefingsInput = z.object({ entityId: z.string().min(1) });

export const ListChecksInput = z.object({ workId: z.string().min(1) });

export const ListDomainAgentsInput = z.object({});

export const ListEntitiesInput = z.object({
  includeArchived: z.coerce.boolean().default(true),
});

export const ListImportsInput = z.object({ entityId: z.string().min(1) });

export const ListInterviewsInput = z.object({ entityId: z.string().min(1) });

export const ListProductionAdaptersInput = z.object({});

export const ListSchedulesInput = z.object({});

export const NavigateInput = z.object({
  view: z.string().optional().describe("View name to navigate to"),
  path: z.string().optional().describe("URL path to navigate to"),
  threadId: z.string().optional().describe("Chat thread ID to open"),
});

export const ViewScreenInput = z.object({});

export const GetOwnerInput = z.object({});
