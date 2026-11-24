import {
  PERSON_TESTS,
  PERSON_TEST_TITLES,
  type EntityDetail,
  type PersonTest,
} from "@shared/marketing";
import {
  IconArrowDown,
  IconArrowUp,
  IconCreditCard,
  IconMoodSad,
  IconQuote,
  IconTarget,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "@shims/react-router";

import {
  ChipPicker,
  EditFrame,
  EditLink,
  EmptyCard,
  ListCard,
  ListRow,
  Panel,
  Row,
  card,
  greyButtonOnWhite,
  kicker,
  muted,
} from "@/components/marketing/kit/page";
import { GAP_HINTS } from "@/components/marketing/plan/hints";
import { usePlanSave, type PlanSave } from "@/components/marketing/plan/kit";
import { stepEditPath, type StepEditProps } from "@/components/marketing/plan/step-edit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ORANGE = "var(--p-d97706)";
const GREEN = "var(--p-1a7f37)";
const TESTS: Record<PersonTest, { q: string; short: [string, string] }> = {
  growingMarket: {
    q: "Is their market growing?",
    short: ["Growing", "market"],
  },
  acutePain: { q: "Do they need it fixed now?", short: ["Acute", "pain"] },
  purchasingPower: {
    q: "Can they afford to pay?",
    short: ["Purchasing", "power"],
  },
  algorithmicClarity: {
    q: "Can X tell who they are?",
    short: ["Algorithmic", "clarity"],
  },
};
const scoreColor = (v: number | null) =>
  v == null ? "var(--p-afb8c1)" : v >= 8 ? GREEN : v >= 5 ? "var(--p-2fa36b)" : ORANGE;
const segFill = (v: number | null) =>
  v == null ? "var(--p-f0efe9)" : `rgba(26,127,55,${(0.12 + (v / 10) * 0.5).toFixed(2)})`;

function wrap(text: string, max: number, lines: number) {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (`${cur} ${w}`.trim().length > max) {
      out.push(cur);
      cur = w;
    } else cur = `${cur} ${w}`.trim();
  }
  if (cur) out.push(cur);
  if (out.length > lines) return [...out.slice(0, lines - 1), `${out[lines - 1]}…`];
  return out;
}

export function PersonFunnel({
  detail,
  selected,
  onSelect,
}: {
  detail: EntityDetail;
  selected: number;
  onSelect: (i: number) => void;
}) {
  const p = detail.guidance.plan.person;
  const scores = PERSON_TESTS.map((t) => p.tests[t]?.score ?? null);
  const all = scores.every((v) => v != null);
  const who = wrap(p.who || "Who is it for?", 14, 3);

  const x0 = 10;
  const segW = 118;
  const left = 92;
  const top = (x: number) => 20 + ((x - x0) / (left + 4 * segW - x0)) * 60;
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-[var(--p-e6e4dd)] bg-[var(--p-card)] px-[18px] pb-3 pt-5">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--p-6b6a63)]">
        Your funnel · tap a test
      </span>
      <svg
        viewBox="0 0 760 320"
        width="100%"
        role="img"
        aria-label="Your person funnel, from everyone to your person through four tests"
      >
        <polygon
          style={{ fill: "var(--p-f0efe9)", stroke: "var(--p-d6d4cc)" }}
          points={`${x0},20 ${left},${top(left)} ${left},${320 - top(left)} ${x0},300`}
        />
        <text
          style={{ fill: "var(--p-8c8b84)" }}
          x={(x0 + left) / 2}
          y="166"
          fontSize="17"
          fontWeight="800"
          textAnchor="middle"
        >
          Everyone
        </text>
        {PERSON_TESTS.map((t, i) => {
          const a0 = left + i * segW;
          const a1 = a0 + segW;
          const v = scores[i];
          return (
            <g
              key={t}
              role="button"
              tabIndex={0}
              aria-label={`${PERSON_TEST_TITLES[t]}: ${v ?? "not scored"}`}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(selected === i ? -1 : i)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(selected === i ? -1 : i)}
            >
              <polygon
                style={{
                  fill: segFill(v),
                  stroke: selected === i ? "var(--p-1f2328)" : "var(--p-ffffff)",
                }}
                points={`${a0},${top(a0)} ${a1},${top(a1)} ${a1},${320 - top(a1)} ${a0},${320 - top(a0)}`}
                strokeWidth={selected === i ? 3 : 1.5}
              />
              <circle style={{ fill: "var(--p-1f2328)" }} cx={a0 + 22} cy="112" r="14" />
              <text
                style={{ fill: "var(--p-on-ink)" }}
                x={a0 + 22}
                y="117.5"
                fontSize="15"
                fontWeight="800"
                textAnchor="middle"
              >
                {i + 1}
              </text>
              <text
                style={{ fill: "var(--p-1f2328)" }}
                x={a0 + 8}
                y="152"
                fontSize="18"
                fontWeight="800"
              >
                {TESTS[t].short[0]}
              </text>
              <text
                style={{ fill: "var(--p-1f2328)" }}
                x={a0 + 8}
                y="174"
                fontSize="18"
                fontWeight="800"
              >
                {TESTS[t].short[1]}
              </text>
              <text
                style={{ fill: scoreColor(v) }}
                x={a0 + 8}
                y="208"
                fontSize="26"
                fontWeight="800"
              >
                {v == null ? "–" : `${v}/10`}
              </text>
            </g>
          );
        })}
        <line
          style={{ stroke: "var(--p-1f2328)" }}
          x1={left + 4 * segW + 6}
          y1="160"
          x2={left + 4 * segW + 26}
          y2="160"
          strokeWidth="2.5"
        />
        <polygon
          style={{ fill: "var(--p-1f2328)" }}
          points={`${left + 4 * segW + 26},153 ${left + 4 * segW + 36},160 ${left + 4 * segW + 26},167`}
        />
        <rect
          style={{
            fill: all ? "var(--p-c8f2d3)" : "var(--p-f0efe9)",
            stroke: all ? GREEN : "var(--p-cfcdc5)",
          }}
          x="608"
          y="78"
          width="146"
          height="164"
          rx="14"
          strokeWidth="2"
        />
        <text
          style={{ fill: "var(--p-1f2328)" }}
          x="681"
          y="110"
          fontSize="20"
          fontWeight="800"
          textAnchor="middle"
        >
          Your person
        </text>
        {who.map((line, i) => (
          <text
            style={{ fill: "var(--p-1f2328)" }}
            key={i}
            x="681"
            y={138 + i * 22}
            fontSize="17"
            textAnchor="middle"
          >
            {line}
          </text>
        ))}
        <text
          style={{ fill: all ? GREEN : ORANGE }}
          x="681"
          y="228"
          fontSize="15"
          fontWeight="700"
          textAnchor="middle"
        >
          {all ? "✓ All four scored" : "Score all four"}
        </text>
      </svg>
      <span className="text-xs text-[var(--p-6b6a63)]">
        Redrawn from hoeem's "Write for everyone and nobody pays". Each test fills greener as its
        score rises.{" "}
        <a
          className="underline underline-offset-[3px]"
          href="/brand-plan/images/2-person-four-tests.png"
          target="_blank"
          rel="noreferrer"
        >
          See hoeem's original
        </a>
      </span>
    </div>
  );
}

function Gauge({ value, label }: { value: number | null; label: string }) {
  const c = scoreColor(value);
  const r = 59;
  const len = 2 * Math.PI * r;
  return (
    <div
      role="img"
      aria-label={`${label}: ${value ?? "not scored"} out of 10`}
      className="relative size-[132px]"
    >
      <svg width={132} height={132} viewBox="0 0 132 132" aria-hidden className="-rotate-90">
        <circle
          style={{ stroke: "var(--p-ecebe5)" }}
          cx={66}
          cy={66}
          r={r}
          fill="none"
          strokeWidth={14}
        />
        {value != null && value > 0 && (
          <circle
            style={{ stroke: c }}
            cx={66}
            cy={66}
            r={r}
            fill="none"
            strokeWidth={14}
            strokeDasharray={`${(value / 10) * len} ${len}`}
          />
        )}
      </svg>
      <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[32px] font-extrabold leading-none"
          style={{
            color: value == null ? "var(--p-8c8b84)" : "var(--p-1f2328)",
          }}
        >
          {value ?? "–"}
        </span>
        <span className="text-[11px] font-normal text-[var(--p-6b6a63)]">out of 10</span>
      </span>
    </div>
  );
}

const TEST_KEYS: Record<PersonTest, string> = {
  growingMarket: "market",
  acutePain: "urgency",
  purchasingPower: "budget",
  algorithmicClarity: "clarity",
};

const PARTS = {
  person: "Your person",
  tests: "The four tests",
  reach: "Who you reach",
} as const;
type Part = keyof typeof PARTS;

function Answer({ value, empty, className }: { value: string; empty: string; className: string }) {
  return value.trim() ? (
    <p className={cn("whitespace-pre-wrap", className)}>{value}</p>
  ) : (
    <p className={cn("text-sm", muted)}>{empty}</p>
  );
}

export function PersonWork({
  detail,
  disabled,
  selected,
}: {
  detail: EntityDetail;
  save: PlanSave;
  disabled: boolean;
  selected: number;
}) {
  const p = detail.guidance.plan.person;
  const e = detail.entity;
  const edit = (part: Part) => stepEditPath(e.id, "person", part);
  const scored = PERSON_TESTS.map((t) => p.tests[t]?.score ?? null).filter(
    (v): v is number => v != null,
  );
  const avg = scored.length ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : null;
  return (
    <div className="flex flex-col gap-7">
      <Panel
        id="person-who"
        title={PARTS.person}
        subtitle="The one person you serve, their pain, and what they already pay for."
        action={<EditLink to={edit("person")} disabled={disabled} />}
      >
        <div
          id="check-who"
          className="flex scroll-mt-24 items-center gap-4 rounded-[14px] border border-[var(--p-b7e4c4)] bg-[var(--p-f2fdf6)] p-7"
        >
          <IconTarget size={34} className="shrink-0 text-[var(--p-1a7f37)]" />
          <Answer
            value={p.who}
            empty="No one sentence yet: who exactly is your person?"
            className="text-2xl font-extrabold leading-snug text-[var(--p-1f2328)]"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div id="check-pain" className={cn(card, "flex scroll-mt-24 flex-col gap-2")}>
            <span className={cn(kicker, "flex items-center gap-1.5")}>
              <IconMoodSad size={14} /> Their pain
            </span>
            <Answer
              value={p.pain}
              empty="Not written yet."
              className="text-[15px] leading-relaxed"
            />
          </div>
          <div id="check-pays-for" className={cn(card, "flex scroll-mt-24 flex-col gap-2")}>
            <span className={cn(kicker, "flex items-center gap-1.5")}>
              <IconCreditCard size={14} /> What they already pay for
            </span>
            <Answer
              value={p.pays}
              empty="Not written yet."
              className="text-[22px] font-extrabold leading-snug"
            />
          </div>
        </div>
      </Panel>

      <Panel
        id="person-tests"
        title={PARTS.tests}
        subtitle={
          avg
            ? `Average ${avg} out of 10 across ${scored.length} scored.`
            : "Score each test from 1 to 10."
        }
        action={<EditLink to={edit("tests")} disabled={disabled} />}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PERSON_TESTS.map((t, i) => (
            <div
              key={t}
              id={`check-${TEST_KEYS[t]}`}
              className={cn(
                card,
                "flex scroll-mt-24 flex-col items-center gap-2.5 text-center transition-all",
                selected === i ? "border-[var(--p-1f2328)] ring-1 ring-[var(--p-1f2328)]" : "",
              )}
            >
              <Gauge value={p.tests[t]?.score ?? null} label={PERSON_TEST_TITLES[t]} />
              <span className="text-[15px] font-bold">{PERSON_TEST_TITLES[t]}</span>
              <span className="text-xs text-[var(--p-6b6a63)]">{TESTS[t].q}</span>
              <div className="w-full text-left">
                <Answer
                  value={p.tests[t]?.note ?? ""}
                  empty="No reason yet."
                  className="text-[13px] leading-relaxed text-[var(--p-4a4943)]"
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        id="person-reach"
        title={PARTS.reach}
        subtitle="The audiences you speak to, and what they get from following you."
        action={<EditLink to={edit("reach")} disabled={disabled} />}
      >
        <div id="check-audiences" className="scroll-mt-24">
          {e.audiences.length ? (
            <ListCard>
              {e.audiences.map((aud, i) => (
                <ListRow key={`${i}-${aud}`}>
                  <span className="text-[15px] font-semibold">{aud}</span>
                </ListRow>
              ))}
            </ListCard>
          ) : (
            <EmptyCard text="No audiences yet." />
          )}
        </div>
        <div id="check-promise" className={cn(card, "flex scroll-mt-24 gap-5")}>
          <IconQuote size={40} className="shrink-0 text-[var(--p-2fa36b)]" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className={kicker}>What they get from following you</span>
            <Answer
              value={detail.guidance.audiencePromise}
              empty="Not written yet."
              className="text-lg leading-relaxed"
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}

export function PersonEdit({ detail, part, backTo }: StepEditProps) {
  if (part === "tests") return <TestsEdit detail={detail} backTo={backTo} />;
  if (part === "reach") return <ReachEdit detail={detail} backTo={backTo} />;
  return <WhoEdit detail={detail} backTo={backTo} />;
}

function useSaveAndBack(detail: EntityDetail, backTo: string) {
  const navigate = useNavigate();
  const { save } = usePlanSave(detail.entity.id, "person");
  const [busy, setBusy] = useState(false);
  const run = async (values: Record<string, unknown>) => {
    setBusy(true);
    try {
      if (await save(values)) navigate(backTo);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function WhoEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const p = detail.guidance.plan.person;
  const { busy, run } = useSaveAndBack(detail, backTo);
  const [f, setF] = useState({ who: p.who, pain: p.pain, pays: p.pays });
  return (
    <EditFrame
      title={PARTS.person}
      backTo={backTo}
      busy={busy}
      onSave={() =>
        void run({
          who: f.who.trim(),
          pain: f.pain.trim(),
          pays: f.pays.trim(),
        })
      }
    >
      <Row title="The one sentence" line={GAP_HINTS.who} htmlFor="person-who">
        <Textarea
          id="person-who"
          rows={3}
          value={f.who}
          onChange={(ev) => setF({ ...f, who: ev.target.value })}
        />
      </Row>
      <Row title="Their pain" line={GAP_HINTS.pain} htmlFor="person-pain">
        <Textarea
          id="person-pain"
          rows={4}
          value={f.pain}
          onChange={(ev) => setF({ ...f, pain: ev.target.value })}
        />
      </Row>
      <Row title="What they already pay for" line={GAP_HINTS["pays-for"]} htmlFor="person-pays">
        <Textarea
          id="person-pays"
          rows={3}
          value={f.pays}
          onChange={(ev) => setF({ ...f, pays: ev.target.value })}
        />
      </Row>
    </EditFrame>
  );
}

const SCORE_OPTIONS = [
  { id: "", name: "Not scored" },
  ...Array.from({ length: 10 }, (_, k) => ({
    id: String(k + 1),
    name: String(k + 1),
  })),
];

function TestsEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const p = detail.guidance.plan.person;
  const { busy, run } = useSaveAndBack(detail, backTo);
  const [tests, setTests] = useState(
    () =>
      Object.fromEntries(
        PERSON_TESTS.map((t) => [
          t,
          { score: p.tests[t]?.score ?? null, note: p.tests[t]?.note ?? "" },
        ]),
      ) as Record<PersonTest, { score: number | null; note: string }>,
  );
  const set = (t: PersonTest, v: Partial<{ score: number | null; note: string }>) =>
    setTests({ ...tests, [t]: { ...tests[t], ...v } });
  return (
    <EditFrame
      title={PARTS.tests}
      description="Score each test from 1 to 10 and say why."
      backTo={backTo}
      busy={busy}
      onSave={() =>
        void run({
          tests: Object.fromEntries(
            PERSON_TESTS.map((t) => [
              t,
              {
                ...p.tests[t],
                score: tests[t].score,
                note: tests[t].note.trim(),
              },
            ]),
          ),
        })
      }
    >
      {PERSON_TESTS.map((t) => (
        <Row key={t} title={PERSON_TEST_TITLES[t]} line={TESTS[t].q}>
          <ChipPicker
            label={`${PERSON_TEST_TITLES[t]} score`}
            value={tests[t].score == null ? "" : String(tests[t].score)}
            options={SCORE_OPTIONS}
            onChange={(v) => set(t, { score: v ? Number(v) : null })}
          />
          <Textarea
            aria-label={`Why ${PERSON_TEST_TITLES[t].toLowerCase()} scores this`}
            placeholder="Why it scores this"
            rows={3}
            value={tests[t].note}
            onChange={(ev) => set(t, { note: ev.target.value })}
          />
        </Row>
      ))}
    </EditFrame>
  );
}

function ReachEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const { busy, run } = useSaveAndBack(detail, backTo);
  const [audiences, setAudiences] = useState<string[]>(
    detail.entity.audiences.length ? [...detail.entity.audiences] : [""],
  );
  const [promise, setPromise] = useState(detail.guidance.audiencePromise);
  const move = (i: number, d: number) => {
    const next = [...audiences];
    next.splice(i + d, 0, next.splice(i, 1)[0]);
    setAudiences(next);
  };
  return (
    <EditFrame
      title={PARTS.reach}
      backTo={backTo}
      busy={busy}
      onSave={() =>
        void run({
          audiences: audiences.map((a) => a.trim()).filter(Boolean),
          audiencePromise: promise.trim(),
        })
      }
    >
      <Row title="Audiences" line={GAP_HINTS.audiences}>
        {audiences.map((a, i) => (
          <div key={i} className="flex items-start gap-1">
            <Textarea
              aria-label={`Audience ${i + 1}`}
              rows={2}
              value={a}
              onChange={(ev) =>
                setAudiences(audiences.map((x, j) => (j === i ? ev.target.value : x)))
              }
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move up"
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <IconArrowUp size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move down"
              disabled={i === audiences.length - 1}
              onClick={() => move(i, 1)}
            >
              <IconArrowDown size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove audience ${i + 1}`}
              onClick={() => setAudiences(audiences.filter((_, j) => j !== i))}
            >
              <IconX size={16} />
            </Button>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="ghost"
            className={greyButtonOnWhite}
            disabled={audiences.length >= 20}
            onClick={() => setAudiences([...audiences, ""])}
          >
            Add audience
          </Button>
        </div>
      </Row>
      <Row
        title="What they get from following you"
        line={GAP_HINTS.promise}
        htmlFor="person-promise"
      >
        <Textarea
          id="person-promise"
          rows={4}
          value={promise}
          onChange={(ev) => setPromise(ev.target.value)}
        />
      </Row>
    </EditFrame>
  );
}

export const personCheckPart: Record<string, string> = {
  who: "person",
  pain: "person",
  "pays-for": "person",
  market: "tests",
  urgency: "tests",
  budget: "tests",
  clarity: "tests",
  audiences: "reach",
  promise: "reach",
};
