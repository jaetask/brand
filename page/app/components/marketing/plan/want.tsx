import type { EntityDetail } from "@shared/marketing";
import type { ReactNode } from "react";

import { InlineText, ListEdit } from "@/components/marketing/plan/edit";
import { usePlanSave } from "@/components/marketing/plan/kit";
import { cn } from "@/lib/utils";

const card = "rounded-2xl border border-[var(--p-e6e4dd)] bg-[var(--p-card)] p-6";
const kicker = "text-xs font-bold uppercase tracking-[0.08em] text-[var(--p-6b6a63)]";

export function WhatYouWant({ detail }: { detail: EntityDetail }) {
  const e = detail.entity;
  const disabled = e.archived;
  const { save } = usePlanSave(e.id, "person");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Why
        title="Why this brand exists"
        answer={
          <InlineText
            label="Why does this brand exist?"
            placeholder="Why does this brand exist?"
            value={e.purpose}
            save={(v) => save({ purpose: v })}
            disabled={disabled}
            className="text-base leading-normal"
          />
        }
      />
      <Why
        title="What you're aiming for"
        answer={
          <ListEdit
            items={e.goals}
            save={(v) => save({ goals: v })}
            label="Goal"
            addLabel="Add another goal…"
            disabled={disabled}
            rowClassName="text-base"
          />
        }
      />
    </div>
  );
}

function Why({ title, answer }: { title: string; answer: ReactNode }) {
  return (
    <div className={cn(card, "flex flex-col gap-2")}>
      <span className={kicker}>{title}</span>
      {answer}
    </div>
  );
}
