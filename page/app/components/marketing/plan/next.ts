import {
  PERSON_TEST_TITLES,
  countsAsProof,
  type EntityDetail,
  type LevelStatus,
  type PersonTest,
} from "@shared/marketing";

const TEST_OF: Record<string, PersonTest> = {
  market: "growingMarket",
  urgency: "acutePain",
  budget: "purchasingPower",
  clarity: "algorithmicClarity",
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface NextAction {
  level: LevelStatus;
  key: string;

  text: string;

  short: string;

  progress?: string;
}

export function actionFor(detail: EntityDetail, level: LevelStatus, key: string): NextAction {
  const plan = detail.guidance.plan;
  const base = { level, key };
  switch (key) {
    case "path":
      return {
        ...base,
        text: "Choose this season's path: show results you have (A) or earn them (B)",
        short: "choose a path",
      };
    case "proof-links": {
      const need = detail.plan.proofNeeded;
      const have = Math.min(detail.plan.proofLinked, need);
      const left = need - have;
      return {
        ...base,
        text: `Link ${plural(left, "proof entry", "proof entries")} to something a reader can open`,
        short: plural(left, "proof link", "proof links"),
        progress: `${have} of ${need} so far`,
      };
    }
    case "who":
      return {
        ...base,
        text: "Say who exactly your person is, in one sentence",
        short: "who your person is",
      };
    case "pain":
      return {
        ...base,
        text: "Name the pain your person feels most",
        short: "their pain",
      };
    case "pays-for":
      return {
        ...base,
        text: "Say what your person already pays for",
        short: "what they pay for",
      };
    case "market":
    case "urgency":
    case "budget":
    case "clarity":
      return {
        ...base,
        text: `Score ${PERSON_TEST_TITLES[TEST_OF[key]].toLowerCase()} from 1 to 10, with a reason`,
        short: `score ${PERSON_TEST_TITLES[TEST_OF[key]].toLowerCase()}`,
      };
    case "audiences":
      return {
        ...base,
        text: "List the audiences you mean to reach",
        short: "your audiences",
      };
    case "promise":
      return level.level === "belt"
        ? {
            ...base,
            text: "Write the belt's exact promise",
            short: "the promise",
          }
        : {
            ...base,
            text: "Say what people get from following you",
            short: "the promise",
          };
    case "amplify": {
      const have = plan.association.amplify.filter(
        (a) => ((a.title ?? "").trim() || a.item.trim()) && a.postIdea.trim(),
      ).length;
      const left = Math.max(1, 5 - have);
      return {
        ...base,
        text: `Add ${plural(left, "thing your person loves", "things your person loves")}, each with a post idea`,
        short: plural(left, "theme", "themes"),
        progress: `${have} of 5 so far`,
      };
    }
    case "anti-brand": {
      const missing = plan.association.antiBrand.find((a) => a.item.trim() && !a.standard.trim());
      return missing
        ? {
            ...base,
            text: `Write the standard you hold instead of "${missing.item}"`,
            short: "a standard",
          }
        : {
            ...base,
            text: "Add what your person can't stand, each with your standard",
            short: "anti-brand items",
          };
    }
    case "visual-constants":
      return {
        ...base,
        text: "Pick 2 or 3 visual constants you'll keep for a year",
        short: "visual constants",
      };
    case "verbal-style":
      return {
        ...base,
        text: "Write how the brand sounds: key phrases, credits, tone",
        short: "your voice",
      };
    case "free-product":
      return {
        ...base,
        text: "Name a free product and the hook that sells it",
        short: "a free product",
      };
    case "delivers": {
      const p = plan.product.freeProducts.find((f) => !f.shelved && f.name.trim() && f.hook.trim());
      const gates = p?.gates ?? [];
      const left = gates.filter((g) => !g.done).length;
      return gates.length
        ? {
            ...base,
            text: `Tick the ${plural(left, "release gate", "release gates")} left for ${p!.name}`,
            short: `tick the ${plural(left, "release gate", "release gates")}`,
            progress: `${gates.length - left} of ${gates.length} so far`,
          }
        : {
            ...base,
            text: "Make the free product deliver on its hook",
            short: "deliver on the hook",
          };
    }
    case "project":
      return {
        ...base,
        text: "Name the public project people can follow",
        short: "the project",
      };
    case "target":
      return {
        ...base,
        text: "Set the season's target number",
        short: "the target",
      };
    case "launch-date":
      return { ...base, text: "Set the launch date", short: "the launch date" };
    case "deadline-shown":
      return {
        ...base,
        text: "Say where the deadline shows: a pinned post, the bio, a cover",
        short: "where it shows",
      };
    case "delay-plan":
      return {
        ...base,
        text: "Say how you'll explain a delay or a miss",
        short: "the slip plan",
      };
    case "check-in-day":
      return {
        ...base,
        text: "Pick the weekly check-in day",
        short: "check-in day",
      };
    default: {
      const item = level.items.find((i) => i.key === key);
      return { ...base, text: item?.label ?? key, short: item?.label ?? key };
    }
  }
}

export function waitingActions(detail: EntityDetail): NextAction[] {
  return detail.plan.levels.flatMap((l) =>
    l.items.filter((i) => !i.ok).map((i) => actionFor(detail, l, i.key)),
  );
}

export function publicCount(detail: EntityDetail, knowledgeLinks?: string[]) {
  const apps = detail.guidance.plan.belt.apps;
  if (apps?.length) return apps.filter((a) => a.status === "public").length;
  return knowledgeLinks
    ? knowledgeLinks.filter((u) => countsAsProof(u)).length
    : detail.plan.proofLinked;
}
