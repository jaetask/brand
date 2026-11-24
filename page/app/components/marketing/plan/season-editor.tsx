import { SEASON_BANDS, ukToday, type EntityDetail } from "@shared/marketing";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { BackLink } from "@/components/marketing/kit/page";
import { planPath, useBackTo } from "@/components/marketing/plan/kit";
import { useSeasons, type SeasonView } from "@/components/marketing/plan/season";
import { Status, useWrite } from "@/components/marketing/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PATHS = {
  A: { name: "Outcome flex", line: "Show results you already have" },
  B: {
    name: "Volume sprint",
    line: "No results yet: post a lot for 30 days to earn them",
  },
} as const;

const fmtShort = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
const addDays = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) + 1;

type Item = {
  n: number;
  kind: "season" | "idea";
  title: string;
  sub: string;
  chip: "Now" | "Planned" | "Done" | "Idea";
};

function items(v: SeasonView): Item[] {
  const out: Item[] = v.seasons.map((s) => ({
    n: s.n,
    kind: "season" as const,
    title: `Season ${s.n}`,
    sub: `${fmtShort(s.start)} – ${fmtShort(s.end)}`,
    chip:
      s.n === v.current.n ? ("Now" as const) : s.ended ? ("Done" as const) : ("Planned" as const),
  }));
  const last = v.seasons[v.seasons.length - 1];
  for (const idea of v.ideas.filter((x) => !v.seasons.some((s) => s.n === x.n))) {
    const sub =
      idea.n === last.n + 1
        ? `${fmtShort(addDays(last.end, 1))} – ${fmtShort(addDays(last.end, 90))}`
        : idea.idea;
    out.push({
      n: idea.n,
      kind: "idea",
      title: `Season ${idea.n}`,
      sub,
      chip: "Idea",
    });
  }
  return out.sort((a, b) => a.n - b.n);
}

export function SeasonEditor({ detail }: { detail: EntityDetail }) {
  const e = detail.entity;
  const q = useSeasons(e.id);
  const [picked, setPicked] = useState<number | null>(null);
  const addIdea = useWrite("save-season-idea", { success: "New season added" });
  const backTo = useBackTo(planPath(e.id));
  return (
    <div className="flex max-w-[75rem] flex-col gap-7 text-[var(--p-1f2328)]">
      <div className="-mt-3 flex justify-end">
        <BackLink to={backTo} />
      </div>
      <Status loading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const v = q.data;
            const list = items(v);
            const n = picked ?? v.current.n;
            const item = list.find((x) => x.n === n) ?? list[0];
            const nextN = Math.max(...list.map((x) => x.n)) + 1;
            return (
              <div className="grid items-start gap-7 lg:grid-cols-[280px_1fr]">
                <nav
                  aria-label="Seasons"
                  className="flex flex-col gap-1.5 rounded-2xl bg-[var(--p-f0efe9)] p-2.5"
                >
                  {list.map((x) => (
                    <Button
                      key={x.n}
                      type="button"
                      variant="ghost"
                      aria-current={x.n === item.n ? "true" : undefined}
                      onClick={() => setPicked(x.n)}
                      className={cn(
                        "h-auto flex-col items-stretch gap-1 rounded-xl px-4 py-3.5 text-left font-normal hover:bg-[var(--p-card)]/70",
                        x.n === item.n &&
                          "bg-[var(--p-card)] shadow-[0_0_0_1.5px_#1f2328] hover:bg-[var(--p-card)]",
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-[15px] font-extrabold">{x.title}</span>
                        <Chip tone={x.chip === "Now" ? "green" : "grey"}>{x.chip}</Chip>
                      </span>
                      <span className="truncate text-[13px] text-[var(--p-6b6a63)]">{x.sub}</span>
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 rounded-[10px] bg-[var(--p-card)]"
                    disabled={addIdea.busy || e.archived}
                    onClick={() =>
                      void addIdea
                        .run({
                          entityId: e.id,
                          n: nextN,
                          idea: `Season ${nextN} idea`,
                        })
                        .then((r) => r && setPicked(nextN))
                    }
                  >
                    + New season
                  </Button>
                </nav>
                <div className="rounded-2xl border border-[var(--p-e6e4dd)] bg-[var(--p-card)] px-8 py-7">
                  {item.kind === "season" ? (
                    <SeasonForm
                      key={`s-${item.n}`}
                      entityId={e.id}
                      view={v}
                      n={item.n}
                      disabled={e.archived}
                      fallback={detail.guidance.plan.belt.project}
                    />
                  ) : (
                    <IdeaForm
                      key={`i-${item.n}`}
                      entityId={e.id}
                      view={v}
                      n={item.n}
                      disabled={e.archived}
                    />
                  )}
                </div>
              </div>
            );
          })()}
      </Status>
    </div>
  );
}

function Chip({ tone, children }: { tone: "green" | "grey"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "green"
          ? "bg-[var(--p-dafbe1)] text-[var(--p-1a7f37)]"
          : "bg-[var(--p-f0efe9)] text-[var(--p-4a4943)]",
      )}
    >
      {children}
    </span>
  );
}

function Group({ title, line, children }: { title: string; line?: string; children: ReactNode }) {
  return (
    <div className="grid gap-6 border-t border-[var(--p-e6e4dd)] py-[22px] md:grid-cols-[220px_1fr]">
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-extrabold">{title}</span>
        {line && <span className="text-xs leading-snug text-[var(--p-6b6a63)]">{line}</span>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <span
      className="text-[13px] font-bold text-[var(--p-1f2328)]"
      id={htmlFor ? `${htmlFor}-label` : undefined}
    >
      {children}
    </span>
  );
}

function useAutosave(run: (args: Record<string, unknown>) => Promise<unknown>) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<Record<string, unknown>>({});
  useEffect(() => () => clearTimeout(timer.current), []);
  const flush = async () => {
    const args = pending.current;
    pending.current = {};
    if (!Object.keys(args).length) return;
    setState("saving");
    setState((await run(args)) ? "saved" : "error");
  };
  const queue = (args: Record<string, unknown>, now = false) => {
    pending.current = { ...pending.current, ...args };
    clearTimeout(timer.current);
    if (now) void flush();
    else timer.current = setTimeout(() => void flush(), 700);
  };
  return { state, queue, flush };
}

function SaveState({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  return (
    <span
      role="status"
      className={cn("text-xs", state === "error" ? "text-destructive" : "text-[var(--p-6b6a63)]")}
    >
      {state === "saving"
        ? "Saving…"
        : state === "error"
          ? "Not saved, try again"
          : "✓ Changes save as you type"}
    </span>
  );
}

function Stepper({
  value,
  onChange,
  min = 1,
  label,
  unit,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  label: string;
  unit: string;
  disabled: boolean;
}) {
  return (
    <span className="flex items-center">
      <span className="inline-flex items-center overflow-hidden rounded-[10px] border border-[var(--p-d6d4cc)] bg-[var(--p-card)]">
        <Button
          type="button"
          variant="ghost"
          aria-label={`Fewer: ${label}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          className="h-10 w-9 rounded-none bg-[var(--p-fafaf8)] p-0 text-[var(--p-6b6a63)]"
        >
          <IconMinus size={16} />
        </Button>
        <span
          className="min-w-11 text-center text-[17px] font-extrabold tabular-nums"
          aria-label={label}
        >
          {value}
        </span>
        <Button
          type="button"
          variant="ghost"
          aria-label={`More: ${label}`}
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          className="h-10 w-9 rounded-none bg-[var(--p-fafaf8)] p-0 text-[var(--p-6b6a63)]"
        >
          <IconPlus size={16} />
        </Button>
      </span>
      <span className="ml-2.5 inline-block w-[86px] text-sm text-[var(--p-6b6a63)]">{unit}</span>
    </span>
  );
}

function PathCards({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (p: "A" | "B") => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row" role="radiogroup" aria-label="Path">
      {(["A", "B"] as const).map((p) => {
        const on = value === p;
        return (
          <Button
            key={p}
            type="button"
            variant="ghost"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(p)}
            className={cn(
              "h-auto flex-1 items-start justify-start gap-3 whitespace-normal rounded-xl px-4 py-3.5 text-left font-normal disabled:opacity-60",
              on
                ? "border-2 border-[var(--p-1a7f37)] bg-[var(--p-f2fbf4)] hover:bg-[var(--p-f2fbf4)]"
                : "border border-[var(--p-d6d4cc)] bg-[var(--p-card)]",
            )}
          >
            <span
              className={cn(
                "grid size-[30px] shrink-0 place-items-center rounded-full font-extrabold",
                on
                  ? "bg-[var(--p-1a7f37)] text-white"
                  : "border-[1.5px] border-[var(--p-c9c7bf)] text-[var(--p-6b6a63)]",
              )}
            >
              {p}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-extrabold">{PATHS[p].name}</span>
              <span className="text-[13px] text-[var(--p-6b6a63)]">{PATHS[p].line}</span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}

function SeasonForm({
  entityId,
  view,
  n,
  disabled,
  fallback,
}: {
  entityId: string;
  view: SeasonView;
  n: number;
  disabled: boolean;
  fallback: string;
}) {
  const s = view.seasons.find((x) => x.n === n)!;
  const isNow = n === view.current.n;
  const save = useWrite("save-season");
  const { state, queue } = useAutosave((args) => save.run({ entityId, n, ...args }));
  const [goal, setGoal] = useState(s.goal);
  const [start, setStart] = useState(s.start);
  const [end, setEnd] = useState(s.end);
  const [target, setTarget] = useState(s.target ?? 8);
  const [needed, setNeeded] = useState(s.proofNeeded);
  const [path, setPath] = useState<string>(s.path);
  const [notes, setNotes] = useState(s.notes ?? "");
  const length = start && end && end >= start ? daysBetween(start, end) : null;
  const status = s.ended
    ? "Complete"
    : s.day
      ? `Day ${s.day} of ${s.length}`
      : `Starts in ${s.startsIn} ${s.startsIn === 1 ? "day" : "days"}`;
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-4 pb-5">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2">
            <Chip tone={isNow ? "green" : "grey"}>
              {isNow ? "Now" : s.ended ? "Done" : "Planned"}
            </Chip>
            <span className="text-xs text-[var(--p-6b6a63)]">{status}</span>
          </span>
          <span className="text-[26px] font-extrabold">Season {n}</span>
        </div>
        <SaveState state={state} />
      </div>
      <Group title="Goal" line="What this season is for, in one line.">
        <div className="flex flex-col gap-2">
          <Label>Headline</Label>
          <Input
            aria-label="Headline"
            disabled={disabled}
            value={goal}
            placeholder={fallback}
            onChange={(e) => (setGoal(e.target.value), queue({ goal: e.target.value }))}
            className="h-auto rounded-[10px] border-[var(--p-d6d4cc)] px-3 py-2.5 text-[17px] font-bold placeholder:text-[var(--p-8c8b84)]"
          />
          {!goal.trim() && (
            <span className="text-xs text-[var(--p-6b6a63)]">
              The big line on the Plan home. Until you write one, it shows your Belt project.
            </span>
          )}
        </div>
      </Group>
      <Group title="Dates" line="The bands on the Plan home follow these dates.">
        <div className="grid items-end gap-3.5 sm:grid-cols-[1fr_1fr_auto]">
          <div className="flex flex-col gap-2">
            <Label>Starts</Label>
            <Input
              type="date"
              aria-label="Starts"
              disabled={disabled}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              onBlur={() => start !== s.start && queue({ start, end }, true)}
              className="h-10 rounded-[10px] border-[var(--p-d6d4cc)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Ends</Label>
            <Input
              type="date"
              aria-label="Ends"
              disabled={disabled}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              onBlur={() => end !== s.end && queue({ start, end }, true)}
              className="h-10 rounded-[10px] border-[var(--p-d6d4cc)]"
            />
          </div>
          <span className="flex h-10 items-center rounded-full bg-[var(--p-f0efe9)] px-3.5 text-[13px] font-semibold text-[var(--p-4a4943)]">
            {length ? `${length} days` : "Check the dates"}
          </span>
        </div>
        <span className="text-xs text-[var(--p-6b6a63)]">
          hoeem's seasons are 90 days.{" "}
          {SEASON_BANDS.map((b) => `Day ${b.from}–${b.to} ${b.label}`).join(", ")}.
        </span>
      </Group>
      <Group title="Target" line="The number you're aiming for.">
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Target by the end</Label>
            <Stepper
              value={target}
              label="Target by the end"
              unit="apps public"
              disabled={disabled}
              onChange={(v) => (setTarget(v), queue({ target: v }))}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Proof links to finish step 1</Label>
            <Stepper
              value={needed}
              label="Proof links to finish step 1"
              unit="proof links"
              disabled={disabled}
              onChange={(v) => (setNeeded(v), queue({ proofNeeded: v }))}
            />
          </div>
        </div>
        <span className="text-xs text-[var(--p-6b6a63)]">
          The first number sets the Proof slots and the Belt squares.
        </span>
      </Group>
      <Group title="Path" line="Chosen once per season. Only the chosen path shows on the Plan.">
        <PathCards
          value={path}
          disabled={disabled}
          onChange={(p) => (setPath(p), queue({ path: p }, true))}
        />
      </Group>
      <Group title="Notes" line="For you only. Not shown on the Plan.">
        <Textarea
          aria-label="Notes"
          disabled={disabled}
          value={notes}
          rows={3}
          onChange={(e) => (setNotes(e.target.value), queue({ notes: e.target.value }))}
          className="min-h-[84px] rounded-[10px] border-[var(--p-d6d4cc)] text-[15px] leading-normal"
        />
      </Group>
    </div>
  );
}

function IdeaForm({
  entityId,
  view,
  n,
  disabled,
}: {
  entityId: string;
  view: SeasonView;
  n: number;
  disabled: boolean;
}) {
  const idea = view.ideas.find((x) => x.n === n)?.idea ?? "";
  const last = view.seasons[view.seasons.length - 1];
  const isNext = n === last.n + 1;
  const saveIdea = useWrite("save-season-idea");
  const create = useWrite("create-season", { success: `Season ${n} started` });
  const { state, queue } = useAutosave((args) =>
    saveIdea.run({ entityId, n, idea: String(args.idea ?? "") }),
  );
  const [text, setText] = useState(idea);
  const start = addDays(last.end, 1);
  const end = addDays(last.end, 90);
  const canStart = isNext && view.canCreateNext;
  if (!isNext)
    return (
      <div className="flex flex-col gap-3 py-2">
        <span className="flex items-center justify-between gap-3">
          <Chip tone="grey">Idea</Chip>
          <SaveState state={state} />
        </span>
        <span className="text-[26px] font-extrabold">Season {n}</span>
        <Textarea
          aria-label={`Season ${n} idea`}
          disabled={disabled}
          value={text}
          rows={2}
          onChange={(e) => (setText(e.target.value), queue({ idea: e.target.value }))}
          className="rounded-[10px] border-[var(--p-d6d4cc)] text-[15px]"
        />
        <span className="text-xs text-[var(--p-6b6a63)]">
          Ideas stay rough until the season before them ends.
        </span>
      </div>
    );
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-4 pb-5">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2">
            <Chip tone="grey">Idea</Chip>
            <span className="text-xs text-[var(--p-6b6a63)]">
              Opens after the Season {last.n} recap on {fmtShort(last.end)}
            </span>
          </span>
          <span className="text-[26px] font-extrabold">Season {n}</span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            disabled={!canStart || disabled || create.busy}
            onClick={() =>
              void create.run({
                entityId,
                goal: text,
                requestId: `season-${entityId}-${n}`,
              })
            }
          >
            Start Season {n}
          </Button>
          <SaveState state={state} />
        </div>
      </div>
      <Group title="Goal" line="Rough is fine. You'll firm it up on day 90.">
        <div className="flex flex-col gap-2">
          <Label>Headline</Label>
          <Input
            aria-label="Headline"
            disabled={disabled}
            value={text}
            onChange={(e) => (setText(e.target.value), queue({ idea: e.target.value }))}
            className="h-auto rounded-[10px] border-[var(--p-d6d4cc)] px-3 py-2.5 text-[17px] font-bold"
          />
        </div>
      </Group>
      <Group title="Dates" line={`Suggested: the day after Season ${last.n} ends.`}>
        <div className="grid items-end gap-3.5 sm:grid-cols-[1fr_1fr_auto]">
          <div className="flex flex-col gap-2">
            <Label>Starts</Label>
            <Input
              type="date"
              aria-label="Starts"
              disabled
              value={start}
              readOnly
              className="h-10 rounded-[10px] border-[var(--p-d6d4cc)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Ends</Label>
            <Input
              type="date"
              aria-label="Ends"
              disabled
              value={end}
              readOnly
              className="h-10 rounded-[10px] border-[var(--p-d6d4cc)]"
            />
          </div>
          <span className="flex h-10 items-center rounded-full bg-[var(--p-f0efe9)] px-3.5 text-[13px] font-semibold text-[var(--p-4a4943)]">
            90 days
          </span>
        </div>
      </Group>
      <Group title="Path" line="You choose it when the season starts.">
        <PathCards value="" disabled onChange={() => undefined} />
      </Group>
      <span className="pt-2 text-xs text-[var(--p-6b6a63)]">
        Today is {fmtShort(ukToday())}. The target, path and dates are set when the season starts.
      </span>
    </div>
  );
}
