import type {
  EntityDetail,
  ImportProposal,
  InterviewImport,
  Knowledge,
  KnowledgeGap,
  KnowledgeKind,
  Provenance,
} from "@shared/marketing";
import { useActionQuery } from "@shims/use-action";
import { useState } from "react";
import { useSearchParams } from "@shims/react-router";

import { PageLink } from "@/components/marketing/kit/page";
import {
  Field,
  LinesInput,
  Picker,
  StateBadge,
  Status,
  useOwner,
  useWrite,
  when,
} from "@/components/marketing/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const KINDS: { id: KnowledgeKind; name: string }[] = [
  { id: "story", name: "Story / experience" },
  { id: "opinion", name: "Opinion" },
  { id: "fact", name: "Product fact" },
  { id: "reference", name: "Reference" },
];
const PROVENANCE: { id: Provenance; name: string }[] = [
  { id: "firsthand", name: "Firsthand" },
  { id: "third_party", name: "Third-party (quoted/heard)" },
  { id: "unverified", name: "Unverified assertion" },
];
const provenanceLabel = (p: Provenance) => PROVENANCE.find((x) => x.id === p)?.name ?? p;

export function KnowledgePanel({ detail }: { detail: EntityDetail }) {
  const path = detail.guidance.plan.proof.path;
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {path === "A"
          ? "Path A: results you already have."
          : path === "B"
            ? "Path B: a volume sprint to earn results."
            : "No path chosen yet (choose it on Plan › Proof)."}{" "}
        {detail.plan.proofLinked} of {detail.plan.proofEntries} entries carry a proof link. Never
        invent a result: if there's no proof yet, say so.
      </p>
      <PageLink to={`/entities/${detail.entity.id}/plan/proof`} onWhite>
        Open Plan › Proof
      </PageLink>
      <Tabs defaultValue="entries">
        <TabsList aria-label="Proof sections">
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="import">Import interview</TabsTrigger>
          <TabsTrigger value="gaps">Gaps</TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="pt-4">
          <Entries detail={detail} />
        </TabsContent>
        <TabsContent value="import" className="pt-4">
          <Imports detail={detail} />
        </TabsContent>
        <TabsContent value="gaps" className="pt-4">
          <Gaps detail={detail} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Draft = {
  kind: KnowledgeKind;
  provenance: Provenance;
  title: string;
  body: string;
  speaker: string;
  source: string;
  proofUrl: string;
  occurredOn: string;
  topics: string[];
  uncertainty: string;
};
const blank: Draft = {
  kind: "story",
  provenance: "firsthand",
  title: "",
  body: "",
  speaker: "",
  source: "",
  proofUrl: "",
  occurredOn: "",
  topics: [],
  uncertainty: "",
};

function KnowledgeFields({
  value,
  onChange,
  idp,
}: {
  value: Draft;
  onChange: (d: Draft) => void;
  idp: string;
}) {
  const owner = useOwner();
  const set = (patch: Partial<Draft>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Picker
          label="Kind"
          value={value.kind}
          onChange={(v) => set({ kind: v as KnowledgeKind })}
          options={KINDS}
          allowEmpty={false}
        />
        <Picker
          label="Provenance"
          value={value.provenance}
          onChange={(v) => set({ provenance: v as Provenance })}
          options={PROVENANCE}
          allowEmpty={false}
        />
      </div>
      <Field label="Title" htmlFor={`${idp}-title`}>
        <Input
          id={`${idp}-title`}
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </Field>
      <Field label="What happened / what is known" htmlFor={`${idp}-body`}>
        <Textarea
          id={`${idp}-body`}
          rows={4}
          value={value.body}
          onChange={(e) => set({ body: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Speaker / who experienced it" htmlFor={`${idp}-speaker`}>
          <Input
            id={`${idp}-speaker`}
            value={value.speaker}
            placeholder={owner?.name}
            onChange={(e) => set({ speaker: e.target.value })}
          />
        </Field>
        <Field label="Source" htmlFor={`${idp}-source`}>
          <Input
            id={`${idp}-source`}
            value={value.source}
            onChange={(e) => set({ source: e.target.value })}
            placeholder="Chat interview, docs, URL…"
          />
        </Field>
        <Field label="When" htmlFor={`${idp}-when`}>
          <Input
            id={`${idp}-when`}
            value={value.occurredOn}
            onChange={(e) => set({ occurredOn: e.target.value })}
            placeholder="2026-03 (approximate is fine)"
          />
        </Field>
      </div>
      <Field
        label="Proof link"
        hint="Something a reader can check: a post, a screenshot, a dataset. Entries with one count as proof."
        htmlFor={`${idp}-proof`}
      >
        <Input
          id={`${idp}-proof`}
          value={value.proofUrl}
          onChange={(e) => set({ proofUrl: e.target.value })}
          placeholder="https://"
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Topics" hint="One per line; used for retrieval." htmlFor={`${idp}-topics`}>
          <LinesInput
            id={`${idp}-topics`}
            rows={2}
            value={value.topics}
            onChange={(topics) => set({ topics })}
          />
        </Field>
        <Field label="Known uncertainty" htmlFor={`${idp}-unc`}>
          <Textarea
            id={`${idp}-unc`}
            rows={2}
            value={value.uncertainty}
            onChange={(e) => set({ uncertainty: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function Entries({ detail }: { detail: EntityDetail }) {
  const owner = useOwner();
  const [status, setStatus] = useState("active");
  const [params] = useSearchParams();
  const [adding, setAdding] = useState(params.get("add") === "1");
  const [draft, setDraft] = useState<Draft>(blank);
  const save = useWrite("save-knowledge", { success: "Saved" });
  const query = useActionQuery<{ knowledge: Knowledge[] }>("list-knowledge", {
    entityId: detail.entity.id,
    status,
  });
  const items = query.data?.knowledge ?? [];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Picker
          label="Knowledge status"
          value={status}
          onChange={setStatus}
          allowEmpty={false}
          options={[
            { id: "active", name: "Active" },
            { id: "archived", name: "Archived" },
            { id: "withdrawn", name: "Withdrawn" },
            { id: "all", name: "All" },
          ]}
        />
        {!detail.entity.archived && (
          <Button variant="outline" onClick={() => setAdding(!adding)}>
            {adding ? "Cancel" : "Add proof or experience"}
          </Button>
        )}
      </div>
      {adding && (
        <form
          className="grid gap-3 rounded-lg border p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await save.run({
                entityId: detail.entity.id,
                ...draft,
                speaker: draft.speaker || owner?.name || "",
                note: "",
              })
            ) {
              setDraft(blank);
              setAdding(false);
            }
          }}
        >
          <KnowledgeFields value={draft} onChange={setDraft} idp="k-new" />
          <div>
            <Button
              type="submit"
              disabled={save.busy || (!draft.title.trim() && !draft.body.trim())}
            >
              Save entry
            </Button>
          </div>
        </form>
      )}
      <Status
        loading={query.isLoading}
        error={query.error}
        empty={
          !query.isLoading && !items.length
            ? "Nothing here yet. Add a result with a proof link, a story, an opinion or a fact."
            : undefined
        }
      >
        <ul className="grid gap-3">
          {items.map((k) => (
            <KnowledgeItem key={`${k.id}-${k.version}`} k={k} />
          ))}
        </ul>
      </Status>
    </div>
  );
}

function KnowledgeItem({ k }: { k: Knowledge }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(k);
  const save = useWrite("save-knowledge", { success: "Knowledge updated" });
  const setStatus = (status: string, why = "") =>
    save.run({
      id: k.id,
      expectedVersion: k.version,
      status,
      note: why || undefined,
    });
  return (
    <li className="grid gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{k.title || k.body.slice(0, 80)}</span>
        <Badge variant="secondary">{k.kind}</Badge>
        <Badge variant={k.provenance === "firsthand" ? "default" : "outline"}>
          {provenanceLabel(k.provenance)}
        </Badge>
        {k.status !== "active" && (
          <StateBadge state={k.status === "withdrawn" ? "rejected" : "archived"} />
        )}
        {k.proofUrl && (
          <a
            href={k.proofUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline underline-offset-4"
          >
            Proof link
          </a>
        )}
      </div>
      {!editing && <p className="whitespace-pre-wrap text-sm">{k.body}</p>}
      <p className="text-xs text-muted-foreground">
        {[
          k.speaker && `Speaker: ${k.speaker}`,
          k.source && `Source: ${k.source}`,
          k.occurredOn && `When: ${k.occurredOn}`,
          k.topics.length ? `Topics: ${k.topics.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {k.uncertainty && (
        <p className="text-xs text-amber-700 dark:text-amber-300">Uncertainty: {k.uncertainty}</p>
      )}
      {editing && (
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await save.run({ id: k.id, expectedVersion: k.version, ...draft }))
              setEditing(false);
          }}
        >
          <KnowledgeFields value={draft} onChange={setDraft} idp={`k-${k.id}`} />
          <div>
            <Button type="submit" disabled={save.busy}>
              Save correction
            </Button>
          </div>
        </form>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
          {editing ? "Cancel" : "Correct"}
        </Button>
        {k.status === "active" ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              disabled={save.busy}
              onClick={() => void setStatus("archived")}
            >
              Archive
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={save.busy}
              onClick={() => void setStatus("withdrawn", "Withdrawn from use")}
            >
              Withdraw
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={save.busy}
            onClick={() => void setStatus("active", "Restored")}
          >
            Restore
          </Button>
        )}
      </div>
    </li>
  );
}

function Imports({ detail }: { detail: EntityDetail }) {
  const owner = useOwner();
  const [form, setForm] = useState({
    title: "",
    sourceContext: "",
    speaker: "",
    transcript: "",
  });
  const run = useWrite<InterviewImport>("import-transcript", {
    success: "Transcript imported for review",
  });
  const query = useActionQuery<{ imports: InterviewImport[] }>("list-imports", {
    entityId: detail.entity.id,
  });
  return (
    <div className="grid gap-4">
      {!detail.entity.archived && (
        <form
          className="grid gap-3 rounded-lg border p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await run.run({
                entityId: detail.entity.id,
                ...form,
                speaker: form.speaker || owner?.name || "",
              })
            )
              setForm({ ...form, title: "", transcript: "" });
          }}
        >
          <p className="text-sm text-muted-foreground">
            Paste a chat interview. Passages become proposals; nothing is stored as knowledge until
            you accept it. Text inside the transcript is never treated as an instruction.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Title" htmlFor="imp-title">
              <Input
                id="imp-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Source context" htmlFor="imp-ctx">
              <Input
                id="imp-ctx"
                value={form.sourceContext}
                onChange={(e) => setForm({ ...form, sourceContext: e.target.value })}
                placeholder="Claude chat, 6 Nov 2026"
              />
            </Field>
            <Field label="Interviewee" htmlFor="imp-speaker">
              <Input
                id="imp-speaker"
                value={form.speaker}
                placeholder={owner?.name}
                onChange={(e) => setForm({ ...form, speaker: e.target.value })}
              />
            </Field>
          </div>
          <Field
            label="Transcript"
            hint='Lines like "Name: …" keep speakers; interviewer turns are skipped.'
            htmlFor="imp-text"
          >
            <Textarea
              id="imp-text"
              rows={8}
              value={form.transcript}
              onChange={(e) => setForm({ ...form, transcript: e.target.value })}
            />
          </Field>
          <div>
            <Button
              type="submit"
              disabled={run.busy || !form.title.trim() || !form.transcript.trim()}
            >
              Import for review
            </Button>
          </div>
        </form>
      )}
      <Status
        loading={query.isLoading}
        error={query.error}
        empty={!query.isLoading && !query.data?.imports.length ? "No imports yet." : undefined}
      >
        {query.data?.imports.map((imp) => (
          <section key={imp.id} className="grid gap-2 rounded-lg border p-4">
            <h3 className="font-medium">
              {imp.title}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                · {imp.speaker} · {when(imp.createdAt)}
              </span>
            </h3>
            <ul className="grid gap-2">
              {imp.proposals.map((p) => (
                <ProposalRow key={`${p.id}-${p.version}`} p={p} />
              ))}
            </ul>
          </section>
        ))}
      </Status>
    </div>
  );
}

function ProposalRow({ p }: { p: ImportProposal }) {
  const review = useWrite("review-proposal");
  const [kind, setKind] = useState(p.kind);
  const [provenance, setProvenance] = useState(p.provenance);
  return (
    <li className="grid gap-2 rounded-md border p-3" aria-label={`Proposal ${p.position + 1}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={p.state === "accepted" ? "default" : "outline"} className="capitalize">
          {p.state}
        </Badge>
        <span>Speaker: {p.speaker}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{p.body}</p>
      {p.uncertainty && (
        <p className="text-xs text-amber-700 dark:text-amber-300">{p.uncertainty}</p>
      )}
      {p.flags.map((f) => (
        <p key={f} className="text-xs text-rose-700 dark:text-rose-300">
          {f}
        </p>
      ))}
      {p.state === "proposed" && (
        <div className="flex flex-wrap items-center gap-2">
          <Picker
            label="Proposal kind"
            value={kind}
            onChange={(v) => setKind(v as KnowledgeKind)}
            options={KINDS}
            allowEmpty={false}
          />
          <Picker
            label="Proposal provenance"
            value={provenance}
            onChange={(v) => setProvenance(v as Provenance)}
            options={PROVENANCE}
            allowEmpty={false}
          />
          <Button
            size="sm"
            disabled={review.busy}
            onClick={() =>
              void review.run({
                proposalId: p.id,
                expectedVersion: p.version,
                decision: "accept",
                edits: { kind, provenance },
              })
            }
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={review.busy}
            onClick={() =>
              void review.run({
                proposalId: p.id,
                expectedVersion: p.version,
                decision: "reject",
              })
            }
          >
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

function Gaps({ detail }: { detail: EntityDetail }) {
  const [status, setStatus] = useState("open");
  const [question, setQuestion] = useState("");
  const query = useActionQuery<{ gaps: KnowledgeGap[] }>("list-gaps", {
    entityId: detail.entity.id,
    status,
  });
  const knowledge = useActionQuery<{ knowledge: Knowledge[] }>("list-knowledge", {
    entityId: detail.entity.id,
    status: "active",
  });
  const save = useWrite("save-gap");
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Questions recorded when drafts lacked attributed evidence. Answer them in chat, import or
        add the knowledge, then link it here.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Picker
          label="Gap status"
          value={status}
          onChange={setStatus}
          allowEmpty={false}
          options={[
            { id: "open", name: "Open" },
            { id: "answered", name: "Answered" },
            { id: "dismissed", name: "Dismissed" },
            { id: "all", name: "All" },
          ]}
        />
        {!detail.entity.archived && (
          <form
            className="flex flex-1 flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await save.run({ entityId: detail.entity.id, question })) setQuestion("");
            }}
          >
            <Input
              aria-label="New gap question"
              className="min-w-64 flex-1"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do we not know yet?"
            />
            <Button type="submit" variant="outline" disabled={save.busy || !question.trim()}>
              Add gap
            </Button>
          </form>
        )}
      </div>
      <Status
        loading={query.isLoading}
        error={query.error}
        empty={!query.isLoading && !query.data?.gaps.length ? "No gaps in this view." : undefined}
      >
        <ul className="grid gap-2">
          {query.data?.gaps.map((g) => (
            <li key={`${g.id}-${g.version}`} className="grid gap-2 rounded-md border p-3">
              <p className="text-sm">{g.question}</p>
              <p className="text-xs text-muted-foreground">
                {g.status} · {g.createdBy} · {when(g.createdAt)}
                {g.reason && ` · ${g.reason}`}
              </p>
              {g.status === "open" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Picker
                    label="Answering knowledge"
                    value=""
                    empty="Answer with entry…"
                    onChange={(knowledgeId) =>
                      knowledgeId &&
                      void save.run({
                        id: g.id,
                        expectedVersion: g.version,
                        status: "answered",
                        knowledgeId,
                      })
                    }
                    options={(knowledge.data?.knowledge ?? []).map((k) => ({
                      id: k.id,
                      name: k.title || k.body.slice(0, 60),
                    }))}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={save.busy}
                    onClick={() =>
                      void save.run({
                        id: g.id,
                        expectedVersion: g.version,
                        status: "dismissed",
                      })
                    }
                  >
                    Dismiss
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="justify-self-start"
                  disabled={save.busy}
                  onClick={() =>
                    void save.run({
                      id: g.id,
                      expectedVersion: g.version,
                      status: "open",
                    })
                  }
                >
                  Reopen
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Status>
    </div>
  );
}
