import { themeTitle, type EntityDetail } from "@shared/marketing";
import { IconArrowDown, IconArrowUp, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Navigate, useNavigate } from "@shims/react-router";
import { toast } from "sonner";

import { EntityAvatar } from "@/components/marketing/EntitiesEditor";
import {
  EditFrame,
  EditLink,
  EmptyCard,
  ListCard,
  ListRow,
  Panel,
  Row,
  card,
  chip,
  greyButtonOnWhite,
  kicker,
  muted,
} from "@/components/marketing/kit/page";
import { GAP_HINTS } from "@/components/marketing/plan/hints";
import { Label } from "@/components/ui/label";
import { usePlanSave, type PlanSave } from "@/components/marketing/plan/kit";
import { stepEditPath, type StepEditProps } from "@/components/marketing/plan/step-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = { detail: EntityDetail; save: PlanSave; disabled: boolean };

export function AssociationWork({ detail, disabled }: Props) {
  const e = detail.entity;
  const g = detail.guidance;
  const a = g.plan.association;
  const edit = (part: string) => stepEditPath(e.id, "association", part);
  return (
    <div className="flex flex-col gap-7">
      <Panel
        id="check-amplify"
        title="Your themes"
        subtitle="What your person loves. Most posts use one of these, and the calendar picks from them. Short titles show on the calendar."
        action={<EditLink to={edit("themes")} disabled={disabled} />}
      >
        {a.amplify.length ? (
          <ListCard>
            {a.amplify.map((t, i) => {
              const titled = (t.title ?? "").trim() !== "";
              return (
                <ListRow key={i}>
                  <span className="flex gap-3">
                    <span className={cn("w-5 shrink-0 font-bold tabular-nums", muted)}>
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{themeTitle(t)}</span>
                      {titled && t.item && <span className={cn("text-sm", muted)}>{t.item}</span>}
                    </span>
                  </span>
                </ListRow>
              );
            })}
          </ListCard>
        ) : (
          <EmptyCard
            text="No themes yet. Add five things your person loves."
            action={<EditLink to={edit("themes")} label="Add themes" disabled={disabled} />}
          />
        )}
      </Panel>

      <Panel
        id="check-anti-brand"
        title="What you stand against"
        action={<EditLink to={edit("against")} disabled={disabled} />}
      >
        {a.antiBrand.length ? (
          <ListCard>
            {a.antiBrand.map((x, i) => (
              <ListRow key={i}>
                <span className="text-[15px] font-bold">{x.item}</span>
                {x.standard.trim() ? (
                  <span className="text-sm text-[var(--p-4a4943)]">{x.standard}</span>
                ) : (
                  <span className={cn("text-sm", muted)}>No standard yet</span>
                )}
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <EmptyCard
            text="Nothing yet. Add three things your person can't stand, and how you show your standard."
            action={<EditLink to={edit("against")} label="Add" disabled={disabled} />}
          />
        )}
      </Panel>

      <Panel
        id="check-visual-constants"
        title="How you look and sound"
        action={<EditLink to={`/entities/${e.id}/profile/edit/identity`} disabled={disabled} />}
      >
        <div
          id="check-verbal-style"
          className={cn(card, "flex scroll-mt-24 flex-wrap items-center gap-6")}
        >
          <EntityAvatar entity={e} size={56} />
          <div className="flex flex-col gap-2">
            <span className={kicker}>Colours</span>
            {g.visual.colours.length ? (
              <span className="flex gap-2">
                {g.visual.colours.map((c) => (
                  <span
                    key={c}
                    title={c}
                    className="size-8 rounded-[8px] border border-[var(--p-e6e4dd)]"
                    style={{ background: c }}
                  />
                ))}
              </span>
            ) : (
              <span className={cn("text-sm", muted)}>None yet</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className={kicker}>Key phrases</span>
            {g.voice?.keyPhrases.length ? (
              <span className="flex flex-wrap gap-1.5">
                {g.voice.keyPhrases.map((p) => (
                  <span key={p} className={cn(chip, "font-semibold")}>
                    {p}
                  </span>
                ))}
              </span>
            ) : (
              <span className={cn("text-sm", muted)}>None yet</span>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

type Theme = { title: string; item: string; postIdea: string };
type Against = { item: string; standard: string; suggestion?: string };

function moveIn<T>(rows: T[], i: number, d: number) {
  const next = [...rows];
  next.splice(i + d, 0, next.splice(i, 1)[0]);
  return next;
}

function RowTools({
  i,
  n,
  onMove,
  onRemove,
  label,
}: {
  i: number;
  n: number;
  onMove: (d: number) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <span className="flex shrink-0 gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Move ${label} up`}
        disabled={i === 0}
        onClick={() => onMove(-1)}
      >
        <IconArrowUp size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Move ${label} down`}
        disabled={i === n - 1}
        onClick={() => onMove(1)}
      >
        <IconArrowDown size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        <IconX size={16} />
      </Button>
    </span>
  );
}

function ThemesEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const navigate = useNavigate();
  const { save } = usePlanSave(detail.entity.id, "association");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Theme[]>(() =>
    detail.guidance.plan.association.amplify.map((t) => ({
      title: t.title ?? "",
      item: t.item,
      postIdea: t.postIdea,
    })),
  );
  const set = (i: number, patch: Partial<Theme>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const submit = async () => {
    const clean = rows
      .map((r) => ({
        title: r.title.trim(),
        item: r.item.trim(),
        postIdea: r.postIdea.trim(),
      }))
      .filter((r) => r.title || r.item || r.postIdea);
    if (clean.some((r) => !r.title && !r.item)) return toast.error("Each theme needs a title.");
    setBusy(true);
    const ok = await save({ amplify: clean });
    setBusy(false);
    if (ok) navigate(backTo);
  };
  return (
    <EditFrame
      title="Your themes"
      description={`${GAP_HINTS.amplify} The short title shows on the calendar.`}
      backTo={backTo}
      onSave={() => void submit()}
      busy={busy}
    >
      {rows.map((r, i) => (
        <Row key={i} title={`Theme ${i + 1}`}>
          <div className="flex items-start gap-2">
            <div className="grid min-w-0 flex-1 gap-2">
              <Input
                aria-label={`Theme ${i + 1} title`}
                placeholder="Short title"
                value={r.title}
                onChange={(ev) => set(i, { title: ev.target.value })}
                className="font-bold"
              />
              <Textarea
                aria-label={`Theme ${i + 1} description`}
                placeholder="Description"
                rows={2}
                value={r.item}
                onChange={(ev) => set(i, { item: ev.target.value })}
              />
              <Textarea
                aria-label={`Theme ${i + 1} post idea`}
                placeholder="A post idea that touches it"
                rows={2}
                value={r.postIdea}
                onChange={(ev) => set(i, { postIdea: ev.target.value })}
              />
            </div>
            <RowTools
              i={i}
              n={rows.length}
              label={`theme ${i + 1}`}
              onMove={(d) => setRows(moveIn(rows, i, d))}
              onRemove={() => setRows(rows.filter((_, j) => j !== i))}
            />
          </div>
        </Row>
      ))}
      <Row title="Add">
        <div>
          <Button
            type="button"
            variant="ghost"
            className={greyButtonOnWhite}
            disabled={rows.length >= 10}
            onClick={() => setRows([...rows, { title: "", item: "", postIdea: "" }])}
          >
            Add theme
          </Button>
        </div>
      </Row>
    </EditFrame>
  );
}

function AgainstEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const navigate = useNavigate();
  const { save } = usePlanSave(detail.entity.id, "association");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Against[]>(() =>
    detail.guidance.plan.association.antiBrand.map((x) => ({ ...x })),
  );
  const set = (i: number, patch: Partial<Against>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const submit = async () => {
    const clean = rows
      .map((r) => ({ ...r, item: r.item.trim(), standard: r.standard.trim() }))
      .filter((r) => r.item || r.standard);
    if (clean.some((r) => !r.item)) return toast.error("Each row needs what they can't stand.");
    setBusy(true);
    const ok = await save({ antiBrand: clean });
    setBusy(false);
    if (ok) navigate(backTo);
  };
  return (
    <EditFrame
      title="What you stand against"
      description={`What your person can't stand. ${GAP_HINTS["anti-brand"]}`}
      backTo={backTo}
      onSave={() => void submit()}
      busy={busy}
    >
      {rows.map((r, i) => (
        <Row key={i} title={`Against ${i + 1}`}>
          <div className="flex items-start gap-2">
            <div className="grid min-w-0 flex-1 gap-2">
              <Input
                aria-label={`Against ${i + 1}`}
                placeholder="What they can't stand"
                value={r.item}
                onChange={(ev) => set(i, { item: ev.target.value })}
                className="font-bold"
              />
              <Textarea
                aria-label={`Standard ${i + 1}`}
                placeholder="How you show your standard"
                rows={2}
                value={r.standard}
                onChange={(ev) => set(i, { standard: ev.target.value })}
              />
            </div>
            <RowTools
              i={i}
              n={rows.length}
              label={`row ${i + 1}`}
              onMove={(d) => setRows(moveIn(rows, i, d))}
              onRemove={() => setRows(rows.filter((_, j) => j !== i))}
            />
          </div>
        </Row>
      ))}
      <Row title="Add">
        <div>
          <Button
            type="button"
            variant="ghost"
            className={greyButtonOnWhite}
            disabled={rows.length >= 6}
            onClick={() => setRows([...rows, { item: "", standard: "" }])}
          >
            Add row
          </Button>
        </div>
      </Row>
    </EditFrame>
  );
}

function LookEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const navigate = useNavigate();
  const g = detail.guidance;
  const { save } = usePlanSave(detail.entity.id, "association");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<string[]>(() =>
    g.plan.association.visualConstants.length ? [...g.plan.association.visualConstants] : [""],
  );
  const [typography, setTypography] = useState(g.visual.typography);
  const [frame, setFrame] = useState({
    background: g.visual.frame?.background ?? "",
    ink: g.visual.frame?.ink ?? "",
    muted: g.visual.frame?.muted ?? "",
    font: g.visual.frame?.font ?? "",
    labelFont: g.visual.frame?.labelFont ?? "",
  });
  const setPart = (key: keyof typeof frame) => (value: string) =>
    setFrame({ ...frame, [key]: value });
  const submit = async () => {
    setBusy(true);
    const kept = Object.fromEntries(
      Object.entries(frame).map(([k, v]) => [k, v.trim()]),
    ) as typeof frame;
    const ok = await save({
      visualConstants: rows.map((r) => r.trim()).filter(Boolean),
      visual: {
        ...g.visual,
        typography: typography.trim(),
        ...(Object.values(kept).some(Boolean) ? { frame: kept } : {}),
      },
    });
    setBusy(false);
    if (ok) navigate(backTo);
  };
  return (
    <EditFrame
      title="Kept for a year"
      description={GAP_HINTS["visual-constants"]}
      backTo={backTo}
      onSave={() => void submit()}
      busy={busy}
    >
      <Row title="Visual constants">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2">
            <Textarea
              aria-label={`Visual constant ${i + 1}`}
              rows={2}
              value={r}
              onChange={(ev) => setRows(rows.map((x, j) => (j === i ? ev.target.value : x)))}
              className="min-w-0 flex-1"
            />
            <RowTools
              i={i}
              n={rows.length}
              label={`constant ${i + 1}`}
              onMove={(d) => setRows(moveIn(rows, i, d))}
              onRemove={() => setRows(rows.filter((_, j) => j !== i))}
            />
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="ghost"
            className={greyButtonOnWhite}
            disabled={rows.length >= 5}
            onClick={() => setRows([...rows, ""])}
          >
            Add constant
          </Button>
        </div>
      </Row>
      <Row title="Typography" line="Optional." htmlFor="look-typography">
        <Input
          id="look-typography"
          value={typography}
          onChange={(ev) => setTypography(ev.target.value)}
          placeholder="A typeface"
        />
      </Row>
      <Row
        title="Image frame"
        line="Every article image is drawn in this frame: the brand picture and @handle sit bottom right."
      >
        {(
          [
            ["background", "Background colour", "#7be8d3"],
            ["ink", "Text colour", "#242424"],
            ["muted", "Label colour", "#456e66"],
            ["font", "Headline font", "Inter"],
            ["labelFont", "Label font", "JetBrains Mono"],
          ] as const
        ).map(([key, label, example]) => (
          <div key={key} className="grid gap-1">
            <Label htmlFor={`frame-${key}`}>{label}</Label>
            <Input
              id={`frame-${key}`}
              value={frame[key]}
              onChange={(ev) => setPart(key)(ev.target.value)}
              placeholder={example}
            />
          </div>
        ))}
      </Row>
    </EditFrame>
  );
}

export function AssociationEdit({ detail, part, backTo }: StepEditProps) {
  if (part === "themes") return <ThemesEdit detail={detail} backTo={backTo} />;
  if (part === "against") return <AgainstEdit detail={detail} backTo={backTo} />;
  if (part === "look") return <LookEdit detail={detail} backTo={backTo} />;

  if (part === "sound")
    return (
      <Navigate
        to={`/entities/${detail.entity.id}/profile/edit/sound?from=${encodeURIComponent(backTo)}`}
        replace
      />
    );
  return <Navigate to={backTo} replace />;
}

export const associationCheckPart: Record<string, string> = {
  amplify: "themes",
  "anti-brand": "against",
  "visual-constants": "look",
  "verbal-style": "sound",
};
