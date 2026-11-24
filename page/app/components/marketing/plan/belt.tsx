import { ukToday, type BrandPlan, type EntityDetail } from "@shared/marketing";
import { IconArrowDown, IconArrowUp, IconCompass, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "@shims/react-router";
import { toast } from "sonner";

import {
  ChipPicker,
  EditFrame,
  EditLink,
  EmptyCard,
  ListCard,
  ListRow,
  PageLink,
  Panel,
  Row,
  card,
  chip,
  greyButtonOnWhite,
  muted,
} from "@/components/marketing/kit/page";
import { SavedFlash } from "@/components/marketing/plan/edit";
import { GAP_HINTS } from "@/components/marketing/plan/hints";
import { usePlanSave, type PlanSave } from "@/components/marketing/plan/kit";
import { useSeasons } from "@/components/marketing/plan/season";
import { stepEditPath, type StepEditProps } from "@/components/marketing/plan/step-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = { detail: EntityDetail; save: PlanSave; disabled: boolean };
type App = NonNullable<BrandPlan["belt"]["apps"]>[number];
type Part = "belt" | "promise" | "deadline" | "checkin" | "slips";
type TextPart = "promise" | "deadline" | "slips";

const ORANGE = "var(--p-d97706)";
const GREEN = "var(--p-1a7f37)";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NEXT: Record<App["status"], App["status"]> = {
  public: "private",
  private: "planned",
  planned: "public",
};
const STATUS_LABEL: Record<App["status"], string> = {
  public: "public",
  private: "running privately",
  planned: "not built yet",
};
const STATUS_OPTIONS: { id: App["status"]; name: string }[] = [
  { id: "public", name: "Public" },
  { id: "private", name: "Private" },
  { id: "planned", name: "Not built" },
];

const day = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
const iso = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", opts);
const dayName = (v: string) => DAYS.find((d) => d.toLowerCase() === v.trim().toLowerCase()) ?? "";

export const beltCheckPart: Record<string, Part> = {
  project: "belt",
  target: "belt",
  "launch-date": "belt",
  promise: "promise",
  "deadline-shown": "deadline",
  "check-in-day": "checkin",
  "delay-plan": "slips",
};

const TITLES: Record<Part, string> = {
  belt: "Your belt",
  promise: "The promise",
  deadline: "Where the deadline shows",
  checkin: "Weekly check-in",
  slips: "If it slips",
};

export function BeltWork({ detail, save, disabled }: Props) {
  const id = detail.entity.id;
  const edit = (part: Part) => stepEditPath(id, "belt", part);
  const b = detail.guidance.plan.belt;
  const seasons = useSeasons(id);
  const s = seasons.data?.current;
  const target = s?.target ?? detail.plan.seasonTarget ?? Math.max(8, b.apps?.length ?? 0);
  const apps = b.apps ?? [];
  const pub = apps.filter((a) => a.status === "public").length;
  const [flash, setFlash] = useState("");
  const saveApps = async (next: App[]) => {
    const r = await save({ apps: next });
    if (r) {
      setFlash("✓ Saved");
      setTimeout(() => setFlash(""), 2000);
    }
  };

  const checkInDay = dayName(b.checkInDay);
  const checkIns = (() => {
    if (!s || !checkInDay) return [];
    const want = DAYS.indexOf(checkInDay);
    const out: string[] = [];
    for (let d = day(s.start); d <= day(s.end); d++)
      if ((new Date(d * 86_400_000).getUTCDay() + 6) % 7 === want) out.push(iso(d));
    return out;
  })();
  const today = ukToday();
  const upcoming = checkIns.filter((d) => d >= today).slice(0, 4);
  const total = s ? s.length : 90;
  const elapsed = s ? (s.ended ? total : (s.day ?? 0)) : 0;
  const toGo = s ? Math.max(0, day(s.end) - day(today)) : 0;

  const deadlineRows = b.deadlineShown
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const squares = Math.max(target, apps.length);
  return (
    <div className="flex flex-col gap-7">
      <Panel
        id="check-project"
        title={TITLES.belt}
        action={<EditLink disabled={disabled} to={edit("belt")} />}
      >
        <span id="check-target" className="sr-only" />
        <span id="check-launch-date" className="sr-only" />
        <div className={cn(card, "flex flex-col gap-4")}>
          <div className="flex items-end justify-between gap-4">
            <span
              className={cn(
                "min-w-0 flex-1 text-[22px] font-extrabold leading-tight",
                !b.project && muted,
              )}
            >
              {b.project || "No project named yet"}
            </span>
            <div className="shrink-0 text-right">
              <span
                className="text-[40px] font-extrabold leading-none"
                style={{ color: pub ? GREEN : "var(--p-1f2328)" }}
              >
                {pub}
                <span className={cn("text-xl", muted)}> / {target}</span>
              </span>
              <br />
              <span className={cn("text-xs", muted)}>apps public</span>
            </div>
          </div>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.min(Math.max(squares, 1), 12)}, minmax(0, 1fr))`,
            }}
            aria-label="The belt's apps"
          >
            {Array.from({ length: squares }, (_, i) => {
              const a = apps[i];
              if (!a)
                return (
                  <span
                    key={`empty-${i}`}
                    aria-hidden
                    className="aspect-square w-full rounded-[10px] border-2 border-dashed border-[var(--p-e6e4dd)]"
                  />
                );
              return (
                <Button
                  key={`${i}-${a.name}`}
                  type="button"
                  variant="ghost"
                  disabled={disabled}
                  title={`${a.name}: ${STATUS_LABEL[a.status]}. Tap to change.`}
                  aria-label={`${a.name}, ${STATUS_LABEL[a.status]}. Tap to change.`}
                  onClick={() =>
                    void saveApps(
                      apps.map((x, j) => (j === i ? { ...x, status: NEXT[x.status] } : x)),
                    )
                  }
                  className={cn(
                    "aspect-square h-auto w-full flex-col gap-0.5 rounded-[10px] border-2 p-1 text-[11px] font-semibold whitespace-normal disabled:opacity-100",
                    a.status === "public" &&
                      "border-[var(--p-1a7f37)] bg-[var(--p-1a7f37)] text-white hover:bg-[var(--p-1a7f37)]/90 hover:text-white",
                    a.status === "private" &&
                      "border-[var(--p-d6d4cc)] bg-[var(--p-f0efe9)] text-[var(--p-1f2328)] hover:bg-[var(--p-e9e7e0)]",
                    a.status === "planned" &&
                      "border-dashed border-[var(--p-cfcdc5)] bg-[var(--p-card)] text-[var(--p-8c8b84)] hover:bg-[var(--p-fbfbf9)]",
                  )}
                >
                  <span className="text-base font-extrabold leading-none">
                    {a.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="w-full truncate text-center">{a.name}</span>
                </Button>
              );
            })}
          </div>
          <div className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px]", muted)}>
            <span className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-[var(--p-1a7f37)]" /> Public
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-sm border border-[var(--p-d6d4cc)] bg-[var(--p-f0efe9)]" />{" "}
              Private
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-sm border border-dashed border-[var(--p-cfcdc5)]" />{" "}
              Not built
            </span>
            <SavedFlash text={flash} />
            {apps.length > 0 && <span className="ml-auto">Tap a square to change it</span>}
          </div>
          {s && (
            <div className="flex flex-col gap-1.5 border-t border-[var(--p-f0efe9)] pt-4">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--p-ecebe5)]">
                <div
                  className="h-full"
                  style={{
                    width: `${(elapsed / total) * 100}%`,
                    background: s.ended ? GREEN : ORANGE,
                  }}
                />
              </div>
              <div className={cn("flex justify-between gap-2 text-xs", muted)}>
                <span>{fmt(s.start, { day: "numeric", month: "short" })} · start</span>
                <span className="font-bold text-[var(--p-1f2328)]">
                  {s.ended
                    ? "Season complete"
                    : s.day
                      ? `${toGo} ${toGo === 1 ? "day" : "days"} to go`
                      : `Starts in ${s.startsIn} ${s.startsIn === 1 ? "day" : "days"} · ${toGo} days to go`}
                </span>
                <span>
                  {fmt(s.end, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-end pt-1">
                <PageLink onWhite to={`/entities/${id}/seasons`}>
                  Season {s.n}
                </PageLink>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Panel
        id="check-promise"
        title={TITLES.promise}
        action={<EditLink disabled={disabled} to={edit("promise")} />}
      >
        {b.promise.trim() ? (
          <div className={cn(card, "whitespace-pre-wrap text-lg font-bold leading-snug")}>
            {b.promise}
          </div>
        ) : (
          <EmptyCard
            text="No promise written yet."
            action={
              <PageLink disabled={disabled} to={edit("promise")}>
                Write the promise
              </PageLink>
            }
          />
        )}
      </Panel>

      <Panel
        id="check-deadline-shown"
        title={TITLES.deadline}
        action={<EditLink disabled={disabled} to={edit("deadline")} />}
      >
        {deadlineRows.length ? (
          <ListCard>
            {deadlineRows.map((r, i) => (
              <ListRow key={`${i}-${r}`}>
                <span className="text-[15px]">{r}</span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <EmptyCard
            text="Not decided where the deadline shows yet."
            action={
              <PageLink disabled={disabled} to={edit("deadline")}>
                Add where
              </PageLink>
            }
          />
        )}
      </Panel>

      <Panel
        id="check-check-in-day"
        title={TITLES.checkin}
        action={<EditLink disabled={disabled} to={edit("checkin")} />}
      >
        {checkInDay ? (
          <div className={cn(card, "flex flex-col gap-3")}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-lg font-extrabold">Every {checkInDay}</span>
              {s && (
                <span className={cn("text-[13px]", muted)}>
                  {checkIns.length} {checkIns.length === 1 ? "check-in" : "check-ins"} this season
                </span>
              )}
            </div>
            {upcoming.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Next check-ins">
                {upcoming.map((d) => (
                  <span key={d} className={chip}>
                    {fmt(d, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyCard
            text="No check-in day chosen yet."
            action={
              <PageLink disabled={disabled} to={edit("checkin")}>
                Choose a day
              </PageLink>
            }
          />
        )}
      </Panel>

      <Panel
        id="check-delay-plan"
        title={TITLES.slips}
        action={<EditLink disabled={disabled} to={edit("slips")} />}
      >
        {b.delayPlan.trim() ? (
          <div className={cn(card, "flex items-start gap-4")}>
            <IconCompass size={24} className="shrink-0 text-[var(--p-4a4943)]" />
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-[15px] leading-relaxed">
              {b.delayPlan}
            </p>
          </div>
        ) : (
          <EmptyCard
            text="No plan yet for a delay or a missed target."
            action={
              <PageLink disabled={disabled} to={edit("slips")}>
                Write the plan
              </PageLink>
            }
          />
        )}
      </Panel>
    </div>
  );
}

const TEXT_FIELD: Record<TextPart, "promise" | "deadlineShown" | "delayPlan"> = {
  promise: "promise",
  deadline: "deadlineShown",
  slips: "delayPlan",
};

export function BeltEdit({ detail, part, backTo }: StepEditProps) {
  if (part === "belt") return <BeltCardEdit detail={detail} backTo={backTo} />;
  if (part === "checkin") return <CheckInEdit detail={detail} backTo={backTo} />;
  if (part in TEXT_FIELD)
    return <TextEdit key={part} detail={detail} part={part as TextPart} backTo={backTo} />;
  return (
    <EditFrame
      title="Not found"
      description="There is no edit page with that name on this step."
      backTo={backTo}
    >
      {null}
    </EditFrame>
  );
}

function useBeltSubmit(detail: EntityDetail, backTo: string) {
  const navigate = useNavigate();
  const { save } = usePlanSave(detail.entity.id, "belt");
  const [busy, setBusy] = useState(false);
  const submit = async (values: Record<string, unknown>, done: string) => {
    setBusy(true);
    try {
      if (!(await save(values))) return;
      toast.success(done);
      navigate(backTo);
    } finally {
      setBusy(false);
    }
  };
  return { submit, busy };
}

const TEXT_PAGES: Record<TextPart, { line: string; placeholder: string; done: string }> = {
  promise: {
    line: "Exactly what you promise people will see, and by when.",
    placeholder: "What exactly do you promise?",
    done: "Promise saved",
  },
  deadline: {
    line: `${GAP_HINTS["deadline-shown"]} One place per line.`,
    placeholder: "A pinned post\nThe bio\nThe article cover",
    done: "Saved",
  },
  slips: {
    line: GAP_HINTS["delay-plan"],
    placeholder: "If it slips, I'll…",
    done: "Saved",
  },
};

function TextEdit({
  detail,
  part,
  backTo,
}: {
  detail: EntityDetail;
  part: TextPart;
  backTo: string;
}) {
  const field = TEXT_FIELD[part];
  const { submit, busy } = useBeltSubmit(detail, backTo);
  const [v, setV] = useState(detail.guidance.plan.belt[field]);
  const page = TEXT_PAGES[part];
  return (
    <EditFrame
      title={TITLES[part]}
      backTo={backTo}
      busy={busy}
      onSave={() => void submit({ [field]: v.trim() }, page.done)}
    >
      <Row title={TITLES[part]} line={page.line} htmlFor={`belt-${part}`}>
        <Textarea
          id={`belt-${part}`}
          rows={5}
          value={v}
          placeholder={page.placeholder}
          onChange={(e) => setV(e.target.value)}
        />
      </Row>
    </EditFrame>
  );
}

function CheckInEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const { submit, busy } = useBeltSubmit(detail, backTo);
  const [v, setV] = useState(dayName(detail.guidance.plan.belt.checkInDay));
  return (
    <EditFrame
      title={TITLES.checkin}
      backTo={backTo}
      busy={busy}
      onSave={() => void submit({ checkInDay: v }, "Check-in day saved")}
    >
      <Row title="Day" line={GAP_HINTS["check-in-day"]}>
        <ChipPicker
          label="Weekly check-in day"
          value={v}
          options={DAYS.map((d) => ({ id: d, name: d }))}
          onChange={setV}
        />
      </Row>
    </EditFrame>
  );
}

type AppDraft = {
  key: string;
  name: string;
  status: App["status"];
  url: string;
};

function BeltCardEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const b = detail.guidance.plan.belt;
  const { submit, busy } = useBeltSubmit(detail, backTo);
  const [project, setProject] = useState(b.project);
  const [target, setTarget] = useState(b.target);
  const [launchDate, setLaunchDate] = useState(b.launchDate);
  const [apps, setApps] = useState<AppDraft[]>(() =>
    (b.apps ?? []).map((a) => ({
      key: crypto.randomUUID(),
      name: a.name,
      status: a.status,
      url: a.url ?? "",
    })),
  );
  const setApp = (key: string, patch: Partial<AppDraft>) =>
    setApps((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const move = (i: number, by: number) =>
    setApps((xs) => {
      const next = [...xs];
      const [x] = next.splice(i, 1);
      if (x) next.splice(i + by, 0, x);
      return next;
    });
  const onSave = () => {
    const kept = apps.filter((a) => a.name.trim() || a.url.trim());
    if (kept.some((a) => !a.name.trim())) return void toast.error("Give every app a name.");
    if (launchDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(launchDate.trim()))
      return void toast.error("Use a date for the launch.");
    void submit(
      {
        project: project.trim(),
        target: target.trim(),
        launchDate: launchDate.trim(),
        apps: kept.map((a) => ({
          name: a.name.trim(),
          status: a.status,
          ...(a.url.trim() ? { url: a.url.trim() } : {}),
        })),
      },
      "Belt saved",
    );
  };
  return (
    <EditFrame title={TITLES.belt} backTo={backTo} busy={busy} onSave={onSave}>
      <Row title="Project" line={GAP_HINTS.project} htmlFor="belt-project">
        <Input
          id="belt-project"
          value={project}
          placeholder="Name the public project"
          onChange={(e) => setProject(e.target.value)}
        />
      </Row>
      <Row title="Target" line={GAP_HINTS.target} htmlFor="belt-target">
        <Input
          id="belt-target"
          value={target}
          placeholder="8 apps, public"
          onChange={(e) => setTarget(e.target.value)}
        />
      </Row>
      <Row
        title="Apps"
        line="One square each, in this order. A public app can carry the link anyone can open."
      >
        {apps.length === 0 && <p className={cn("text-sm", muted)}>No apps yet.</p>}
        {apps.map((a, i) => (
          <div
            key={a.key}
            className="flex flex-col gap-2 rounded-[12px] border border-[var(--p-e6e4dd)] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`App ${i + 1} name`}
                value={a.name}
                placeholder="App name"
                onChange={(e) => setApp(a.key, { name: e.target.value })}
                className="min-w-[10rem] flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${a.name || "app"} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <IconArrowUp size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${a.name || "app"} down`}
                disabled={i === apps.length - 1}
                onClick={() => move(i, 1)}
              >
                <IconArrowDown size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${a.name || "app"}`}
                onClick={() => setApps((xs) => xs.filter((x) => x.key !== a.key))}
              >
                <IconX size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ChipPicker
                label={`${a.name || "App"} status`}
                value={a.status}
                options={STATUS_OPTIONS}
                onChange={(status) => setApp(a.key, { status })}
              />
              <Input
                aria-label={`${a.name || "App"} public link`}
                value={a.url}
                placeholder="Public link (optional)"
                onChange={(e) => setApp(a.key, { url: e.target.value })}
                className="min-w-[12rem] flex-1"
              />
            </div>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="ghost"
            className={greyButtonOnWhite}
            onClick={() =>
              setApps((xs) => [
                ...xs,
                {
                  key: crypto.randomUUID(),
                  name: "",
                  status: "planned",
                  url: "",
                },
              ])
            }
          >
            Add an app
          </Button>
        </div>
      </Row>
      <Row title="Launch date" line={GAP_HINTS["launch-date"]} htmlFor="belt-launch">
        <Input
          id="belt-launch"
          type="date"
          value={launchDate}
          onChange={(e) => setLaunchDate(e.target.value)}
          className="max-w-[14rem]"
        />
      </Row>
    </EditFrame>
  );
}
