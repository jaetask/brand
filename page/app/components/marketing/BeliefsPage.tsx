import { themeTitle, type EntityDetail, type IdentityStatement } from "@shared/marketing";
import { useActionQuery } from "@shims/use-action";
import { useState } from "react";
import { useNavigate } from "@shims/react-router";

import {
  ChipPicker,
  EditFrame,
  EmptyCard,
  ListCard,
  ListRow,
  PageBody,
  PageLink,
  Panel,
  Row,
  chip,
  greyButton,
  greyButtonOnWhite,
  muted,
} from "@/components/marketing/kit/page";
import { useBackTo } from "@/components/marketing/plan/kit";
import { Picker, Status, useWrite, when } from "@/components/marketing/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type List = { statements: IdentityStatement[]; counts: Record<string, number> };

const credit = (s: Pick<IdentityStatement, "credit">) =>
  s.credit === "own" || !s.credit ? "Own" : s.credit;
const linePath = (entityId: string, id: string) => `/entities/${entityId}/beliefs/line/${id}`;

export function BeliefsPage({ detail }: { detail: EntityDetail }) {
  const e = detail.entity;
  const query = useActionQuery<List>("list-identity-statements", {
    entityId: e.id,
    status: "all",
  });
  const all = query.data?.statements ?? [];
  const yours = all.filter((s) => s.status === "accepted");
  const suggested = all.filter((s) => s.status === "suggested");
  const [view, setView] = useState<"yours" | "suggested">("yours");
  const [theme, setTheme] = useState("");
  const pool = view === "yours" ? yours : suggested;
  const themes = [...new Set(pool.flatMap((s) => s.themes))].sort();
  const shown = pool.filter((s) => !theme || s.themes.includes(theme));
  return (
    <PageBody>
      <Panel
        id="lines"
        title="Your lines"
        subtitle={`Short, quotable lines that define ${e.name}'s character, with credit where an idea is someone else's.`}
        action={
          <PageLink to={linePath(e.id, "new")} disabled={e.archived}>
            New line
          </PageLink>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <ChipPicker
            label="Which lines"
            value={view}
            onChange={(v) => {
              setView(v);
              setTheme("");
            }}
            options={[
              { id: "yours", name: `Yours ${yours.length}` },
              { id: "suggested", name: `Suggested ${suggested.length}` },
            ]}
          />
          {themes.length > 0 && (
            <Picker
              label="Theme"
              value={theme}
              onChange={setTheme}
              empty="All themes"
              options={themes.map((t) => ({ id: t, name: t }))}
            />
          )}
        </div>
        <Status loading={query.isLoading} error={query.error}>
          {shown.length ? (
            <ListCard>
              {shown.map((s) => (
                <ListRow key={s.id} to={linePath(e.id, s.id)}>
                  <span className="text-[15px] font-semibold leading-snug">{s.line}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {s.themes.map((t) => (
                      <span key={t} className={chip}>
                        {t}
                      </span>
                    ))}
                    <span className={cn(chip, muted)}>{credit(s)}</span>
                  </span>
                </ListRow>
              ))}
            </ListCard>
          ) : (
            <EmptyCard
              text={
                view === "yours"
                  ? "No lines yet. Add one, or accept a suggestion."
                  : "No suggestions waiting."
              }
              action={
                view === "yours" ? (
                  <PageLink to={linePath(e.id, "new")} disabled={e.archived}>
                    New line
                  </PageLink>
                ) : undefined
              }
            />
          )}
        </Status>
      </Panel>
      {suggested.length > 0 && (
        <Suggestions
          items={suggested}
          onDone={() => void query.refetch()}
          disabled={e.archived}
          entityId={e.id}
        />
      )}
    </PageBody>
  );
}

function Suggestions({
  items,
  onDone,
  disabled,
  entityId,
}: {
  items: IdentityStatement[];
  onDone: () => void;
  disabled: boolean;
  entityId: string;
}) {
  const accept = useWrite("accept-identity-statement", { success: "Accepted" });
  const reject = useWrite("reject-identity-statement", { success: "Rejected" });
  return (
    <Panel
      id="suggested"
      title="Suggested"
      subtitle="Lines an agent suggested. Nothing is yours until you accept it."
    >
      <ListCard>
        {items.map((s) => (
          <ListRow
            key={s.id}
            to={linePath(entityId, s.id)}
            aside={
              !disabled && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className={greyButtonOnWhite}
                    disabled={accept.busy}
                    onClick={async () =>
                      (await accept.run({
                        id: s.id,
                        expectedVersion: s.version,
                        note: "",
                      })) && onDone()
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={greyButtonOnWhite}
                    disabled={reject.busy}
                    onClick={async () =>
                      (await reject.run({
                        id: s.id,
                        expectedVersion: s.version,
                        note: "",
                      })) && onDone()
                    }
                  >
                    Reject
                  </Button>
                </>
              )
            }
          >
            <span className="text-[15px] font-semibold leading-snug">{s.line}</span>
            <span className={cn("text-[13px]", muted)}>
              Suggested by {s.suggestedBy} · {when(s.createdAt)}
            </span>
          </ListRow>
        ))}
      </ListCard>
    </Panel>
  );
}

export function BeliefLinePage({ detail, lineId }: { detail: EntityDetail; lineId: string }) {
  const backTo = useBackTo(`/entities/${detail.entity.id}/beliefs`);
  const query = useActionQuery<List>(
    "list-identity-statements",
    { entityId: detail.entity.id, status: "all" },
    { enabled: lineId !== "new" },
  );
  const statement =
    lineId === "new" ? undefined : query.data?.statements.find((s) => s.id === lineId);
  if (lineId !== "new" && query.isLoading) return <Status loading>{null}</Status>;
  if (lineId !== "new" && !statement)
    return (
      <EmptyCard
        text="That line isn't here any more."
        action={<PageLink to={backTo}>Back</PageLink>}
      />
    );
  return (
    <LineForm
      key={statement ? `${statement.id}-${statement.version}` : "new"}
      detail={detail}
      statement={statement}
      backTo={backTo}
    />
  );
}

function LineForm({
  detail,
  statement,
  backTo,
}: {
  detail: EntityDetail;
  statement?: IdentityStatement;
  backTo: string;
}) {
  const navigate = useNavigate();
  const save = useWrite<IdentityStatement>("save-identity-statement", {
    success: statement ? "Line saved" : "Line added",
  });
  const a = detail.guidance.plan.association;
  const themes = [
    ...new Set(
      [
        ...a.amplify.map(themeTitle),
        ...a.antiBrand.map((x) => x.item),
        ...(statement?.themes ?? []),
      ].filter(Boolean),
    ),
  ];
  const [d, setD] = useState({
    line: statement?.line ?? "",
    credit: statement?.credit ?? "own",
    creditUrl: statement?.creditUrl ?? "",
    thought: statement?.thought ?? "",
    themes: statement?.themes ?? [],
  });
  const toggle = (t: string) =>
    setD({
      ...d,
      themes: d.themes.includes(t) ? d.themes.filter((x) => x !== t) : [...d.themes, t],
    });
  const submit = async () => {
    const r = await save.run(
      statement
        ? {
            id: statement.id,
            expectedVersion: statement.version,
            ...d,
            note: "",
          }
        : { entityId: detail.entity.id, ...d, note: "" },
    );
    if (r) navigate(backTo);
  };
  const setStatus = async (status: string) => {
    if (
      statement &&
      (await save.run({
        id: statement.id,
        expectedVersion: statement.version,
        status,
        note: "",
      }))
    )
      navigate(backTo);
  };
  const statusAction =
    statement?.status === "suggested"
      ? ["accepted", "Accept"]
      : statement?.status === "accepted"
        ? ["retired", "Retire"]
        : statement
          ? ["accepted", "Restore"]
          : null;
  return (
    <EditFrame
      title={statement ? "Line" : "New line"}
      description={
        statement
          ? `${statement.status[0].toUpperCase()}${statement.status.slice(1)}${statement.suggestedBy && statement.status === "suggested" ? `, suggested by ${statement.suggestedBy}` : ""}.`
          : "Short and quotable, in your own words."
      }
      backTo={backTo}
      busy={save.busy}
      onSave={() => void (d.line.trim() ? submit() : undefined)}
      extra={
        statusAction && !detail.entity.archived ? (
          <Button
            type="button"
            variant="ghost"
            className={greyButtonOnWhite}
            disabled={save.busy}
            onClick={() => void setStatus(statusAction[0])}
          >
            {statusAction[1]}
          </Button>
        ) : undefined
      }
    >
      <Row title="The line" line="Short and quotable." htmlFor="line-text">
        <Textarea
          id="line-text"
          rows={2}
          value={d.line}
          onChange={(v) => setD({ ...d, line: v.target.value })}
          className="text-[15px] font-semibold"
        />
      </Row>
      <Row title="Credit" line={'"own", or who it comes from.'} htmlFor="line-credit">
        <Input
          id="line-credit"
          value={d.credit}
          onChange={(v) => setD({ ...d, credit: v.target.value })}
        />
        <Input
          aria-label="Credit link"
          value={d.creditUrl}
          onChange={(v) => setD({ ...d, creditUrl: v.target.value })}
          placeholder="Credit link (optional), https://"
        />
      </Row>
      <Row title="The thought behind it" line="In your own words." htmlFor="line-thought">
        <Textarea
          id="line-thought"
          rows={5}
          value={d.thought}
          onChange={(v) => setD({ ...d, thought: v.target.value })}
        />
      </Row>
      {themes.length > 0 && (
        <Row title="Themes" line="What it supports.">
          <div className="flex flex-wrap gap-1.5">
            {themes.map((t) => (
              <Button
                key={t}
                type="button"
                variant="ghost"
                aria-pressed={d.themes.includes(t)}
                onClick={() => toggle(t)}
                className={cn(
                  "h-auto max-w-full whitespace-normal rounded-full px-3 py-1.5 text-left text-[13px] font-semibold",
                  d.themes.includes(t)
                    ? "bg-[var(--p-1f2328)] text-[var(--p-on-ink)] hover:bg-[var(--p-1f2328)]"
                    : greyButton,
                )}
              >
                {t}
              </Button>
            ))}
          </div>
        </Row>
      )}
    </EditFrame>
  );
}
