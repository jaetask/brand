import { SEASON_BANDS, type EntityDetail } from "@shared/marketing";
import { IconChevronRight } from "@tabler/icons-react";

import { CardLink } from "@/components/marketing/kit/page";
import { useFromHref } from "@/components/marketing/plan/kit";
import { publicCount } from "@/components/marketing/plan/next";
import type { SeasonView } from "@/components/marketing/plan/season";
import { cn } from "@/lib/utils";

const ORANGE = "var(--p-d97706)";
const GREEN = "var(--p-1a7f37)";
const PATHS = {
  A: { name: "Outcome flex", line: "Show results you already have" },
  B: { name: "Volume sprint", line: "Post a lot for 30 days to earn results" },
} as const;
const fmt = (d: string, o: Intl.DateTimeFormatOptions) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", o);
const addDays = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const kicker = "text-xs font-bold uppercase tracking-[0.08em] text-[var(--p-6b6a63)]";

export function SeasonHero({ detail, view }: { detail: EntityDetail; view: SeasonView }) {
  const seasonsHref = useFromHref(`/entities/${detail.entity.id}/seasons`);
  const s = view.current;
  const belt = detail.guidance.plan.belt;
  const headline = s.goal || belt.project || `Season ${s.n}`;
  const target = s.target ?? 8;
  const pub = Math.min(publicCount(detail), target);
  const toGo = s.length - (s.day ?? 0);
  const scale = s.length / 90;
  const bands = SEASON_BANDS.map((b, i) => {
    const from = Math.round((b.from - 1) * scale) + 1;
    const to = i === SEASON_BANDS.length - 1 ? s.length : Math.round(b.to * scale);
    return {
      ...b,
      from,
      to,
      start: addDays(s.start, from - 1),
      end: addDays(s.start, to - 1),
    };
  });
  const day = s.ended ? s.length + 1 : (s.day ?? 0);
  const marker = s.ended ? 100 : s.day ? ((s.day - 0.5) / s.length) * 100 : 0;
  return (
    <section
      aria-label={`Season ${s.n}`}
      className="flex flex-col gap-[22px] rounded-[20px] bg-[var(--p-f0efe9)] px-8 pb-7 pt-[26px] text-[var(--p-1f2328)]"
    >
      <div>
        <CardLink
          to={seasonsHref}
          title={`Open Season ${s.n} in the season editor`}
          className="inline-flex items-center gap-2.5 rounded-[10px] border border-[var(--p-e6e4dd)] bg-[var(--p-card)] py-[7px] pl-3 pr-2.5 hover:bg-[var(--p-fbfbf9)]"
        >
          <span className="text-[13px] font-extrabold">Season {s.n}</span>
          <span className="text-[13px] text-[var(--p-6b6a63)]">
            {fmt(s.start, { day: "numeric", month: "short", year: "numeric" })} –{" "}
            {fmt(s.end, { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <IconChevronRight size={16} className="text-[var(--p-6b6a63)]" />
        </CardLink>
      </div>
      <h2 className="-mt-1 text-[36px] font-extrabold leading-tight tracking-tight">{headline}</h2>
      <div className="grid overflow-hidden rounded-[14px] border border-[var(--p-e6e4dd)] bg-[var(--p-card)] md:grid-cols-[1fr_1.3fr_1fr]">
        <div className="flex flex-col gap-2 px-[22px] py-[18px]">
          {s.ended ? (
            <>
              <span className={kicker}>Season</span>
              <span className="text-[44px] font-extrabold leading-none" style={{ color: GREEN }}>
                Done
              </span>
              <span className="text-[13px] text-[var(--p-6b6a63)]">
                Ended{" "}
                {fmt(s.end, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </>
          ) : s.day ? (
            <>
              <span className={kicker}>Day</span>
              <span className="flex items-baseline gap-2">
                <span className="text-[44px] font-extrabold leading-none">{s.day}</span>
                <span className="text-base font-bold text-[var(--p-6b6a63)]">of {s.length}</span>
              </span>
              <span className="text-[13px] text-[var(--p-6b6a63)]">
                {toGo} {toGo === 1 ? "day" : "days"} to go
              </span>
            </>
          ) : (
            <>
              <span className={kicker}>Starts in</span>
              <span className="flex items-baseline gap-2">
                <span className="text-[44px] font-extrabold leading-none">{s.startsIn}</span>
                <span className="text-base font-bold text-[var(--p-6b6a63)]">
                  {s.startsIn === 1 ? "day" : "days"}
                </span>
              </span>
              <span className="text-[13px] text-[var(--p-6b6a63)]">
                Season {s.n} begins{" "}
                {fmt(s.start, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2.5 border-[var(--p-e6e4dd)] px-[22px] py-[18px] max-md:border-t md:border-x">
          <span className={kicker}>Goal</span>
          <span className="flex items-baseline gap-2">
            <span
              className="text-[30px] font-extrabold leading-none"
              style={pub ? { color: GREEN } : undefined}
            >
              {pub}
            </span>
            <span className="text-[15px] font-bold text-[var(--p-6b6a63)]">
              of {target} apps public
            </span>
          </span>
          <span className="flex flex-wrap gap-[5px]" aria-hidden>
            {Array.from({ length: target }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "size-[18px] rounded-[5px]",
                  i < pub
                    ? "bg-[var(--p-1a7f37)]"
                    : "border-[1.5px] border-dashed border-[var(--p-c9c7bf)]",
                )}
              />
            ))}
          </span>
          <span className="text-[13px] text-[var(--p-6b6a63)]">
            by {fmt(s.end, { day: "numeric", month: "short" })}
          </span>
        </div>
        <div className="flex flex-col gap-2 px-[22px] py-[18px] max-md:border-t max-md:border-[var(--p-e6e4dd)]">
          <span className={kicker}>Path</span>
          {s.path ? (
            <>
              <span className="flex items-center gap-2.5">
                <span className="grid size-[34px] place-items-center rounded-full border-[1.5px] border-[var(--p-1a7f37)] bg-[var(--p-f2fbf4)] font-extrabold text-[var(--p-1a7f37)]">
                  {s.path}
                </span>
                <span className="text-[17px] font-extrabold">{PATHS[s.path].name}</span>
              </span>
              <span className="text-[13px] text-[var(--p-6b6a63)]">{PATHS[s.path].line}</span>
            </>
          ) : (
            <>
              <span className="text-[17px] font-extrabold text-[var(--p-6b6a63)]">
                Not chosen yet
              </span>
              <span className="text-[13px] text-[var(--p-6b6a63)]">
                Choose it in the season editor
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2.5 pt-1.5" aria-label={`Season ${s.n} timeline`}>
        <div className="grid grid-cols-3 gap-1">
          {bands.map((b) => {
            const done = day > b.to;
            const now = day >= b.from && day <= b.to;
            return (
              <span key={b.label} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                <span
                  className={cn(
                    now
                      ? "font-extrabold text-[var(--p-1f2328)]"
                      : done
                        ? "font-semibold text-[var(--p-1f2328)]"
                        : "font-semibold text-[var(--p-4a4943)]",
                  )}
                >
                  {b.label}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: done ? GREEN : now ? ORANGE : "var(--p-6b6a63)",
                  }}
                >
                  Days {b.from}–{b.to}
                </span>
              </span>
            );
          })}
        </div>
        <div className="relative mt-[22px]">
          <div className="grid grid-cols-3 gap-1">
            {bands.map((b, i) => {
              const len = b.to - b.from + 1;
              const filled = Math.max(0, Math.min(len, day - b.from + (s.ended ? 0 : 1)));
              const done = day > b.to;
              return (
                <div
                  key={b.label}
                  className={cn(
                    "h-3 overflow-hidden bg-[var(--p-card)]",
                    i === 0 && "rounded-l-[7px]",
                    i === 2 && "rounded-r-[7px]",
                  )}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${done ? 100 : (filled / len) * 100}%`,
                      background: done ? GREEN : ORANGE,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div
            className={cn(
              "absolute -top-[26px] flex flex-col gap-[3px]",
              s.day ? "-translate-x-1/2 items-center" : "items-start",
            )}
            style={{ left: `${marker}%` }}
          >
            <span className="whitespace-nowrap text-xs font-bold">
              {s.ended ? "Done" : s.day ? "Today" : "You are here"}
            </span>
            <span className="h-8 w-0.5 rounded-sm bg-[var(--p-1f2328)]" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {bands.map((b) => (
            <span key={b.label} className="text-xs text-[var(--p-6b6a63)]">
              {fmt(b.start, { day: "numeric", month: "short" })} –{" "}
              {fmt(b.end, { day: "numeric", month: "short" })}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
