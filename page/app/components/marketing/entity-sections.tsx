import type { EntityDetail } from "@shared/marketing";
import {
  IconQuote,
  IconShieldCheck,
  IconTarget,
  IconUserCircle,
  type Icon,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

import { BrandBeliefs } from "@/components/marketing/BrandPages";
import { KnowledgePanel } from "@/components/marketing/KnowledgePanel";
import { PlanHome } from "@/components/marketing/PlanBoard";
import { ProfilePage } from "@/components/marketing/ProfilePage";
import { when } from "@/components/marketing/ui";

export interface EntitySection {
  id: string;
  label: string;
  icon: Icon;
  render: (d: EntityDetail) => ReactNode;

  navLabel?: string;

  sub?: string;
}

export function EntityHistory({ detail }: { detail: EntityDetail }) {
  return (
    <ol className="grid gap-2 text-sm">
      {detail.history.map((h) => (
        <li key={h.id} className="flex gap-3">
          <span className="w-40 shrink-0 text-muted-foreground">{when(h.createdAt)}</span>
          <span className="w-16 shrink-0 font-mono text-xs leading-5">{h.actorId}</span>
          <span>{h.text}</span>
        </li>
      ))}
    </ol>
  );
}

export const ENTITY_SECTIONS: EntitySection[] = [
  {
    id: "profile",
    label: "Profile",
    sub: "Who you are · profile",
    icon: IconUserCircle,
    render: (d) => <ProfilePage detail={d} />,
  },
  {
    id: "beliefs",
    label: "What you believe",
    sub: "Lines that define your character",
    icon: IconQuote,
    render: (d) => <BrandBeliefs detail={d} />,
  },
  {
    id: "plan",
    label: "Overview",
    icon: IconTarget,
    render: (d) => <PlanHome detail={d} />,
  },
  {
    id: "proof",
    label: "Proof",
    icon: IconShieldCheck,
    render: (d) => <KnowledgePanel detail={d} />,
  },
];

export const ACTION_SECTIONS: EntitySection[] = [];

export const SECTION_ALIASES: Record<string, string> = {
  overview: "plan",
  guidance: "plan",
  knowledge: "proof",
  intel: "interviews",
  briefs: "content",
  learning: "results",
  identity: "beliefs",
  peers: "profile",
  accounts: "profile",
  setup: "profile",
};
export const sectionById = (id: string | undefined) => ENTITY_SECTIONS.find((s) => s.id === id);

export const planComplete = (d: Pick<EntityDetail, "plan">) =>
  d.plan.levels.length > 0 && d.plan.levels.every((l) => l.state === "done");

export const brandLanding = (d: Pick<EntityDetail, "plan">) => "plan";
