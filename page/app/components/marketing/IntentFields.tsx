import type { Intent } from "@shared/marketing";

import { Field, Picker } from "@/components/marketing/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const routineIntent = (audience = ""): Intent => ({
  audience,
  purpose: "Start a substantive conversation",
  rationale:
    "A specific, helpful contribution to a peer's discussion builds trust (established practice).",
  practice: "routine",
  hypothesis: "",
  expectation: "",
  baseline: "",
  evidence: "",
  reviewPoint: "",
  strategyRef: "",
});

export function IntentFields({
  value,
  onChange,
  idp,
}: {
  value: Intent;
  onChange: (v: Intent) => void;
  idp: string;
}) {
  const set = (patch: Partial<Intent>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Audience" htmlFor={`${idp}-aud`}>
          <Input
            id={`${idp}-aud`}
            value={value.audience}
            onChange={(e) => set({ audience: e.target.value })}
          />
        </Field>
        <Field label="Intended outcome" htmlFor={`${idp}-purpose`}>
          <Input
            id={`${idp}-purpose`}
            value={value.purpose}
            onChange={(e) => set({ purpose: e.target.value })}
          />
        </Field>
        <Field label="Practice">
          <Picker
            label="Practice"
            value={value.practice}
            allowEmpty={false}
            onChange={(v) => set({ practice: v as Intent["practice"] })}
            options={[
              { id: "routine", name: "Routine practice" },
              { id: "experiment", name: "Experiment" },
            ]}
          />
        </Field>
      </div>
      <Field label="Rationale: why should this help?" htmlFor={`${idp}-why`}>
        <Textarea
          id={`${idp}-why`}
          rows={2}
          value={value.rationale}
          onChange={(e) => set({ rationale: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Expectation"
          hint="Qualitative is fine; numbers need a baseline."
          htmlFor={`${idp}-exp`}
        >
          <Input
            id={`${idp}-exp`}
            value={value.expectation}
            onChange={(e) => set({ expectation: e.target.value })}
          />
        </Field>
        <Field label="Baseline" hint="Leave empty when unknown." htmlFor={`${idp}-base`}>
          <Input
            id={`${idp}-base`}
            value={value.baseline}
            onChange={(e) => set({ baseline: e.target.value })}
          />
        </Field>
      </div>
      {value.practice === "experiment" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Hypothesis" htmlFor={`${idp}-hyp`}>
            <Textarea
              id={`${idp}-hyp`}
              rows={2}
              value={value.hypothesis}
              onChange={(e) => set({ hypothesis: e.target.value })}
            />
          </Field>
          <Field label="Review point" hint="When results will be reviewed." htmlFor={`${idp}-rp`}>
            <Input
              id={`${idp}-rp`}
              value={value.reviewPoint}
              onChange={(e) => set({ reviewPoint: e.target.value })}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

export function IntentSummary({ intent }: { intent: Intent }) {
  return (
    <dl className="grid gap-1 text-sm">
      <div>
        <dt className="inline font-medium">Audience: </dt>
        <dd className="inline">{intent.audience}</dd>
      </div>
      <div>
        <dt className="inline font-medium">Outcome: </dt>
        <dd className="inline">{intent.purpose}</dd>
      </div>
      <div>
        <dt className="inline font-medium">Why: </dt>
        <dd className="inline">{intent.rationale}</dd>
      </div>
      <div className="text-xs text-muted-foreground">
        {intent.practice === "experiment"
          ? `Experiment · hypothesis: ${intent.hypothesis} · review: ${intent.reviewPoint}`
          : "Routine practice"}
        {intent.expectation && ` · expectation: ${intent.expectation}`}
        {` · baseline: ${intent.baseline || "unknown"}`}
      </div>
    </dl>
  );
}
