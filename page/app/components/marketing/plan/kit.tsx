import type { LevelState, LevelStatus, PlanLevel } from "@shared/marketing";
import { useQueryClient } from "@tanstack/react-query";
import { actionErrorMessage, callAction } from "@shims/use-action";
import { useCallback, useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { useLocation, useSearchParams } from "@shims/react-router";
import { toast } from "sonner";

import { useOwner } from "@/components/marketing/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const planPath = (entityId: string, step?: PlanLevel) =>
  `/entities/${entityId}/plan${step ? `/${step}` : ""}`;

export const SOURCE_URL = "https://x.com/hooeem/status/2120955142438834287";

export const WHY: Record<PlanLevel, string> = {
  proof:
    "Without proof, everything after is opinion. When content is easy to make, real work, results and mistakes are what people trust.",
  person:
    "One sentence about who it's for decides your topics, examples, products and who you stand next to.",
  association:
    "People learn what to expect from you through repetition: the topics, tools, people and look they keep seeing.",
  product:
    "Marketing says what you promise; the free thing proves it. If it doesn't deliver on its hook, don't promote it.",
  belt: "A public project with a result, a date and visible progress gives people a reason to come back.",
};

export const ABOUT: Record<PlanLevel, string> = {
  proof:
    "The work behind the content: results you can show (Path A), or a volume sprint that earns them (Path B).",
  person:
    "The one person you serve: who they are, their pain, and what they already pay for, scored on four tests.",
  association:
    "What people learn to expect from you: what you amplify, what you stand against, how you look and sound.",
  product:
    "The free things you ship, the hook that sells each one, and whether it delivers on that hook.",
  belt: "A public project with a promise, a target number and a date, so people have a reason to come back.",
};

export const DIAGRAMS: Record<PlanLevel, { src: string; alt: string }[]> = {
  proof: [
    {
      src: "0-intro-the-moat.png",
      alt: "Everything on the left takes AI 10 seconds: free to fake vs can't be prompted, the moat",
    },
    {
      src: "1-proof-attention.png",
      alt: "Attention = your hours ÷ their minutes",
    },
  ],
  person: [
    {
      src: "2-person-four-tests.png",
      alt: "Write for everyone and nobody pays: the four tests narrow everyone to your person",
    },
  ],
  association: [
    {
      src: "3-association-repeat.png",
      alt: "Repeat these until they mean you: Align & Amplify and Anti-Brand",
    },
  ],
  product: [
    {
      src: "4-product-three-tiers.png",
      alt: "Your hook is the weakest truth: marketing, reputation, the product",
    },
  ],
  belt: [
    {
      src: "5-belt-a-date.png",
      alt: "Give them a date to come back for: what + when + how far = the belt",
    },
    {
      src: "5-belt-example-hawks.png",
      alt: "Example: Hawks0x, Day 1 vs Day 35 of a public challenge",
    },
    {
      src: "6-ninety-days-mapped.png",
      alt: "Your first 90 days, mapped: Proof, Person & association, Product & belt",
    },
  ],
};

export function Diagram({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <a
      href={`/brand-plan/images/${src}`}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-md border bg-background"
    >
      <img
        src={`/brand-plan/images/${src}`}
        alt={alt}
        loading="lazy"
        className="w-full"
        onError={() => setFailed(true)}
      />
    </a>
  );
}

export const IN_PROGRESS = {
  bg: "bg-amber-600",
  text: "text-amber-600",
  border: "border-amber-600",
  ring: "ring-amber-600/50",
  soft: "bg-amber-600/5",
} as const;
export const PASSED = {
  bg: "bg-[var(--p-1a7f37)]",
  text: "text-[var(--p-1a7f37)]",
} as const;

export const STATE_LABEL: Record<LevelState, string> = {
  done: "Done",
  partial: "In progress",
  empty: "Not started",
};

export function StatusDot({ state, className }: { state: LevelState; className?: string }) {
  return (
    <span
      role="img"
      aria-label={STATE_LABEL[state]}
      title={STATE_LABEL[state]}
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full border",
        state === "done" &&
          "border-emerald-600 bg-emerald-600 dark:border-emerald-400 dark:bg-emerald-400",
        state === "partial" &&
          cn(
            IN_PROGRESS.border,
            "bg-[linear-gradient(90deg,var(--color-amber-600)_50%,transparent_50%)]",
          ),
        state === "empty" && "border-muted-foreground/60",
        className,
      )}
    />
  );
}

export type SaveState = "idle" | "saving" | "saved" | "error";

export type PlanSave = (values: Record<string, unknown>) => Promise<number | boolean>;

export async function savePlanValues(
  entityId: string,
  level: PlanLevel,
  values: Record<string, unknown>,
  by: string,
): Promise<number> {
  for (let attempt = 0; ; attempt++) {
    try {
      const plan = await callAction<{ entity: { version: number } }>(
        "get-plan" as never,
        { entityId } as never,
        { method: "GET" },
      );
      const r = await callAction<{ guidanceVersion: number }>(
        "save-plan-level" as never,
        {
          entityId,
          expectedVersion: plan.entity.version,
          level,
          values,
          note: `Filled ${Object.keys(values).join(", ")}`,
          by,
          requestId: crypto.randomUUID(),
        } as never,
      );
      return r.guidanceVersion;
    } catch (err) {
      const message = actionErrorMessage(err) ?? "Could not save. Try again.";
      if (attempt === 0 && /changed/i.test(message)) continue;
      throw new Error(message);
    }
  }
}

export function usePlanSave(
  entityId: string,
  level: PlanLevel,
): { save: PlanSave; state: SaveState } {
  const qc = useQueryClient();
  const owner = useOwner();
  const [state, setState] = useState<SaveState>("idle");
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const save = useCallback<PlanSave>(
    (values) => {
      const run = async () => {
        setState("saving");
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const plan = await callAction<{ entity: { version: number } }>(
              "get-plan" as never,
              { entityId } as never,
              { method: "GET" },
            );
            const note = `Autosaved ${Object.keys(values).join(", ")}`;
            const r = await callAction<{ guidanceVersion: number }>(
              "save-plan-level" as never,
              {
                entityId,
                expectedVersion: plan.entity.version,
                level,
                values,
                note,
                by: owner?.id ?? "",
                requestId: crypto.randomUUID(),
              } as never,
            );
            await qc.invalidateQueries({ queryKey: ["action"] });
            setState("saved");

            return r?.guidanceVersion ?? true;
          } catch (err) {
            const message = actionErrorMessage(err) ?? "Could not save. Try again.";
            if (attempt === 0 && /changed/i.test(message)) continue;
            setState("error");
            toast.error(message);
            return false;
          }
        }
        return false;
      };

      const p = queue.current.then(run, run);
      queue.current = p;
      return p;
    },
    [entityId, level, qc, owner],
  );
  return { save, state };
}

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle")
    return <span className="text-xs text-muted-foreground">Changes save as you type</span>;
  return (
    <span
      role="status"
      className={cn("text-xs", state === "error" ? "text-destructive" : "text-muted-foreground")}
    >
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Not saved"}
    </span>
  );
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function Answer<T>({
  question,
  hint,
  value,
  save,
  isEmpty,
  settled,
  input,
  closeOnBlur = true,
  disabled = false,
  anchor,
  showQuestion = true,
  changeLabel = "Change",
  className,
  settledClassName,
}: {
  question: string;

  showQuestion?: boolean;
  changeLabel?: string;
  className?: string;
  settledClassName?: string;
  hint?: string;
  value: T;
  save: (v: T) => Promise<unknown>;
  isEmpty: (v: T) => boolean;
  settled: (v: T) => ReactNode;
  input: (draft: T, set: (v: T) => void) => ReactNode;

  closeOnBlur?: boolean;
  disabled?: boolean;

  anchor?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const sent = useRef(value);
  const latest = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editingRef = useRef(false);
  editingRef.current = editing;
  const open = !disabled && (editing || isEmpty(draft));

  const key = JSON.stringify(value);
  useEffect(() => {
    if (editingRef.current) return;
    setDraft(value);
    latest.current = value;
    sent.current = value;
  }, [key]);
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const v = latest.current;
    if (same(v, sent.current)) return;
    sent.current = v;
    void save(v);
  }, [save]);

  useEffect(() => () => flush(), [flush]);
  const set = (v: T) => {
    setDraft(v);
    latest.current = v;
    setEditing(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  };
  const done = () => {
    flush();
    setEditing(false);
  };
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    flush();
    if (closeOnBlur && !isEmpty(latest.current)) setEditing(false);
  };
  return (
    <div
      id={anchor ? `check-${anchor}` : undefined}
      className={cn("grid scroll-mt-24 gap-1.5 rounded-md", className)}
    >
      {showQuestion ? (
        <p className="text-sm font-medium">{question}</p>
      ) : (
        open && <p className="text-sm font-medium">{question}</p>
      )}
      {open ? (
        <div className="grid gap-1.5" onBlur={onBlur}>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {input(draft, set)}
          {!isEmpty(draft) && (
            <div>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={done}>
                Done
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "min-w-0 flex-1 whitespace-pre-wrap text-sm text-foreground/90",
              settledClassName,
            )}
          >
            {settled(draft)}
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto shrink-0 p-0 text-muted-foreground"
              onClick={() => setEditing(true)}
            >
              {changeLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export const blankText = (v: string) => !v.trim();
export const blankList = (v: unknown[]) => v.length === 0;

export function stepProgress(l: LevelStatus) {
  const done = l.items.filter((x) => x.ok).length;
  const total = l.items.length;
  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    next: l.items.find((x) => !x.ok),
  };
}

export function StepProgress({ status }: { status: LevelStatus }) {
  const { done, total, pct, next } = stepProgress(status);
  const complete = pct === 100;
  return (
    <span className="grid gap-1.5">
      <span
        role="progressbar"
        aria-label={`${status.title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="block h-2 w-full overflow-hidden rounded-full bg-[var(--p-eaeef2)]"
      >
        {pct > 0 && (
          <span
            className={cn("block h-full rounded-full", complete ? PASSED.bg : IN_PROGRESS.bg)}
            style={{ width: `${pct}%` }}
          />
        )}
      </span>
      <span
        className={cn(
          "text-sm font-medium tabular-nums",
          complete ? PASSED.text : IN_PROGRESS.text,
        )}
      >
        {complete ? "100% · done" : `${pct}%`}
      </span>
      <span className="text-xs text-muted-foreground">
        {done} of {total} in place{next ? ` · Next: ${next.label}` : ""}
      </span>
    </span>
  );
}

export function useFromHref(to: string) {
  const { pathname, search } = useLocation();
  return `${to}${to.includes("?") ? "&" : "?"}from=${encodeURIComponent(pathname + search)}`;
}

export function useBackTo(fallback: string) {
  const [params] = useSearchParams();
  const from = params.get("from") ?? "";
  return from.startsWith("/") && !from.startsWith("//") && !from.includes("\\") ? from : fallback;
}
