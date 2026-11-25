export type ImageFrame = {
  background: string;
  ink: string;
  muted: string;
  font: string;
  labelFont: string;
};

export type ChannelKind = "x" | "blog" | "newsletter" | "website" | "other";

export interface Entity {
  id: string;
  name: string;

  icon: string;

  colour: string;

  image?: string;

  images?: string[];

  navOrder: number;
  purpose: string;
  audiences: string[];
  goals: string[];
  archived: boolean;
  guidanceVersion: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Voice {
  keyPhrases: string[];
  borrowedPhrases: { phrase: string; from: string }[];
  toneRules: string;
  example: string;
}

export function voiceText(g: Pick<EntityGuidance, "voice" | "verbalStyle">): string {
  const v = g.voice;
  if (
    !v ||
    (!v.keyPhrases.length && !v.borrowedPhrases.length && !v.toneRules.trim() && !v.example.trim())
  )
    return g.verbalStyle ?? "";
  return [
    v.keyPhrases.length ? `Key phrases: ${v.keyPhrases.join("; ")}.` : "",
    v.borrowedPhrases.length
      ? `Borrowed phrases (always credit): ${v.borrowedPhrases.map((b) => `"${b.phrase}" (${b.from})`).join(", ")}.`
      : "",
    v.toneRules.trim() ? `Tone: ${v.toneRules.trim()}` : "",
    v.example.trim() ? `Example in their words: "${v.example.trim()}"` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface EntityGuidance {
  principles: string[];
  conduct: string;
  audiencePromise: string;
  verbalStyle: string;

  voice?: Voice;
  visual: {
    colours: string[];
    typography: string;
    logos: string[];
    frame?: ImageFrame;
  };

  plan: BrandPlan;
}

export const SLOT_KINDS = ["post", "reply", "article", "check-in", "other"] as const;
export type SlotKind = (typeof SLOT_KINDS)[number];
export const SLOT_STATUSES = [
  "planned",
  "drafted",
  "in_review",
  "approved",
  "published",
  "skipped",
] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];
export interface Slot {
  id: string;
  stored: boolean;
  entityId: string;
  accountId: string | null;
  day: string;
  kind: SlotKind;
  title: string;
  theme: string;
  status: SlotStatus;
  briefId: string | null;
  note: string;
  ruleId: string | null;
  version: number;
}
export interface RecurrenceRule {
  id: string;
  entityId: string;
  accountId: string | null;
  kind: SlotKind;
  label: string;

  rrule: string;

  perOccurrence: number;
  startDay: string;
  active: boolean;
  version: number;
}

export interface Runway {
  daysAhead: number;
  target: number;
  behind: boolean;
  nextGap: string | null;
  state: "not-started" | "paused" | "starts" | "running";
  startsOn: string | null;
}
export interface CalendarSettings {
  entityId: string;
  startsOn: string | null;
  paused: boolean;
  version: number;
}

export const IDENTITY_STATUSES = ["suggested", "accepted", "rejected", "retired"] as const;
export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];
export interface IdentityData {
  line: string;

  credit: string;
  creditUrl: string;

  thought: string;

  themes: string[];
}
export interface IdentityStatement extends IdentityData {
  id: string;
  entityId: string;
  status: IdentityStatus;
  version: number;
  suggestedBy: string;
  createdAt: string;
  updatedAt: string;
}
export interface IdentityVersion {
  version: number;
  status: IdentityStatus;
  data: IdentityData;
  note: string;
  changedBy: string;
  changedAt: string;
}

export const PLAN_LEVELS = ["proof", "person", "association", "product", "belt"] as const;
export type PlanLevel = (typeof PLAN_LEVELS)[number];
export const PLAN_LEVEL_TITLES: Record<PlanLevel, string> = {
  proof: "Proof",
  person: "Your person",
  association: "Association",
  product: "Product",
  belt: "Belt",
};
export const PERSON_TESTS = [
  "growingMarket",
  "acutePain",
  "purchasingPower",
  "algorithmicClarity",
] as const;
export type PersonTest = (typeof PERSON_TESTS)[number];
export const PERSON_TEST_TITLES: Record<PersonTest, string> = {
  growingMarket: "Growing market",
  acutePain: "Acute pain",
  purchasingPower: "Purchasing power",
  algorithmicClarity: "Algorithmic clarity",
};

export interface FreeProduct {
  name: string;
  hook: string;
  url: string;
  delivers: "unknown" | "yes" | "no";
  fixes: string;

  gates?: { label: string; done: boolean }[];

  later?: string[];

  shelved?: boolean;

  suggestedHook?: string;
}

export const productDelivers = (f: FreeProduct) =>
  f.delivers === "yes" || (!!f.gates?.length && f.gates.every((g) => g.done));

export interface BrandPlan {
  proof: { path: "" | "A" | "B" };
  person: {
    who: string;
    pain: string;
    pays: string;
    tests: Record<PersonTest, { score: number | null; note: string }>;
    reviewed?: { purpose?: string; goals?: string };
  };
  association: {
    amplify: { title?: string; item: string; postIdea: string }[];
    antiBrand: { item: string; standard: string; suggestion?: string }[];
    visualConstants: string[];
    keep?: string[];
  };
  product: { freeProducts: FreeProduct[] };
  belt: {
    project: string;
    promise: string;
    target: string;
    launchDate: string;
    deadlineShown: string;
    delayPlan: string;
    checkInDay: string;
    apps?: {
      name: string;
      status: "public" | "private" | "planned";
      url?: string;
    }[];
    suggestedPromise?: string;
  };
}

export function emptyPlan(): BrandPlan {
  return {
    proof: { path: "" },
    person: {
      who: "",
      pain: "",
      pays: "",
      tests: Object.fromEntries(
        PERSON_TESTS.map((t) => [t, { score: null, note: "" }]),
      ) as BrandPlan["person"]["tests"],
    },
    association: { amplify: [], antiBrand: [], visualConstants: [] },
    product: { freeProducts: [] },
    belt: {
      project: "",
      promise: "",
      target: "",
      launchDate: "",
      deadlineShown: "",
      delayPlan: "",
      checkInDay: "",
    },
  };
}

export function normalizePlan(p: Partial<BrandPlan> | undefined | null): BrandPlan {
  const e = emptyPlan();
  const x = (p ?? {}) as any;
  return {
    proof: { ...e.proof, ...(x.proof ?? {}) },
    person: {
      ...e.person,
      ...(x.person ?? {}),
      tests: { ...e.person.tests, ...(x.person?.tests ?? {}) },
    },
    association: { ...e.association, ...(x.association ?? {}) },
    product: { ...e.product, ...(x.product ?? {}) },
    belt: { ...e.belt, ...(x.belt ?? {}) },
  };
}

export const DEFAULT_SEASON = {
  n: 1,
  start: "2026-11-18",
  end: "2027-02-15",
} as const;
export const SEASON_DAYS = 90;
export interface Season {
  n: number;
  start: string;
  end: string;
  goal: string;
  path: "" | "A" | "B";

  target: number | null;

  proofNeeded: number;

  notes?: string;
  version: number;
}
export const DEFAULT_PROOF_NEEDED = 3;
export interface SeasonStatus {
  n: number;
  start: string;
  end: string;
  length: number;
  day: number | null;
  startsIn: number;
  ended: boolean;
}
const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);

export function seasonStatus(
  s: { n: number; start: string; end: string },
  today: string,
): SeasonStatus {
  const t = dayNumber(today);
  const start = dayNumber(s.start);
  const length = dayNumber(s.end) - start + 1;
  return {
    n: s.n,
    start: s.start,
    end: s.end,
    length,
    day: t >= start ? Math.min(t - start + 1, length) : null,
    startsIn: Math.max(0, start - t),
    ended: t > dayNumber(s.end),
  };
}

export function currentSeason<T extends { start: string }>(
  seasons: T[],
  today: string,
): T | undefined {
  return [...seasons].reverse().find((s) => s.start <= today) ?? seasons[0];
}

export const SEASON_BANDS = [
  { from: 1, to: 30, label: "Proof sprint" },
  { from: 31, to: 60, label: "Your person + Association" },
  { from: 61, to: 90, label: "Product + Belt" },
] as const;

export const ukToday = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);

export const isProofLink = (url: string) => /^\s*https?:\/\/\S+/i.test(url);

export const countsAsProof = (url: string, linkOk?: boolean | null) =>
  isProofLink(url) && linkOk !== false;

export type LevelState = "done" | "partial" | "empty";
export interface LevelStatus {
  level: PlanLevel;
  n: number;
  title: string;
  state: LevelState;
  done: string[];
  missing: string[];
  items: {
    key: string;
    label: string;
    ok: boolean;
  }[];
}

const PLACEHOLDER =
  /^(tbd|tba|todo|to do|n\/?a|none|null|placeholder|lorem ipsum.*|x+|\?+|-+|_+|\.{2,}|…)$/i;

export function realText(v: unknown): boolean {
  if (Array.isArray(v)) return v.some(realText);
  const t = String(v ?? "").trim();
  return t !== "" && !PLACEHOLDER.test(t);
}
const realScore = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 10;
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function planStatus(
  g: EntityGuidance,
  entity: Pick<Entity, "purpose" | "audiences" | "goals">,
  proofLinked: number,
  season: { proofNeeded?: number; target?: number | null } = {},
): LevelStatus[] {
  const needed = season.proofNeeded ?? DEFAULT_PROOF_NEEDED;
  const p = normalizePlan(g.plan);
  const has = realText;
  const check = (items: [string, boolean, string][]) => ({
    done: items.filter(([, ok]) => ok).map(([k]) => k),
    missing: items.filter(([, ok]) => !ok).map(([k]) => k),
  });
  const active = p.product.freeProducts.filter((f) => !f.shelved);
  const test = (t: PersonTest) => realScore(p.person.tests[t]?.score);
  const lists: Record<PlanLevel, [string, boolean, string][]> = {
    proof: [
      ["Path A or B chosen", p.proof.path === "A" || p.proof.path === "B", "path"],
      [
        `${needed} proof ${needed === 1 ? "entry" : "entries"} with a proof link`,
        proofLinked >= needed,
        "proof-links",
      ],
    ],
    person: [
      ["Who", has(p.person.who), "who"],
      ["Their pain", has(p.person.pain), "pain"],
      ["What they pay for", has(p.person.pays), "pays-for"],
      ["Growing market scored", test("growingMarket"), "market"],
      ["Acute pain scored", test("acutePain"), "urgency"],
      ["Purchasing power scored", test("purchasingPower"), "budget"],
      ["Algorithmic clarity scored", test("algorithmicClarity"), "clarity"],
      ["Intended audiences", has(entity.audiences), "audiences"],
      ["Audience promise", has(g.audiencePromise), "promise"],
    ],
    association: [
      [
        "5 Align & Amplify items with a post idea",
        p.association.amplify.filter((a) => (has(a.title ?? "") || has(a.item)) && has(a.postIdea))
          .length >= 5,
        "amplify",
      ],
      [
        "3 Anti-Brand items with our standard",
        p.association.antiBrand.filter((a) => has(a.item) && has(a.standard)).length >= 3,
        "anti-brand",
      ],
      [
        "2 or 3 visual constants",
        p.association.visualConstants.filter(has).length >= 2,
        "visual-constants",
      ],
      ["Verbal style", has(voiceText(g)), "verbal-style"],
    ],
    product: [
      [
        "A free product with its hook",
        active.some((f) => has(f.name) && has(f.hook)),
        "free-product",
      ],
      [
        "It delivers on its hook",
        active.some((f) => has(f.name) && has(f.hook) && productDelivers(f)),
        "delivers",
      ],
    ],
    belt: [
      ["Project", has(p.belt.project), "project"],
      ["Exact promise", has(p.belt.promise), "promise"],
      [
        "Target number",
        (has(p.belt.target) && /\d/.test(p.belt.target)) || (season.target ?? 0) > 0,
        "target",
      ],
      [
        "Launch date",
        /^\d{4}-\d{2}-\d{2}$/.test(p.belt.launchDate.trim()) &&
          !Number.isNaN(Date.parse(p.belt.launchDate.trim())),
        "launch-date",
      ],
      ["Where the deadline shows", has(p.belt.deadlineShown), "deadline-shown"],
      ["Delay plan", has(p.belt.delayPlan), "delay-plan"],
      [
        "Weekly check-in day",
        WEEKDAYS.includes(p.belt.checkInDay.trim().toLowerCase()),
        "check-in-day",
      ],
    ],
  };

  const started: Record<PlanLevel, boolean> = {
    proof: p.proof.path !== "" || proofLinked > 0,
    person: false,
    association:
      p.association.amplify.length +
        p.association.antiBrand.length +
        p.association.visualConstants.length >
        0 ||
      g.principles.length > 0 ||
      has(g.conduct),
    product: p.product.freeProducts.length > 0,
    belt: false,
  };
  return PLAN_LEVELS.map((level, i) => {
    const c = check(lists[level]);
    const state: LevelState = !c.missing.length
      ? "done"
      : c.done.length || started[level]
        ? "partial"
        : "empty";
    return {
      level,
      n: i + 1,
      title: PLAN_LEVEL_TITLES[level],
      state,
      ...c,
      items: lists[level].map(([label, ok, key]) => ({ key, label, ok })),
    };
  });
}

export interface Persona {
  tone: string;
  traits: string[];
  audience: string;
  topics: string[];
  boundaries: string[];
  examples: string[];
}

export interface GuidanceVersion<T = EntityGuidance | Persona> {
  subjectKind: "entity" | "account";
  subjectId: string;
  n: number;
  data: T;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  entityId: string;
  kind: ChannelKind;
  name: string;
  description: string;
  url: string;
  archived: boolean;
  version: number;
}

export interface Account {
  id: string;
  entityId: string;
  channelId: string;
  channelKind: ChannelKind;
  name: string;
  handle: string;
  url: string;
  role: string;
  instructions: string;
  archived: boolean;
  personaVersion: number;
  version: number;
}

export interface PersonaConflict {
  field: string;
  excerpt: string;
  principle: string;
  explanation: string;
}

export interface AccountDetail extends Account {
  persona: Persona;
  conflicts: PersonaConflict[];
}

export interface EntityDetail {
  entity: Entity;
  guidance: EntityGuidance;

  plan: {
    levels: LevelStatus[];
    proofLinked: number;
    proofEntries: number;
    identityAccepted: number;
    identitySuggested: number;
    proofNeeded: number;
    seasonTarget: number | null;
  };
  channels: Channel[];
  accounts: AccountDetail[];
  history: ActivityItem[];
}

export interface ActivityItem {
  id: number;
  actorId: string;
  text: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export const DEFAULT_PRINCIPLES = [
  "Be consistently useful: help people solve real problems and make progress.",
  "Be honest and constructive, not artificially positive.",
  "Never invent experience, evidence or results to strengthen content.",
  "Respect competitors: do not disparage them or exploit their setbacks.",
  "Verify fixes and releases before claiming them.",
];

export const EMPTY_PERSONA: Persona = {
  tone: "",
  traits: [],
  audience: "",
  topics: [],
  boundaries: [],
  examples: [],
};

export type KnowledgeKind = "story" | "opinion" | "fact" | "reference";

export type Provenance = "firsthand" | "third_party" | "unverified";
export type KnowledgeStatus = "active" | "archived" | "withdrawn";

export interface KnowledgeData {
  title: string;
  body: string;
  source: string;
  sourceUrl: string;

  proofUrl: string;
  speaker: string;
  subject: string;
  occurredOn: string;
  topics: string[];
  uncertainty: string;

  linkOk?: boolean | null;
  linkCheckedAt?: string;
  importId?: string;
  proposalId?: string;
}

export interface Knowledge extends KnowledgeData {
  id: string;
  entityId: string;
  accountId: string | null;
  kind: KnowledgeKind;
  provenance: Provenance;
  status: KnowledgeStatus;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeVersion {
  version: number;
  kind: KnowledgeKind;
  provenance: Provenance;
  status: KnowledgeStatus;
  data: KnowledgeData;
  note: string;
  changedBy: string;
  changedAt: string;
}

export interface ImportProposal {
  id: string;
  importId: string;
  position: number;
  state: "proposed" | "accepted" | "rejected" | "duplicate";
  kind: KnowledgeKind;
  provenance: Provenance;
  title: string;
  body: string;
  speaker: string;
  uncertainty: string;
  flags: string[];
  duplicateOf?: string;
  knowledgeId: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  version: number;
}

export interface InterviewImport {
  id: string;
  entityId: string;
  title: string;
  sourceContext: string;
  speaker: string;
  createdBy: string;
  createdAt: string;
  proposals: ImportProposal[];
}

export interface KnowledgeGap {
  id: string;
  entityId: string;
  accountId: string | null;
  question: string;
  status: "open" | "answered" | "dismissed";
  topic: string;
  reason: string;
  sourceId: string | null;
  knowledgeId: string | null;
  createdBy: string;
  createdAt: string;
  resolvedAt: string | null;
  version: number;
}

export interface RetrievedKnowledge {
  id: string;
  version: number;
  kind: KnowledgeKind;
  provenance: Provenance;
  title: string;
  body: string;
  speaker: string;
  source: string;
  uncertainty: string;
  score: number;
  matched: string[];

  firstPersonAllowed: boolean;
}

export interface Peer {
  id: string;
  accountId: string;
  handle: string;
  name: string;
  url: string;
  sector: string;
  reason: string;
  status: "active" | "removed";
  version: number;
  createdBy: string;
  createdAt: string;
  removedAt: string | null;
}

export type Availability = "available" | "deleted" | "unavailable";

export interface Source {
  id: string;
  provider: string;
  externalId: string;
  url: string;
  authorHandle: string;
  authorName: string;
  text: string;
  publishedAt: string;
  media: string[];
  inReplyToExternalId: string;
  inReplyToUrl: string;
  conversationExternalId: string;
  availability: Availability;
  firstCollectedAt: string;
  lastCollectedAt: string;
  version: number;
}

export type FeedState = "new" | "skipped" | "snoozed" | "handled";

export interface FeedItem {
  id: string;
  accountId: string;
  state: FeedState;
  reason: string;
  snoozeUntil: string | null;
  version: number;
  createdAt: string;
  source: Source;
  parent: Source | null;
  peer: Peer | null;
}

export interface Collection {
  id: string;
  accountId: string;
  provider: string;
  status: "running" | "succeeded" | "partial" | "failed";
  mode: "manual" | "live";
  imported: number;
  duplicates: number;
  errors: string[];
  coverage: string;
  cursor: string | null;
  startedAt: string;
  finishedAt: string | null;
  createdBy: string;
}

export interface Freshness {
  accountId: string;
  lastSuccessAt: string | null;
  lastRun: Collection | null;
  stale: boolean;
  reason: string;
}

export interface ListedAccount extends Account {
  entityName: string;
  entityArchived: boolean;
}

export type WorkKind = "reply" | "post" | "article" | "guide" | "thread";
export type WorkState =
  | "draft"
  | "approved"
  | "rejected"
  | "deferred"
  | "published"
  | "no_reply"
  | "archived";
export type Contribution =
  | "answer"
  | "explanation"
  | "experience"
  | "question"
  | "perspective"
  | "none";

export interface Intent {
  audience: string;
  purpose: string;
  rationale: string;
  practice: "routine" | "experiment";
  hypothesis: string;
  expectation: string;
  baseline: string;
  evidence: string;
  reviewPoint: string;
  strategyRef: string;
}

export interface RevisionContext {
  guidanceVersion: number;
  personaVersion: number;
  knowledge: { id: string; version: number; firstPersonAllowed: boolean }[];
  sourceId: string | null;
  workflow: string;
  model: string;
  gapIds: string[];
  lessons?: { id: string; version: number }[];
}

export interface Revision {
  n: number;
  text: string;
  origin: "generated" | "manual" | "edited" | "regenerated";
  note: string;
  context: RevisionContext;
  createdBy: string;
  createdAt: string;
}

export interface Grade {
  id: string;
  revision: number;
  score: 1 | 2 | 3 | 4;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface Publication {
  id: string;
  workId: string;
  accountId: string;
  revision: number;
  text: string;
  url: string;
  publishedAt: string;
  corrections: {
    url: string;
    publishedAt: string;
    reason: string;
    by: string;
    at: string;
  }[];
  destinationCheck: string;
  version: number;
  createdBy: string;
  createdAt: string;
}

export interface Work {
  id: string;
  entityId: string;
  accountId: string;
  kind: WorkKind;
  sourceId: string | null;
  feedId: string | null;
  state: WorkState;
  revision: number;
  approvedRevision: number | null;
  title: string;
  contribution: Contribution;
  intent: Intent;
  reason: string;
  text: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkDetail {
  work: Work;
  account: Account;
  entityName: string;
  source: Source | null;
  parent: Source | null;
  revisions: Revision[];
  grades: Grade[];
  publication: Publication | null;
  cited: {
    id: string;
    version: number;
    currentVersion: number;
    title: string;
    provenance: Provenance;
    status: KnowledgeStatus;
    body: string;
  }[];
  history: ActivityItem[];
}

export const GRADE_SCALE: Record<1 | 2 | 3 | 4, { label: string; meaning: string }> = {
  1: {
    label: "Not usable",
    meaning: "Wrong, unhelpful, off-voice or breaks a principle; would not publish.",
  },
  2: {
    label: "Needs major changes",
    meaning: "Useful idea, but substance or voice needs substantial rework.",
  },
  3: {
    label: "Good with edits",
    meaning: "Accurate and useful; minor edits to wording or length.",
  },
  4: {
    label: "Ready as written",
    meaning: "Accurate, useful, authentic and on-voice; publish as is.",
  },
};

export interface Limits {
  maxUnreviewed: number;

  dailyDrafts: number;

  maxRetries: number;

  heavyDailyUnits: number;
  paused: boolean;
  pauseReason: string;

  pausedBy?: string | null;
}
export const DEFAULT_LIMITS: Limits = {
  maxUnreviewed: 10,
  dailyDrafts: 15,
  maxRetries: 2,
  heavyDailyUnits: 0,
  paused: false,
  pauseReason: "",
};

export type JobStatus =
  | "queued"
  | "awaiting_approval"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled"
  | "paused"
  | "blocked";
export interface Job {
  id: string;
  kind: string;
  accountId: string | null;
  entityId: string | null;
  status: JobStatus;
  costClass: "light" | "heavy";
  attempts: number;
  maxAttempts: number;
  requestKey: string;
  input: Record<string, unknown>;
  estimateUnits: number | null;
  reservedUnits: number;
  usedUnits: number;
  stopReason: string;
  error: string;
  result: Record<string, unknown> | null;
  approvedBy: string | null;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Usage {
  scope: string;
  limits: Limits;
  limitsVersion: number | null;
  unreviewed: number;
  draftsToday: number;
  heavyUnitsToday: number;
  runningJobs: number;
}

export const themeTitle = (a: { title?: string; item: string }) => (a.title ?? "").trim() || a.item;
