import type { Season, SeasonStatus } from "@shared/marketing";
import { useActionQuery } from "@shims/use-action";

type Dated = Season & SeasonStatus;
export interface SeasonView {
  today: string;
  seasons: Dated[];
  current: Dated & { headline: string };
  next: Season | null;
  nextOpensOn: string;
  canCreateNext: boolean;
  ideas: { n: number; idea: string }[];
}

export const PATH_NAMES = {
  A: "Outcome flex",
  B: "30-day volume sprint",
} as const;

export function useSeasons(entityId: string) {
  return useActionQuery<SeasonView>("list-seasons", { entityId });
}
