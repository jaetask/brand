import { useCallback, useEffect, useState } from "react";

export type Outcome =
  | { state: "succeeded"; output: unknown }
  | { state: "held" }
  | { state: string; reason?: { message: string } };

export type Brand = {
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
};

export type Voice = {
  keyPhrases: string[];
  borrowedPhrases: { phrase: string; from: string }[];
  toneRules: string;
  example: string;
};

export type Score = { score: number | null; note: string };
export type FreeProduct = {
  name: string;
  hook: string;
  url: string;
  delivers: "unknown" | "yes" | "no";
  fixes: string;
  gates?: { label: string; done: boolean }[];
  later?: string[];
  shelved?: boolean;
  suggestedHook?: string;
};
export type BeltApp = { name: string; status: "public" | "private" | "planned"; url?: string };
export type Plan = {
  proof: { path: "" | "A" | "B" };
  person: {
    who: string;
    pain: string;
    pays: string;
    tests: Record<PersonTest, Score>;
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
    apps?: BeltApp[];
    suggestedPromise?: string;
  };
};
export type Guidance = {
  principles: string[];
  conduct: string;
  audiencePromise: string;
  verbalStyle: string;
  voice?: Voice;
  visual: { colours: string[]; typography: string; logos: string[] };
  plan: Plan;
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
export const PLAN_LEVELS = ["proof", "person", "association", "product", "belt"] as const;
export type PlanLevel = (typeof PLAN_LEVELS)[number];

export type LevelStatus = {
  level: PlanLevel;
  n: number;
  title: string;
  state: "done" | "partial" | "empty";
  done: string[];
  missing: string[];
  items: { key: string; label: string; ok: boolean }[];
};

export type Identity = {
  id: string;
  brandId: string;
  status: "suggested" | "accepted" | "rejected" | "retired";
  version: number;
  suggestedBy: string;
  createdAt: string;
  updatedAt: string;
  line: string;
  credit: string;
  creditUrl: string;
  thought: string;
  themes: string[];
};

export type Proof = {
  id: string;
  brandId: string;
  accountId: string | null;
  kind: "story" | "opinion" | "fact" | "reference";
  provenance: "firsthand" | "third_party" | "unverified";
  status: "active" | "archived" | "withdrawn";
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
};

export type Channel = {
  id: string;
  brandId: string;
  kind: "x" | "blog" | "newsletter" | "website" | "other";
  name: string;
  description: string;
  url: string;
  archived: boolean;
  version: number;
};
export type Persona = {
  tone: string;
  traits: string[];
  audience: string;
  topics: string[];
  boundaries: string[];
  examples: string[];
};
export type Peer = {
  id: string;
  accountId: string;
  handle: string;
  name: string;
  url: string;
  sector: string;
  reason: string;
  status: "active" | "removed";
};
export type Account = {
  id: string;
  brandId: string;
  channelId: string;
  channelKind: Channel["kind"];
  name: string;
  handle: string;
  url: string;
  role: string;
  instructions: string;
  archived: boolean;
  persona: Persona;
  peers: Peer[];
};
export type Season = {
  n: number;
  start: string;
  end: string;
  goal: string;
  path: "" | "A" | "B";
  target: number | null;
  proofNeeded: number;
  notes?: string;
  version: number;
  idea: string;
};
export type HistoryItem = {
  id: number;
  subjectKind: string;
  subjectId: string;
  actorId: string;
  text: string;
  createdAt: string;
};

export type Detail = {
  brand: Brand;
  guidance: Guidance;
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
  accounts: Account[];
  identity: Identity[];
  proof: Proof[];
  seasons: Season[];
  ideas: { n: number; idea: string }[];
  guidanceVersions: { n: number; note: string; createdBy: string; createdAt: string }[];
  history: HistoryItem[];
};

export type Actor = { id: string; name: string; kind: string };

export async function call(action: string, input: unknown = {}): Promise<Outcome> {
  const response = await fetch("/api/calls", {
    method: "POST",
    credentials: "same-origin",
    headers: { "x-kit-request": "1", "content-type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), action: `brand.${action}`, input }),
  });
  return (await response.json()) as Outcome;
}

export const succeeded = (o: Outcome): o is { state: "succeeded"; output: unknown } =>
  o.state === "succeeded";

export const refusal = (o: Outcome) =>
  "reason" in o && o.reason ? o.reason.message : `The change did not go through (${o.state}).`;

let version = 0;
const listeners = new Set<() => void>();
let source: EventSource | undefined;
function watch() {
  if (source) return;
  source = new EventSource("/events");
  source.addEventListener("change", () => {
    version += 1;
    for (const listener of listeners) listener();
  });
}

export function useRead<T>(action: string, input: unknown): T | undefined {
  const [value, setValue] = useState<T>();
  const [tick, setTick] = useState(version);
  const key = JSON.stringify(input);
  useEffect(() => {
    watch();
    const on = () => setTick(version);
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, []);
  const load = useCallback(async () => {
    const outcome = await call(action, JSON.parse(key));
    if (succeeded(outcome)) setValue(outcome.output as T);
  }, [action, key]);
  useEffect(() => {
    void tick;
    void load();
  }, [load, tick]);
  return value;
}
