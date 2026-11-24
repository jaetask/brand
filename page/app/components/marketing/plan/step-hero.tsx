import type { LevelStatus, PlanLevel } from "@shared/marketing";
import { IconArrowsMaximize, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";

import { CardLink } from "@/components/marketing/kit/page";
import { DIAGRAMS, SOURCE_URL, planPath, stepProgress } from "@/components/marketing/plan/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ORANGE = "var(--p-d97706)";
const GREEN = "var(--p-1a7f37)";

export const HEADLINES: Record<PlanLevel, [string, string]> = {
  proof: [
    "Without proof, everything after is opinion.",
    "When content is easy to make, real work, results and mistakes are what people trust.",
  ],
  person: [
    "One sentence about who it's for decides everything else.",
    "Your topics, examples, products and who you stand next to all follow from it.",
  ],
  association: [
    "People learn what to expect from you through repetition.",
    "The topics, tools, people and look they keep seeing.",
  ],
  product: [
    "Marketing says what you promise. The free thing proves it.",
    "Ship something free that does exactly what its hook says.",
  ],
  belt: [
    "A public project with a result, a date and visible progress.",
    "It gives people a reason to come back every week.",
  ],
};

function ConicRing({ pct, n }: { pct: number; n: number }) {
  const color = pct === 100 ? GREEN : pct > 0 ? ORANGE : "var(--p-6b6a63)";
  const fill = pct === 100 ? GREEN : ORANGE;
  return (
    <span
      aria-hidden
      className="grid size-[34px] shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${fill} ${pct * 3.6}deg, var(--p-e2e0d8) 0)`,
      }}
    >
      <span
        className="grid size-[26px] place-items-center rounded-full bg-[var(--p-card)] text-[13px] font-extrabold"
        style={{ color }}
      >
        {n}
      </span>
    </span>
  );
}

export function StepNav({
  entityId,
  levels,
  current,
}: {
  entityId: string;
  levels: LevelStatus[];
  current: PlanLevel;
}) {
  return (
    <nav aria-label="Plan steps" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ol className="grid min-w-[44rem] grid-cols-5 gap-1 rounded-2xl bg-[var(--p-f0efe9)] p-1.5">
        {levels.map((l) => {
          const { pct } = stepProgress(l);
          const here = l.level === current;
          return (
            <li key={l.level}>
              <CardLink
                to={planPath(entityId, l.level)}
                aria-current={here ? "page" : undefined}
                aria-label={`Step ${l.n}, ${l.title}: ${pct === 100 ? "done" : `${pct}%`}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[var(--p-1f2328)] transition-colors",
                  here
                    ? "bg-[var(--p-card)] shadow-[0_0_0_1.5px_var(--p-1f2328)]"
                    : "hover:bg-[var(--p-card)]/60",
                )}
              >
                <ConicRing pct={pct} n={l.n} />
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate text-[15px] font-bold">{l.title}</span>
                  <span className="text-[13px] text-[var(--p-6b6a63)]">
                    {pct === 100 ? "done" : `${pct}%`}
                  </span>
                </span>
              </CardLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StepHero({ status, aside }: { status: LevelStatus; aside?: ReactNode }) {
  const [head, sub] = HEADLINES[status.level];
  return (
    <section
      aria-label={`Step ${status.n}: ${status.title}`}
      className={cn(
        "grid items-stretch gap-7",
        aside ? "lg:grid-cols-[1fr_1.2fr]" : "lg:grid-cols-[1.05fr_1fr]",
      )}
    >
      <div className="flex flex-col justify-center gap-4 rounded-2xl border border-[var(--p-e6e4dd)] bg-[var(--p-card)] p-8">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--p-6b6a63)]">
          Step {status.n} of 5 · {status.title}
        </span>
        <h2 className="text-[30px] font-extrabold leading-tight tracking-tight text-[var(--p-1f2328)]">
          {head}
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--p-4a4943)]">
          {sub}{" "}
          <a
            className="text-[13px] text-[var(--p-6b6a63)] underline underline-offset-[3px]"
            href={SOURCE_URL}
            target="_blank"
            rel="noreferrer"
          >
            hoeem's guide
          </a>
        </p>
      </div>
      {aside ?? <Carousel key={status.level} images={DIAGRAMS[status.level]} />}
    </section>
  );
}

const ADVANCE_MS = 10_000;

export function Carousel({ images }: { images: { src: string; alt: string }[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(images.length > 1);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const shown = images.filter((x) => !failed.has(x.src));
  const n = shown.length;
  useEffect(() => {
    if (!playing || n < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), ADVANCE_MS);
    return () => clearInterval(t);
  }, [playing, n]);
  if (!n) return null;
  const at = i % n;
  const pick = (to: number) => {
    setI(((to % n) + n) % n);
    setPlaying(false);
  };
  const img = shown[at];
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[14px] border border-[var(--p-e6e4dd)] bg-[var(--p-card)]"
      aria-roledescription="carousel"
      aria-label="hoeem's graphics for this step"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--p-card)]">
        <img
          key={img.src}
          src={`/brand-plan/images/${img.src}`}
          alt={img.alt}
          className="absolute inset-0 size-full object-contain object-center"
          onError={() => setFailed((f) => new Set(f).add(img.src))}
        />
        <a
          href={`/brand-plan/images/${img.src}`}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg border border-[var(--p-d6d4cc)] bg-[var(--p-card)] px-2 py-1 text-xs text-[var(--p-4a4943)] hover:bg-[var(--p-f7f7f4)]"
        >
          <IconArrowsMaximize size={12} /> Expand
        </a>
      </div>
      {n > 1 && (
        <div className="flex items-center gap-2.5 border-t border-[var(--p-e6e4dd)] px-3.5 py-2.5 text-xs text-[var(--p-6b6a63)]">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Previous graphic"
            onClick={() => pick(at - 1)}
          >
            <IconChevronLeft size={14} />
          </Button>
          {shown.map((x, k) => (
            <Button
              key={x.src}
              variant="ghost"
              className="h-4 p-0 hover:bg-transparent"
              aria-label={`Show graphic ${k + 1}: ${x.alt}`}
              aria-current={k === at ? "true" : undefined}
              onClick={() => pick(k)}
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all",
                  k === at ? "w-[22px] bg-[var(--p-1f2328)]" : "w-2 bg-[var(--p-d0d7de)]",
                )}
              />
            </Button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Next graphic"
            onClick={() => pick(at + 1)}
          >
            <IconChevronRight size={14} />
          </Button>
          <span className="min-w-0 flex-1 truncate">
            {img.alt} · {at + 1} of {n}
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-[var(--p-6b6a63)] underline underline-offset-[3px]"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? "Pause" : "Play"}
          </Button>
        </div>
      )}
    </div>
  );
}
