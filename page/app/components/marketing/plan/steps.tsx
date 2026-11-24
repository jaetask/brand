import {
  countsAsProof,
  isProofLink,
  type EntityDetail,
  type Knowledge,
  type PlanLevel,
} from "@shared/marketing";
import { IconChevronRight } from "@tabler/icons-react";
import { useActionQuery } from "@shims/use-action";
import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "@shims/react-router";
import { toast } from "sonner";

import {
  CardLink,
  ChipPicker,
  EditFrame,
  EmptyCard,
  ListCard,
  ListRow,
  PageLink,
  Panel,
  Row,
  chip,
  muted,
  useShowMore,
} from "@/components/marketing/kit/page";
import { AssociationWork } from "@/components/marketing/plan/association";
import { BeltWork } from "@/components/marketing/plan/belt";
import { GAP_HINTS } from "@/components/marketing/plan/hints";
import {
  Answer,
  blankList,
  blankText,
  useFromHref,
  usePlanSave,
  type PlanSave,
} from "@/components/marketing/plan/kit";
import { PersonWork } from "@/components/marketing/plan/person";
import { ProductWork } from "@/components/marketing/plan/product";
import { useSeasons } from "@/components/marketing/plan/season";
import { stepEditPath, type StepEditProps } from "@/components/marketing/plan/step-edit";
import { LinesInput, Status, useWrite } from "@/components/marketing/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = { detail: EntityDetail; save: PlanSave; disabled: boolean };

export function StepWork({
  level,
  detail,
  selected = -1,
}: {
  level: PlanLevel;
  detail: EntityDetail;
  selected?: number;
}) {
  const { save } = usePlanSave(detail.entity.id, level);
  const props: Props = { detail, save, disabled: detail.entity.archived };
  const Work = {
    proof: ProofWork,
    association: AssociationWork,
    product: ProductWork,
    belt: BeltWork,
  }[level as Exclude<PlanLevel, "person">];
  return (
    <div className="grid gap-5">
      {level === "person" ? <PersonWork {...props} selected={selected} /> : <Work {...props} />}
    </div>
  );
}

const text = (
  question: string,
  value: string,
  onSave: (v: string) => Promise<unknown>,
  opts: {
    hint?: string;
    placeholder?: string;
    long?: boolean;
    disabled?: boolean;
    type?: string;
    anchor?: string;
  } = {},
) => (
  <Answer<string>
    anchor={opts.anchor}
    question={question}
    hint={opts.hint}
    value={value}
    save={onSave}
    isEmpty={blankText}
    disabled={opts.disabled}
    settled={(v) => v}
    input={(d, set) =>
      opts.long ? (
        <Textarea
          rows={3}
          aria-label={question}
          value={d}
          placeholder={opts.placeholder}
          onChange={(e) => set(e.target.value)}
        />
      ) : (
        <Input
          aria-label={question}
          type={opts.type}
          value={d}
          placeholder={opts.placeholder}
          onChange={(e) => set(e.target.value)}
        />
      )
    }
  />
);

const lines = (
  question: string,
  value: string[],
  onSave: (v: string[]) => Promise<unknown>,
  opts: {
    hint?: string;
    placeholder?: string;
    disabled?: boolean;
    anchor?: string;
  } = {},
) => (
  <Answer<string[]>
    anchor={opts.anchor}
    question={question}
    hint={opts.hint ?? "One per line."}
    value={value}
    save={onSave}
    isEmpty={blankList}
    disabled={opts.disabled}
    settled={(v) => (
      <ul className="grid list-disc gap-0.5 pl-5">
        {v.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    )}
    input={(d, set) => (
      <LinesInput
        value={d}
        onChange={set}
        placeholder={opts.placeholder}
        rows={Math.max(3, d.length + 1)}
      />
    )}
  />
);

export function SeasonPath({ detail }: { detail: EntityDetail }) {
  const seasons = useSeasons(detail.entity.id);
  const seasonsHref = useFromHref(`/entities/${detail.entity.id}/seasons`);
  const cur = seasons.data?.current;
  if (!cur) return null;
  const path = cur.path;
  return (
    <CardLink
      to={seasonsHref}
      title={`Open Season ${cur.n} in the season editor`}
      className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-[var(--p-e6e4dd)] bg-[var(--p-card)] px-5 py-3.5 transition-colors hover:border-[var(--p-c9c7bf)] hover:bg-[var(--p-fbfbf9)]"
    >
      <span className="rounded-full bg-[var(--p-dafbe1)] px-2.5 py-1 text-xs font-semibold text-[var(--p-1a7f37)]">
        Season {cur.n} path
      </span>
      <span className="min-w-0 flex-1 text-[15px]">
        {path ? (
          <>
            <b>
              {path} · {PATH_LONG[path].name}.
            </b>{" "}
            <span className="text-[var(--p-6b6a63)]">{PATH_LONG[path].line}</span>
          </>
        ) : (
          <span className="text-[var(--p-6b6a63)]">
            Not chosen yet. Choose it in the season editor.
          </span>
        )}
      </span>
      <IconChevronRight size={18} className="shrink-0 text-[var(--p-6b6a63)]" aria-hidden />
    </CardLink>
  );
}

const PATH_LONG = {
  A: {
    name: "Outcome flex",
    line: "Show rare, measurable results you already have.",
  },
  B: {
    name: "Volume sprint",
    line: "No results yet: post a lot for 30 days to earn them.",
  },
} as const;

const KINDS = [
  { id: "fact", name: "Something I built or did" },
  { id: "story", name: "A story" },
  { id: "opinion", name: "An opinion" },
  { id: "reference", name: "Someone else's source" },
] as const;
const KIND_NAME: Record<string, string> = {
  fact: "Built or did",
  story: "Story",
  opinion: "Opinion",
  reference: "Source",
};

function ProofWork({ detail }: Props) {
  const e = detail.entity;
  const query = useActionQuery<{ knowledge: Knowledge[] }>("list-knowledge", {
    entityId: e.id,
    status: "active",
  });
  const items = query.data?.knowledge ?? [];
  const counting = items.filter((k) => countsAsProof(k.proofUrl, k.linkOk));
  const needsLink = items.filter((k) => !countsAsProof(k.proofUrl, k.linkOk));
  const { shown, more } = useShowMore(needsLink, 5);
  const needed = detail.plan.proofNeeded;
  const slots = Math.max(detail.plan.seasonTarget ?? 8, needed, counting.length);
  const have = Math.min(counting.length, needed);
  const entryPath = (id?: string) =>
    `${stepEditPath(e.id, "proof", "entry")}${id ? `?entry=${id}` : ""}`;
  return (
    <div className="flex flex-col gap-7">
      <Panel
        id="check-proof-links"
        title="Proof that counts"
        subtitle={`${have} of ${needed} needed this season. One slot per app in your Belt. An entry counts once it has a link anyone can open.`}
      >
        <Status loading={query.isLoading} error={query.error}>
          <ol className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Proof slots">
            {Array.from({ length: slots }, (_, i) => {
              const k = counting[i];
              const isNeeded = i < needed;
              return (
                <li
                  key={k?.id ?? `slot-${i}`}
                  className={cn(
                    "flex min-h-[110px] flex-col gap-1.5 rounded-[14px] border p-4",
                    k
                      ? "border-[var(--p-e6e4dd)] bg-[var(--p-card)]"
                      : isNeeded
                        ? "border-dashed border-[var(--p-d97706)]"
                        : "border-dashed border-[var(--p-c9c7bf)]",
                  )}
                >
                  {k ? (
                    <>
                      <span className="flex justify-end">
                        <span className="rounded-full bg-[var(--p-dafbe1)] px-2.5 py-1 text-xs font-semibold text-[var(--p-1a7f37)]">
                          Counts
                        </span>
                      </span>
                      <span className="line-clamp-2 text-sm font-bold">
                        {k.title || k.body.slice(0, 80)}
                      </span>
                      <span className={cn("truncate font-mono text-[11px]", muted)}>
                        {k.proofUrl.replace(/^https?:\/\//, "")}
                      </span>
                    </>
                  ) : (
                    <span
                      className={cn(
                        "m-auto text-center text-[13px] font-semibold",
                        isNeeded ? "text-[var(--p-d97706)]" : muted,
                      )}
                    >
                      {isNeeded ? `Needed ${i + 1} of ${needed}` : `Slot ${i + 1}`}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </Status>
      </Panel>
      <Panel
        id="needs-link"
        title="Needs a link"
        subtitle="Your proof, in your words. Add a public repo, demo or post and it moves up into a slot."
        action={
          <PageLink to={entryPath()} disabled={e.archived}>
            New proof
          </PageLink>
        }
      >
        {needsLink.length ? (
          <>
            <ListCard>
              {shown.map((k) => (
                <ListRow
                  key={k.id}
                  to={entryPath(k.id)}
                  aside={
                    !e.archived && (
                      <PageLink to={entryPath(k.id)} onWhite>
                        Add link
                      </PageLink>
                    )
                  }
                >
                  <span className="text-[15px] font-semibold">
                    {k.title || k.body.slice(0, 80)}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <span className={chip}>{KIND_NAME[k.kind] ?? k.kind}</span>
                    {isProofLink(k.proofUrl) && k.linkOk === false && (
                      <span className={chip}>Link isn't public</span>
                    )}
                  </span>
                </ListRow>
              ))}
            </ListCard>
            {more}
          </>
        ) : (
          <EmptyCard
            text="Nothing waiting for a link."
            action={
              <PageLink to={entryPath()} disabled={e.archived}>
                New proof
              </PageLink>
            }
          />
        )}
      </Panel>
    </div>
  );
}

function LinkCheckLine({ url }: { url: string }) {
  const u = url.trim();
  const q = useActionQuery<{ ok: boolean | null; reason: string }>(
    "get-link-check",
    { url: u },
    { enabled: isProofLink(u), staleTime: 60_000 },
  );
  if (!isProofLink(u))
    return u ? (
      <span className={cn("text-xs", muted)}>Use a full link starting with https://</span>
    ) : null;
  if (q.isLoading)
    return <span className={cn("text-xs", muted)}>Checking whether anyone can open it…</span>;
  const r = q.data;
  if (!r) return null;
  return (
    <span
      className={cn(
        "text-xs",
        r.ok === true
          ? "text-[var(--p-1a7f37)]"
          : r.ok === false
            ? "text-[var(--p-d97706)]"
            : muted,
      )}
    >
      {r.ok === true ? "✓ " : ""}
      {r.reason}
    </span>
  );
}

function ProofEntryEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("entry");
  const query = useActionQuery<{ knowledge: Knowledge[] }>(
    "list-knowledge",
    { entityId: detail.entity.id, status: "active" },
    { enabled: Boolean(id) },
  );
  const k = id ? query.data?.knowledge.find((x) => x.id === id) : undefined;
  if (id && query.isLoading) return <Status loading>{null}</Status>;
  if (id && !k)
    return (
      <EmptyCard
        text="That proof entry isn't here any more."
        action={<PageLink to={backTo}>Back</PageLink>}
      />
    );
  return (
    <ProofEntryForm
      key={k?.id ?? "new"}
      detail={detail}
      k={k}
      backTo={backTo}
      onDone={() => navigate(backTo)}
    />
  );
}

function ProofEntryForm({
  detail,
  k,
  backTo,
  onDone,
}: {
  detail: EntityDetail;
  k?: Knowledge;
  backTo: string;
  onDone: () => void;
}) {
  const save = useWrite<Knowledge>("save-knowledge", {
    success: k ? "Proof saved" : "Proof added",
  });
  const [f, setF] = useState({
    title: k?.title ?? "",
    kind: (k?.kind ?? "fact") as string,
    proofUrl: k?.proofUrl ?? "",
    body: k?.body ?? "",
  });
  const submit = async () => {
    if (!f.title.trim()) return toast.error("Say what you did.");
    const values = {
      title: f.title.trim(),
      kind: f.kind,
      proofUrl: f.proofUrl.trim(),
      body: f.body,
    };
    const r = k
      ? await save.run({
          id: k.id,
          expectedVersion: k.version,
          ...values,
          note: "Edited on the Proof step",
        })
      : await save.run({
          entityId: detail.entity.id,
          provenance: "firsthand",
          speaker: "",
          ...values,
          note: "Added on the Proof step",
        });
    if (r) onDone();
  };
  return (
    <EditFrame
      title={k ? "Proof entry" : "New proof"}
      description={GAP_HINTS["proof-links"]}
      backTo={backTo}
      onSave={() => void submit()}
      busy={save.busy}
    >
      <Row title="What you did" line="In your words, as you'd say it." htmlFor="proof-title">
        <Input
          id="proof-title"
          value={f.title}
          onChange={(ev) => setF({ ...f, title: ev.target.value })}
          className="font-semibold"
        />
      </Row>
      <Row title="Kind">
        <ChipPicker
          label="Kind"
          value={f.kind}
          options={KINDS.map((x) => ({ id: x.id as string, name: x.name }))}
          onChange={(kind) => setF({ ...f, kind })}
        />
      </Row>
      <Row
        title="Link"
        line="Something a reader can open: a public repo, a demo, a post."
        htmlFor="proof-link"
      >
        <Input
          id="proof-link"
          type="url"
          placeholder="https://"
          value={f.proofUrl}
          onChange={(ev) => setF({ ...f, proofUrl: ev.target.value })}
        />
        <LinkCheckLine url={f.proofUrl} />
      </Row>
      <Row title="Details" line="Optional. Numbers help." htmlFor="proof-body">
        <Textarea
          id="proof-body"
          rows={5}
          value={f.body}
          onChange={(ev) => setF({ ...f, body: ev.target.value })}
        />
      </Row>
    </EditFrame>
  );
}

export function ProofEdit({ detail, part, backTo }: StepEditProps) {
  if (part === "entry") return <ProofEntryEdit detail={detail} backTo={backTo} />;

  if (part === "path")
    return (
      <Navigate
        to={`/entities/${detail.entity.id}/seasons?from=${encodeURIComponent(backTo)}`}
        replace
      />
    );
  return <Navigate to={backTo} replace />;
}

export const proofCheckPart: Record<string, string> = {
  path: "path",
  "proof-links": "entry",
};
