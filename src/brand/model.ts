import { z } from "zod";

export const OWNER = "owner";

export const ChannelKind = z.enum(["x", "blog", "newsletter", "website", "other"]);
export type ChannelKind = z.infer<typeof ChannelKind>;

export const Brand = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  colour: z.string(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  navOrder: z.number(),
  purpose: z.string(),
  audiences: z.array(z.string()),
  goals: z.array(z.string()),
  archived: z.boolean(),
  guidanceVersion: z.number(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Brand = z.infer<typeof Brand>;

export const Voice = z.object({
  keyPhrases: z.array(z.string()),
  borrowedPhrases: z.array(z.object({ phrase: z.string(), from: z.string() })),
  toneRules: z.string(),
  example: z.string(),
});
export type Voice = z.infer<typeof Voice>;

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

const Score = z.object({ score: z.number().nullable(), note: z.string() });

export const FreeProduct = z.object({
  name: z.string(),
  hook: z.string(),
  url: z.string(),
  delivers: z.enum(["unknown", "yes", "no"]),
  fixes: z.string(),
  gates: z.array(z.object({ label: z.string(), done: z.boolean() })).optional(),
  later: z.array(z.string()).optional(),
  shelved: z.boolean().optional(),
  suggestedHook: z.string().optional(),
});
export type FreeProduct = z.infer<typeof FreeProduct>;

export const BeltApp = z.object({
  name: z.string(),
  status: z.enum(["public", "private", "planned"]),
  url: z.string().optional(),
});

export const BrandPlan = z.object({
  proof: z.object({ path: z.enum(["", "A", "B"]) }),
  person: z.object({
    who: z.string(),
    pain: z.string(),
    pays: z.string(),
    tests: z.object({
      growingMarket: Score,
      acutePain: Score,
      purchasingPower: Score,
      algorithmicClarity: Score,
    }),
    reviewed: z.object({ purpose: z.string().optional(), goals: z.string().optional() }).optional(),
  }),
  association: z.object({
    amplify: z.array(
      z.object({ title: z.string().optional(), item: z.string(), postIdea: z.string() }),
    ),
    antiBrand: z.array(
      z.object({ item: z.string(), standard: z.string(), suggestion: z.string().optional() }),
    ),
    visualConstants: z.array(z.string()),
    keep: z.array(z.string()).optional(),
  }),
  product: z.object({ freeProducts: z.array(FreeProduct) }),
  belt: z.object({
    project: z.string(),
    promise: z.string(),
    target: z.string(),
    launchDate: z.string(),
    deadlineShown: z.string(),
    delayPlan: z.string(),
    checkInDay: z.string(),
    apps: z.array(BeltApp).optional(),
    suggestedPromise: z.string().optional(),
  }),
});
export type BrandPlan = z.infer<typeof BrandPlan>;

export const Guidance = z.object({
  principles: z.array(z.string()),
  conduct: z.string(),
  audiencePromise: z.string(),
  verbalStyle: z.string(),
  voice: Voice.optional(),
  visual: z.object({
    colours: z.array(z.string()),
    typography: z.string(),
    logos: z.array(z.string()),
  }),
  plan: BrandPlan,
});
export type Guidance = z.infer<typeof Guidance>;

export const Persona = z.object({
  tone: z.string(),
  traits: z.array(z.string()),
  audience: z.string(),
  topics: z.array(z.string()),
  boundaries: z.array(z.string()),
  examples: z.array(z.string()),
});
export type Persona = z.infer<typeof Persona>;

export const EMPTY_PERSONA: Persona = {
  tone: "",
  traits: [],
  audience: "",
  topics: [],
  boundaries: [],
  examples: [],
};

export const DEFAULT_PRINCIPLES = [
  "Be consistently useful: help people solve real problems and make progress.",
  "Be honest and constructive, not artificially positive.",
  "Never invent experience, evidence or results to strengthen content.",
  "Respect competitors: do not disparage them or exploit their setbacks.",
  "Verify fixes and releases before claiming them.",
];

export function emptyPlan(): BrandPlan {
  return {
    proof: { path: "" },
    person: {
      who: "",
      pain: "",
      pays: "",
      tests: {
        growingMarket: { score: null, note: "" },
        acutePain: { score: null, note: "" },
        purchasingPower: { score: null, note: "" },
        algorithmicClarity: { score: null, note: "" },
      },
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

type Loose = Record<string, unknown>;
const part = (v: unknown): Loose => (v && typeof v === "object" ? (v as Loose) : {});

export function normalizePlan(p: unknown): BrandPlan {
  const e = emptyPlan();
  const x = part(p);
  const person = part(x.person);
  return {
    proof: { ...e.proof, ...part(x.proof) } as BrandPlan["proof"],
    person: {
      ...e.person,
      ...person,
      tests: { ...e.person.tests, ...part(person.tests) },
    } as BrandPlan["person"],
    association: { ...e.association, ...part(x.association) } as BrandPlan["association"],
    product: { ...e.product, ...part(x.product) } as BrandPlan["product"],
    belt: { ...e.belt, ...part(x.belt) } as BrandPlan["belt"],
  };
}

export function normalizeGuidance(g: unknown): Guidance {
  const x = part(g);
  const visual = part(x.visual);
  const voice = x.voice ? part(x.voice) : undefined;
  return {
    principles: Array.isArray(x.principles) ? (x.principles as string[]) : [],
    conduct: String(x.conduct ?? ""),
    audiencePromise: String(x.audiencePromise ?? ""),
    verbalStyle: String(x.verbalStyle ?? ""),
    ...(voice
      ? {
          voice: {
            keyPhrases: (voice.keyPhrases as string[] | undefined) ?? [],
            borrowedPhrases: (voice.borrowedPhrases as Voice["borrowedPhrases"] | undefined) ?? [],
            toneRules: String(voice.toneRules ?? ""),
            example: String(voice.example ?? ""),
          },
        }
      : {}),
    visual: {
      colours: (visual.colours as string[] | undefined) ?? [],
      typography: String(visual.typography ?? ""),
      logos: (visual.logos as string[] | undefined) ?? [],
    },
    plan: normalizePlan(x.plan),
  };
}

export function voiceText(g: Pick<Guidance, "voice" | "verbalStyle">): string {
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

export const productDelivers = (f: FreeProduct) =>
  f.delivers === "yes" || (!!f.gates?.length && f.gates.every((g) => g.done));

export const IdentityStatus = z.enum(["suggested", "accepted", "rejected", "retired"]);
export const IdentityData = z.object({
  line: z.string(),
  credit: z.string(),
  creditUrl: z.string(),
  thought: z.string(),
  themes: z.array(z.string()),
});
export type IdentityData = z.infer<typeof IdentityData>;
export const Identity = IdentityData.extend({
  id: z.string(),
  brandId: z.string(),
  status: IdentityStatus,
  version: z.number(),
  suggestedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Identity = z.infer<typeof Identity>;

export const ProofKind = z.enum(["story", "opinion", "fact", "reference"]);
export const Provenance = z.enum(["firsthand", "third_party", "unverified"]);
export const ProofStatus = z.enum(["active", "archived", "withdrawn"]);
export const ProofData = z.object({
  title: z.string(),
  body: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
  proofUrl: z.string(),
  speaker: z.string(),
  subject: z.string(),
  occurredOn: z.string(),
  topics: z.array(z.string()),
  uncertainty: z.string(),
  linkOk: z.boolean().nullable().optional(),
  linkCheckedAt: z.string().optional(),
});
export type ProofData = z.infer<typeof ProofData>;
export const Proof = ProofData.extend({
  id: z.string(),
  brandId: z.string(),
  accountId: z.string().nullable(),
  kind: ProofKind,
  provenance: Provenance,
  status: ProofStatus,
  version: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Proof = z.infer<typeof Proof>;

export const Channel = z.object({
  id: z.string(),
  brandId: z.string(),
  kind: ChannelKind,
  name: z.string(),
  description: z.string(),
  url: z.string(),
  archived: z.boolean(),
  version: z.number(),
});
export type Channel = z.infer<typeof Channel>;

export const Peer = z.object({
  id: z.string(),
  accountId: z.string(),
  handle: z.string(),
  name: z.string(),
  url: z.string(),
  sector: z.string(),
  reason: z.string(),
  status: z.enum(["active", "removed"]),
  version: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
  removedAt: z.string().nullable(),
});
export type Peer = z.infer<typeof Peer>;

export const Account = z.object({
  id: z.string(),
  brandId: z.string(),
  channelId: z.string(),
  channelKind: ChannelKind,
  name: z.string(),
  handle: z.string(),
  url: z.string(),
  role: z.string(),
  instructions: z.string(),
  archived: z.boolean(),
  personaVersion: z.number(),
  version: z.number(),
  persona: Persona,
  peers: z.array(Peer),
});
export type Account = z.infer<typeof Account>;

export const Season = z.object({
  n: z.number(),
  start: z.string(),
  end: z.string(),
  goal: z.string(),
  path: z.enum(["", "A", "B"]),
  target: z.number().nullable(),
  proofNeeded: z.number(),
  notes: z.string().optional(),
  version: z.number(),
  idea: z.string(),
});
export type Season = z.infer<typeof Season>;
export const SeasonIdea = z.object({ n: z.number(), idea: z.string(), version: z.number() });
export type SeasonIdea = z.infer<typeof SeasonIdea>;

export const DEFAULT_SEASON = { n: 1, start: "2026-11-18", end: "2027-02-15" } as const;
export const DEFAULT_PROOF_NEEDED = 3;
export const SEASON_BANDS = [
  { from: 1, to: 30, label: "Proof sprint" },
  { from: 31, to: 60, label: "Your person + Association" },
  { from: 61, to: 90, label: "Product + Belt" },
] as const;

const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
export function seasonStatus(s: { n: number; start: string; end: string }, today: string) {
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
export function currentSeason<T extends { start: string }>(seasons: T[], today: string) {
  return [...seasons].reverse().find((s) => s.start <= today) ?? seasons[0];
}
export const ukToday = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);

export const isProofLink = (url: string) => /^\s*https?:\/\/\S+/i.test(url);
export const countsAsProof = (url: string, linkOk?: boolean | null) =>
  isProofLink(url) && linkOk !== false;

export const LevelState = z.enum(["done", "partial", "empty"]);
export const LevelStatus = z.object({
  level: z.enum(PLAN_LEVELS),
  n: z.number(),
  title: z.string(),
  state: LevelState,
  done: z.array(z.string()),
  missing: z.array(z.string()),
  items: z.array(z.object({ key: z.string(), label: z.string(), ok: z.boolean() })),
});
export type LevelStatus = z.infer<typeof LevelStatus>;

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
  g: Guidance,
  brand: Pick<Brand, "purpose" | "audiences" | "goals">,
  proofLinked: number,
  season: { proofNeeded?: number; target?: number | null } = {},
): LevelStatus[] {
  const needed = season.proofNeeded ?? DEFAULT_PROOF_NEEDED;
  const p = normalizePlan(g.plan);
  const has = realText;
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
      ["Intended audiences", has(brand.audiences), "audiences"],
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
    const items = lists[level];
    const done = items.filter(([, ok]) => ok).map(([k]) => k);
    const missing = items.filter(([, ok]) => !ok).map(([k]) => k);
    const state = !missing.length ? "done" : done.length || started[level] ? "partial" : "empty";
    return {
      level,
      n: i + 1,
      title: PLAN_LEVEL_TITLES[level],
      state,
      done,
      missing,
      items: items.map(([label, ok, key]) => ({ key, label, ok })),
    };
  });
}

export const HistoryItem = z.object({
  id: z.number(),
  subjectKind: z.string(),
  subjectId: z.string(),
  actorId: z.string(),
  text: z.string(),
  createdAt: z.string(),
});
export type HistoryItem = z.infer<typeof HistoryItem>;

export const GuidanceVersion = z.object({
  n: z.number(),
  note: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const BrandDetail = z.object({
  brand: Brand,
  guidance: Guidance,
  plan: z.object({
    levels: z.array(LevelStatus),
    proofLinked: z.number(),
    proofEntries: z.number(),
    identityAccepted: z.number(),
    identitySuggested: z.number(),
    proofNeeded: z.number(),
    seasonTarget: z.number().nullable(),
  }),
  channels: z.array(Channel),
  accounts: z.array(Account),
  identity: z.array(Identity),
  proof: z.array(Proof),
  seasons: z.array(Season),
  ideas: z.array(SeasonIdea),
  guidanceVersions: z.array(GuidanceVersion),
  history: z.array(HistoryItem),
});
export type BrandDetail = z.infer<typeof BrandDetail>;
