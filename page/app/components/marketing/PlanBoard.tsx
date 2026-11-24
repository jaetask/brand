import type { EntityDetail, LevelStatus, PlanLevel } from "@shared/marketing";
import { useState } from "react";
import { useNavigate } from "@shims/react-router";

import { BackLink, CardLink, PageLink } from "@/components/marketing/kit/page";
import { associationCheckPart } from "@/components/marketing/plan/association";
import { beltCheckPart } from "@/components/marketing/plan/belt";
import { SeasonHero } from "@/components/marketing/plan/home-hero";
import { planPath, stepProgress, useFromHref } from "@/components/marketing/plan/kit";
import { waitingActions } from "@/components/marketing/plan/next";
import { PersonFunnel, personCheckPart } from "@/components/marketing/plan/person";
import { Pipeline } from "@/components/marketing/plan/pipeline";
import { productCheckPart } from "@/components/marketing/plan/product";
import { useSeasons } from "@/components/marketing/plan/season";
import { stepEditPath } from "@/components/marketing/plan/step-edit";
import { StepHero, StepNav } from "@/components/marketing/plan/step-hero";
import { proofCheckPart } from "@/components/marketing/plan/steps";
import { StepWork } from "@/components/marketing/plan/steps";
import { Status } from "@/components/marketing/ui";

export function PlanHome({ detail }: { detail: EntityDetail }) {
  const e = detail.entity;
  const levels = detail.plan.levels;
  const waiting = waitingActions(detail);
  const next = waiting[0];
  const seasons = useSeasons(e.id);
  const done = levels.filter((l) => l.state === "done").length;
  return (
    <div className="flex max-w-[75rem] flex-col gap-7 text-[var(--p-1f2328)]">
      <Status loading={seasons.isLoading} error={seasons.error}>
        {seasons.data && <SeasonHero detail={detail} view={seasons.data} />}
      </Status>
      <section
        aria-labelledby="five-steps"
        className="flex flex-col gap-3.5 rounded-[20px] bg-[var(--p-f0efe9)] px-6 pb-6 pt-[22px]"
      >
        <div className="flex items-baseline justify-between">
          <h2 id="five-steps" className="text-xl font-extrabold">
            Your five steps
          </h2>
          <span className="text-[13px] text-[var(--p-6b6a63)]">{done} of 5 done</span>
        </div>
        <ol
          className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
          aria-label="Steps"
        >
          {levels.map((l) => (
            <li key={l.level}>
              <StepCard
                entityId={e.id}
                status={l}
                next={waiting.find((w) => w.level.level === l.level)?.short}
              />
            </li>
          ))}
        </ol>
      </section>
      {next ? (
        <section
          aria-label="The one next thing"
          className="flex flex-wrap items-center gap-5 rounded-2xl border border-[var(--p-e6e4dd)] bg-[var(--p-fafaf8)] px-6 py-5"
        >
          <StepRing pct={stepProgress(next.level).pct} n={next.level.n} neutral />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--p-6b6a63)]">
              Next
            </span>
            <span className="text-[19px] font-extrabold">{next.text}</span>
            <span className="text-sm text-[var(--p-6b6a63)]">
              Step {next.level.n}, {next.level.title}
              {next.progress ? ` · ${next.progress}` : ""}
            </span>
          </div>
          <PageLink to={planPath(e.id, next.level.level)} onWhite>
            Open {next.level.title}
          </PageLink>
        </section>
      ) : (
        <section
          aria-label="The one next thing"
          className="rounded-2xl border border-[var(--p-1a7f37)] bg-[var(--p-f2fbf4)] px-6 py-5 text-[19px] font-extrabold"
        >
          Every step is done. Keep the belt's weekly check-ins going.
        </section>
      )}
    </div>
  );
}

function StepRing({ pct, n, neutral = false }: { pct: number; n: number; neutral?: boolean }) {
  const r = 12;
  const c = 2 * Math.PI * r;
  const color = pct === 100 ? "var(--p-1a7f37)" : neutral ? "var(--p-6b6a63)" : "var(--p-d97706)";
  return (
    <span className="relative inline-grid size-[30px] shrink-0 place-items-center">
      <svg
        width={30}
        height={30}
        viewBox="0 0 30 30"
        aria-hidden
        className="absolute inset-0 -rotate-90"
      >
        <circle
          style={{ stroke: "var(--p-ecebe5)" }}
          cx={15}
          cy={15}
          r={r}
          fill="none"
          strokeWidth={4}
        />
        {pct > 0 && (
          <circle
            style={{ stroke: color }}
            cx={15}
            cy={15}
            r={r}
            fill="none"
            strokeWidth={4}
            strokeDasharray={`${(pct / 100) * c} ${c}`}
          />
        )}
      </svg>
      <span className="relative text-[11px] font-extrabold" style={{ color }}>
        {n}
      </span>
    </span>
  );
}

function StepCard({
  entityId,
  status: l,
  next,
}: {
  entityId: string;
  status: LevelStatus;
  next?: string;
}) {
  const { pct, done, total } = stepProgress(l);
  const complete = pct === 100;
  return (
    <CardLink
      to={planPath(entityId, l.level)}
      aria-label={`Step ${l.n}, ${l.title}: ${complete ? "done" : `${pct}%`}`}
      className="flex h-full flex-col gap-2.5 rounded-2xl border border-[var(--p-e6e4dd)] bg-[var(--p-card)] p-[18px] transition-colors hover:border-[var(--p-c9c7bf)] hover:bg-[var(--p-fbfbf9)]"
    >
      <span className="text-[13px] font-bold text-[var(--p-6b6a63)]">Step {l.n}</span>
      <span className="text-[17px] font-extrabold">{l.title}</span>
      <span className="block h-2 overflow-hidden rounded-full bg-[var(--p-ecebe5)]">
        {pct > 0 && (
          <span
            className="block h-full"
            style={{
              width: `${pct}%`,
              background: complete ? "var(--p-1a7f37)" : "var(--p-d97706)",
            }}
          />
        )}
      </span>
      <span
        className="text-[13px] font-bold"
        style={{
          color: complete ? "var(--p-1a7f37)" : pct > 0 ? "var(--p-d97706)" : "var(--p-6b6a63)",
        }}
      >
        {complete ? "100% · done" : `${pct}%`}
      </span>
      <span className="text-xs leading-snug text-[var(--p-6b6a63)]">
        {complete || !next ? `${done} of ${total} in place` : `Next: ${next}`}
      </span>
    </CardLink>
  );
}

export function PlanStep({ detail, level }: { detail: EntityDetail; level: PlanLevel }) {
  const e = detail.entity;
  const status = detail.plan.levels.find((l) => l.level === level)!;

  const [selected, setSelected] = useState(-1);

  const navigate = useNavigate();
  const fromHere = useFromHref("");
  const checkPart = {
    proof: proofCheckPart,
    person: personCheckPart,
    association: associationCheckPart,
    product: productCheckPart,
    belt: beltCheckPart,
  }[level];
  const openCheck = (key: string) => {
    const part = checkPart[key];
    if (part) navigate(`${stepEditPath(e.id, level, part)}${fromHere}`);
  };
  return (
    <div className="flex max-w-[75rem] flex-col gap-7 text-[var(--p-1f2328)]">
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-[13px] text-[var(--p-6b6a63)]">
          <BackLink to={planPath(e.id)} />
        </div>
        <StepNav entityId={e.id} levels={detail.plan.levels} current={level} />
      </div>
      <StepHero
        status={status}
        aside={
          level === "person" ? (
            <PersonFunnel detail={detail} selected={selected} onSelect={setSelected} />
          ) : undefined
        }
      />
      <section aria-labelledby="done-when" className="flex flex-col gap-3.5">
        <h2 id="done-when" className="text-xl font-extrabold">
          Done when
        </h2>
        <Pipeline status={status} brand={e.name} onWaiting={e.archived ? undefined : openCheck} />
      </section>
      <section aria-label="The work">
        <StepWork key={level} level={level} detail={detail} selected={selected} />
      </section>
    </div>
  );
}
