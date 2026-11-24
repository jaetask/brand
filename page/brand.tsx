import {
  CenteredPage,
  EditLink,
  Facts,
  ListCard,
  ListRow,
  PageBody,
  PageLink,
  Panel,
  PrimaryLink,
  StatusDot,
} from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Card } from "@jaetask/toolkit/ui/card";
import { Progress } from "@jaetask/toolkit/ui/progress";
import type { ReactNode } from "react";
import {
  type Actor,
  type Detail,
  type Identity,
  type LevelStatus,
  PERSON_TEST_TITLES,
  PERSON_TESTS,
  type PlanLevel,
  type Proof,
  useRead,
} from "./api.js";
import { BrandMark } from "./brands.js";
import { EditPage } from "./edit.js";
import { act, NothingYet, day, Empty, Label, Muted, Pill, Text } from "./look.js";
import { addDays, checkIns, currentSeason, seasonDay, SEASON_BANDS, today } from "./season.js";

export const HOEEM = "https://x.com/hooeem/status/2120955142438834287";

const STEP_COPY: Record<PlanLevel, { lead: string; line: string }> = {
  proof: {
    lead: "Without proof, everything after is opinion.",
    line: "When content is easy to make, real work, results and mistakes are what people trust.",
  },
  person: {
    lead: "One sentence about who it's for decides everything else.",
    line: "Your topics, examples, products and who you stand next to all follow from it.",
  },
  association: {
    lead: "People learn what to expect from you through repetition.",
    line: "The topics, tools, people and look they keep seeing.",
  },
  product: {
    lead: "Marketing says what you promise. The free thing proves it.",
    line: "Ship something free that does exactly what its hook says.",
  },
  belt: {
    lead: "A public project with a result, a date and visible progress.",
    line: "It gives people a reason to come back every week.",
  },
};

const percent = (l: LevelStatus) =>
  l.items.length ? Math.round((l.done.length / l.items.length) * 100) : 0;

const progress = (l: LevelStatus) =>
  l.state === "done" ? "done" : l.state === "partial" ? "in-progress" : "not-started";

export function BrandPage({ id, parts }: { id: string; parts: string[] }) {
  const detail = useRead<Detail>("brand-read", { brand: id });
  const actors = useRead<Actor[]>("actor-list", {}) ?? [];
  if (!detail)
    return (
      <CenteredPage title="Loading the brand" line="">
        {null}
      </CenteredPage>
    );
  const [section = "plan", sub, more] = parts;
  const name = (by: string) => actors.find((a) => a.id === by)?.name ?? by;
  if (section === "edit") return <EditPage detail={detail} part={sub ?? ""} arg={more} />;
  if (section === "profile") return <ProfileView d={detail} />;
  if (section === "beliefs") return <BeliefsView d={detail} name={name} />;
  if (section === "voice") return <VoiceView d={detail} />;
  if (section === "seasons") return <SeasonsView d={detail} />;
  if (section === "plan" && sub) return <StepView d={detail} level={sub as PlanLevel} />;
  return <OverviewView d={detail} />;
}

const base = (d: Detail) => `/b/${d.brand.id}`;

function ProfileView({ d }: { d: Detail }) {
  const b = d.brand;
  return (
    <PageBody
      title="Profile"
      line={`Who ${b.name} is, who it's for, and where it posts.`}
      action={<EditLink to={`${base(d)}/edit/profile`} />}
    >
      <Panel id="who" title="Who you are" action={<EditLink to={`${base(d)}/edit/profile`} />}>
        <Card className="grid gap-4 p-5">
          <div className="flex items-center gap-4">
            <BrandMark brand={b} size={56} />
            <div className="grid">
              <span className="text-lg font-semibold">{b.name}</span>
              <Muted>Since {day(b.createdAt)}</Muted>
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Purpose</Label>
            {b.purpose ? <Text>{b.purpose}</Text> : <Empty>No purpose yet.</Empty>}
          </div>
          <div className="grid gap-1">
            <Label>Goals</Label>
            {b.goals.length ? (
              <ul className="m-0 grid gap-1 pl-5">
                {b.goals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            ) : (
              <Empty>No goals yet.</Empty>
            )}
          </div>
          <div className="grid gap-1">
            <Label>Intended audiences</Label>
            {b.audiences.length ? (
              <ul className="m-0 grid gap-1 pl-5">
                {b.audiences.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : (
              <Empty>No audiences yet.</Empty>
            )}
          </div>
        </Card>
      </Panel>
      {(b.images?.length ?? 0) > 0 && (
        <Panel id="images" title="Brand images">
          <div className="flex flex-wrap gap-3">
            {b.images?.map((src, i) => (
              <img
                key={src.slice(-32) + String(i)}
                src={src}
                alt={`${b.name} ${i + 1}`}
                className="h-28 w-28 rounded-lg border object-cover"
              />
            ))}
          </div>
        </Panel>
      )}
      <Panel
        id="where"
        title="Where you post"
        line="Channels, the accounts on them, and the peers each account learns from."
        action={<PageLink to={`${base(d)}/edit/channel`}>Add channel</PageLink>}
      >
        {d.channels.length ? (
          <div className="grid gap-4">
            {d.channels.map((c) => {
              const accounts = d.accounts.filter((a) => a.channelId === c.id);
              return (
                <Card key={c.id} className="grid gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="grid">
                      <span className="font-medium">{c.name}</span>
                      <Muted>
                        {c.kind}
                        {c.url ? ` · ${c.url}` : ""}
                      </Muted>
                    </div>
                    <div className="flex gap-2">
                      <EditLink to={`${base(d)}/edit/channel/${c.id}`} />
                      <PageLink to={`${base(d)}/edit/account?channel=${c.id}`}>
                        Add account
                      </PageLink>
                    </div>
                  </div>
                  {c.description && <Text>{c.description}</Text>}
                  {accounts.map((a) => (
                    <div key={a.id} className="grid gap-2 rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="grid">
                          <span className="font-medium">
                            {a.name}{" "}
                            {a.handle && <span className="text-muted-foreground">@{a.handle}</span>}
                          </span>
                          <Muted>{[a.role, a.url].filter(Boolean).join(" · ")}</Muted>
                        </div>
                        <EditLink to={`${base(d)}/edit/account/${a.id}`} />
                      </div>
                      {(a.persona.tone || a.persona.audience) && (
                        <Facts
                          items={[
                            ...(a.persona.tone ? [{ label: "Tone", value: a.persona.tone }] : []),
                            ...(a.persona.audience
                              ? [{ label: "Audience", value: a.persona.audience }]
                              : []),
                            ...(a.persona.traits.length
                              ? [{ label: "Traits", value: a.persona.traits.join(", ") }]
                              : []),
                            ...(a.persona.topics.length
                              ? [{ label: "Topics", value: a.persona.topics.join(", ") }]
                              : []),
                          ]}
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <Label>Peers</Label>
                        <PageLink to={`${base(d)}/edit/peer/${a.id}`}>Add peer</PageLink>
                      </div>
                      {a.peers.filter((p) => p.status === "active").length ? (
                        <ListCard>
                          {a.peers
                            .filter((p) => p.status === "active")
                            .map((p) => (
                              <ListRow
                                key={p.id}
                                aside={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      void act("peer-remove", { peer: p.id }, "Removed")
                                    }
                                  >
                                    Remove
                                  </Button>
                                }
                              >
                                <span className="grid">
                                  <span>
                                    {p.name || p.handle}{" "}
                                    <span className="text-muted-foreground">@{p.handle}</span>
                                    {p.sector && (
                                      <span className="text-muted-foreground"> · {p.sector}</span>
                                    )}
                                  </span>
                                  {p.reason && (
                                    <small className="text-muted-foreground">{p.reason}</small>
                                  )}
                                </span>
                              </ListRow>
                            ))}
                        </ListCard>
                      ) : (
                        <Empty>No peers yet.</Empty>
                      )}
                    </div>
                  ))}
                </Card>
              );
            })}
          </div>
        ) : (
          <NothingYet
            text="No channels yet. Add where this brand posts."
            action={<PrimaryLink to={`${base(d)}/edit/channel`}>Add channel</PrimaryLink>}
          />
        )}
      </Panel>
      <Panel
        id="danger"
        title="Archive"
        line="Archive takes the brand out of the sidebar and keeps everything."
      >
        <div>
          <Button
            variant="outline"
            onClick={() =>
              void act("brand-archive", { brand: d.brand.id }, "Archived").then(() => {
                window.location.hash = "/brands";
              })
            }
          >
            Archive {d.brand.name}
          </Button>
        </div>
      </Panel>
    </PageBody>
  );
}

function IdentityRow({ i, d, name }: { i: Identity; d: Detail; name: (id: string) => string }) {
  const status = (s: Identity["status"], label: string) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void act("identity-status-set", { identity: i.id, status: s }, label)}
    >
      {label}
    </Button>
  );
  return (
    <ListRow
      aside={
        <>
          {i.status === "suggested" && status("accepted", "Accept")}
          {i.status === "suggested" && status("rejected", "Reject")}
          {i.status === "accepted" && status("retired", "Retire")}
          {(i.status === "retired" || i.status === "rejected") && status("accepted", "Bring back")}
          <EditLink to={`${base(d)}/edit/identity/${i.id}`} />
        </>
      }
    >
      <span className="grid gap-1">
        <span className="font-medium">“{i.line}”</span>
        <small className="text-muted-foreground">
          {i.credit && i.credit !== "own" ? `Credit: ${i.credit}` : "Your own"}
          {i.status === "suggested" ? ` · suggested by ${name(i.suggestedBy)}` : ""}
        </small>
        {i.thought && <small>{i.thought}</small>}
        {i.themes.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {i.themes.map((t) => (
              <Pill key={t}>{t.length > 60 ? `${t.slice(0, 60)}…` : t}</Pill>
            ))}
          </span>
        )}
      </span>
    </ListRow>
  );
}

function BeliefsView({ d, name }: { d: Detail; name: (id: string) => string }) {
  const by = (s: Identity["status"]) => d.identity.filter((i) => i.status === s);
  const yours = by("accepted");
  const suggested = by("suggested");
  const past = [...by("retired"), ...by("rejected")];
  return (
    <PageBody
      title="What you believe"
      line={`Short, quotable lines that define ${d.brand.name}'s character, with credit where an idea is someone else's.`}
      action={<PrimaryLink to={`${base(d)}/edit/identity`}>New line</PrimaryLink>}
    >
      <Panel id="yours" title={`Your lines · ${yours.length}`}>
        {yours.length ? (
          <ListCard>
            {yours.map((i) => (
              <IdentityRow key={i.id} i={i} d={d} name={name} />
            ))}
          </ListCard>
        ) : (
          <NothingYet
            text="No lines yet."
            action={<PrimaryLink to={`${base(d)}/edit/identity`}>New line</PrimaryLink>}
          />
        )}
      </Panel>
      <Panel
        id="suggested"
        title={`Suggested · ${suggested.length}`}
        line="Lines an agent suggested. Accept the ones that sound like you."
      >
        {suggested.length ? (
          <ListCard>
            {suggested.map((i) => (
              <IdentityRow key={i.id} i={i} d={d} name={name} />
            ))}
          </ListCard>
        ) : (
          <Muted>Nothing suggested.</Muted>
        )}
      </Panel>
      {past.length > 0 && (
        <Panel id="past" title={`Retired and rejected · ${past.length}`}>
          <ListCard>
            {past.map((i) => (
              <IdentityRow key={i.id} i={i} d={d} name={name} />
            ))}
          </ListCard>
        </Panel>
      )}
    </PageBody>
  );
}

function Swatch({ colour }: { colour: string }) {
  const hex = /^#[0-9a-fA-F]{3,8}$/.test(colour.trim());
  return (
    <span className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      {hex && (
        <span
          aria-hidden
          className="inline-block h-5 w-5 rounded border"
          style={{ background: colour.trim() }}
        />
      )}
      {colour}
    </span>
  );
}

function VoiceView({ d }: { d: Detail }) {
  const g = d.guidance;
  const v = g.voice;
  const e = (part: string) => <EditLink to={`${base(d)}/edit/${part}`} />;
  return (
    <PageBody
      title="Voice and look"
      line={`How ${d.brand.name} sounds, what it stands by, and how it looks.`}
    >
      <Panel id="voice" title="How you sound" action={e("voice")}>
        <Card className="grid gap-4 p-5">
          <div className="grid gap-1">
            <Label>Key phrases</Label>
            {v?.keyPhrases.length ? (
              <span className="flex flex-wrap gap-2">
                {v.keyPhrases.map((p) => (
                  <Pill key={p}>{p}</Pill>
                ))}
              </span>
            ) : (
              <Empty>None yet.</Empty>
            )}
          </div>
          <div className="grid gap-1">
            <Label>Borrowed phrases, always credited</Label>
            {v?.borrowedPhrases.length ? (
              <ul className="m-0 grid gap-1 pl-5">
                {v.borrowedPhrases.map((b) => (
                  <li key={b.phrase}>
                    “{b.phrase}” <span className="text-muted-foreground">({b.from})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>None yet.</Empty>
            )}
          </div>
          <div className="grid gap-1">
            <Label>Tone</Label>
            {v?.toneRules ? <Text>{v.toneRules}</Text> : <Empty>No tone rules yet.</Empty>}
          </div>
          <div className="grid gap-1">
            <Label>Example in your words</Label>
            {v?.example ? <Text>“{v.example}”</Text> : <Empty>No example yet.</Empty>}
          </div>
          <div className="grid gap-1">
            <Label>Verbal style</Label>
            {g.verbalStyle ? <Text>{g.verbalStyle}</Text> : <Empty>No verbal style yet.</Empty>}
          </div>
        </Card>
      </Panel>
      <Panel
        id="promise"
        title="Audience promise"
        line="What your audience can count on from you."
        action={e("promise")}
      >
        <Card className="p-5">
          {g.audiencePromise ? <Text>{g.audiencePromise}</Text> : <Empty>No promise yet.</Empty>}
        </Card>
      </Panel>
      <Panel id="principles" title="Principles and conduct" action={e("principles")}>
        <Card className="grid gap-4 p-5">
          <ol className="m-0 grid gap-1 pl-5">
            {g.principles.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          <div className="grid gap-1">
            <Label>Conduct</Label>
            {g.conduct ? <Text>{g.conduct}</Text> : <Empty>No conduct notes yet.</Empty>}
          </div>
        </Card>
      </Panel>
      <Panel id="look" title="How you look" line="Colours, type and logos." action={e("look")}>
        <Card className="grid gap-4 p-5">
          <div className="grid gap-2">
            <Label>Colours</Label>
            {g.visual.colours.length ? (
              <div className="flex flex-wrap gap-2">
                {g.visual.colours.map((c) => (
                  <Swatch key={c} colour={c} />
                ))}
              </div>
            ) : (
              <Empty>No colours yet.</Empty>
            )}
          </div>
          <div className="grid gap-1">
            <Label>Typography</Label>
            {g.visual.typography ? <Text>{g.visual.typography}</Text> : <Empty>Not set.</Empty>}
          </div>
          <div className="grid gap-1">
            <Label>Logos</Label>
            {g.visual.logos.length ? (
              <ul className="m-0 grid gap-1 pl-5">
                {g.visual.logos.map((l) => (
                  <li key={l} className="[overflow-wrap:anywhere]">
                    {l}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No logos yet.</Empty>
            )}
          </div>
          <div className="grid gap-1">
            <Label>Visual constants (step 3)</Label>
            {g.plan.association.visualConstants.length ? (
              <ul className="m-0 grid gap-1 pl-5">
                {g.plan.association.visualConstants.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : (
              <Empty>None yet.</Empty>
            )}
          </div>
        </Card>
      </Panel>
    </PageBody>
  );
}

function SeasonHeader({ d }: { d: Detail }) {
  const s = currentSeason(d.seasons);
  if (!s) return null;
  const st = seasonDay(s);
  const belt = d.guidance.plan.belt;
  const apps = belt.apps ?? [];
  const target = s.target ?? (Number(belt.target.match(/\d+/)?.[0]) || null);
  const live = apps.filter((a) => a.status === "public").length;
  return (
    <Card className="grid gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="grid">
          <Label>Season {s.n}</Label>
          <span className="text-lg font-semibold">{s.goal || belt.project || "No goal yet"}</span>
          <Muted>
            {day(s.start)} – {day(s.end)}
          </Muted>
        </div>
        <EditLink to={`${base(d)}/edit/season/${s.n}`} />
      </div>
      <Facts
        items={[
          {
            label: "Day",
            value: st.day
              ? `${st.day} of ${st.length} · ${st.length - st.day} days to go`
              : `Starts in ${st.startsIn} days`,
          },
          ...(target
            ? [{ label: "Goal", value: `${live} of ${target} public · by ${day(s.end)}` }]
            : []),
          {
            label: "Path",
            value:
              s.path === "A"
                ? "A · Outcome flex: show results you already have"
                : s.path === "B"
                  ? "B · Volume sprint: post a lot for 30 days to earn results"
                  : "Not chosen",
          },
        ]}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        {SEASON_BANDS.map((band) => {
          const now = st.day !== null && st.day >= band.from && st.day <= band.to;
          return (
            <div key={band.label} className={`grid rounded-lg border p-3 ${now ? "bg-muted" : ""}`}>
              <span className="text-sm font-medium">{band.label}</span>
              <small className="text-muted-foreground">
                Days {band.from}–{band.to} · {day(addDays(s.start, band.from - 1))} –{" "}
                {day(addDays(s.start, Math.min(band.to, st.length) - 1))}
                {now ? " · today" : ""}
              </small>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function OverviewView({ d }: { d: Detail }) {
  const levels = d.plan.levels;
  const done = levels.filter((l) => l.state === "done").length;
  const next = levels.find((l) => l.state !== "done");
  const nextItem = next?.items.find((i) => !i.ok);
  return (
    <PageBody
      title="Overview"
      line={`${d.brand.name}'s plan: hoeem's five steps, one season at a time.`}
    >
      <Panel
        id="season"
        title="This season"
        action={<PageLink to={`${base(d)}/seasons`}>All seasons</PageLink>}
      >
        <SeasonHeader d={d} />
      </Panel>
      <Panel id="steps" title="Your five steps" line={`${done} of 5 done.`}>
        <ListCard>
          {levels.map((l) => (
            <ListRow
              key={l.level}
              to={`${base(d)}/plan/${l.level}`}
              aside={<StatusDot status={progress(l)} />}
            >
              <span className="grid gap-1">
                <span className="font-medium">
                  Step {l.n} · {l.title}
                </span>
                <small className="text-muted-foreground">
                  {l.state === "done"
                    ? `${percent(l)}% · done · ${l.items.length} of ${l.items.length} in place`
                    : `${percent(l)}% · next: ${l.items.find((i) => !i.ok)?.label ?? ""}`}
                </small>
              </span>
            </ListRow>
          ))}
        </ListCard>
      </Panel>
      {next && nextItem && (
        <Panel id="next" title="Next">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <span className="grid">
              <span className="font-medium">{nextItem.label}</span>
              <Muted>
                Step {next.n}, {next.title} · {next.done.length} of {next.items.length} so far
              </Muted>
            </span>
            <PrimaryLink to={`${base(d)}/plan/${next.level}`}>Open {next.title}</PrimaryLink>
          </Card>
        </Panel>
      )}
      <Panel
        id="beliefs"
        title="What you believe"
        line={`${d.plan.identityAccepted} lines, ${d.plan.identitySuggested} suggested.`}
      >
        <div>
          <PageLink to={`${base(d)}/beliefs`}>Open your lines</PageLink>
        </div>
      </Panel>
    </PageBody>
  );
}

function DoneWhen({ l }: { l: LevelStatus }) {
  return (
    <Card className="grid gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <Label>Done when</Label>
        <Muted>
          {l.done.length} of {l.items.length} checks passed
        </Muted>
      </div>
      <Progress value={percent(l)} aria-label={`${l.title} ${percent(l)}%`} />
      <ul className="m-0 grid gap-1 p-0">
        {l.items.map((i) => (
          <li key={i.key} className="flex items-center gap-2 text-sm">
            <StatusDot status={i.ok ? "done" : "not-started"} />
            <span className={i.ok ? "" : "text-muted-foreground"}>{i.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function StepNav({ d, level }: { d: Detail; level: PlanLevel }) {
  return (
    <nav aria-label="Plan steps" className="flex flex-wrap gap-2">
      {d.plan.levels.map((l) => (
        <PageLink key={l.level} to={`${base(d)}/plan/${l.level}`} disabled={l.level === level}>
          {l.n} {l.title} · {l.state === "done" ? "done" : `${percent(l)}%`}
        </PageLink>
      ))}
    </nav>
  );
}

function StepView({ d, level }: { d: Detail; level: PlanLevel }) {
  const l = d.plan.levels.find((x) => x.level === level);
  if (!l) return <OverviewView d={d} />;
  const copy = STEP_COPY[level];
  return (
    <PageBody title={`${l.n} · ${l.title}`} line={`Step ${l.n} of 5 · ${copy.lead}`}>
      <StepNav d={d} level={level} />
      <Panel id="why" title={copy.lead} line={copy.line}>
        <div>
          <a href={HOEEM} target="_blank" rel="noreferrer" className="text-sm underline">
            hoeem's guide
          </a>
        </div>
      </Panel>
      <Panel id="done-when" title="Done when">
        <DoneWhen l={l} />
      </Panel>
      {level === "proof" && <ProofStep d={d} />}
      {level === "person" && <PersonStep d={d} />}
      {level === "association" && <AssociationStep d={d} />}
      {level === "product" && <ProductStep d={d} />}
      {level === "belt" && <BeltStep d={d} />}
    </PageBody>
  );
}

const countsAsProof = (p: Proof) => /^\s*https?:\/\/\S+/i.test(p.proofUrl) && p.linkOk !== false;

function ProofRow({ p, d }: { p: Proof; d: Detail }) {
  return (
    <ListRow aside={<EditLink to={`${base(d)}/edit/proof/${p.id}`} />}>
      <span className="grid gap-1">
        <span className="font-medium">{p.title}</span>
        <small className="text-muted-foreground">
          {p.kind} · {p.provenance.replace("_", " ")}
          {p.speaker ? ` · ${p.speaker}` : ""}
          {p.occurredOn ? ` · ${day(p.occurredOn)}` : ""}
          {p.status !== "active" ? ` · ${p.status}` : ""}
        </small>
        {p.body && p.body !== p.title && <small>{p.body}</small>}
        {p.proofUrl && (
          <a
            href={p.proofUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline [overflow-wrap:anywhere]"
          >
            {p.proofUrl}
          </a>
        )}
      </span>
    </ListRow>
  );
}

function ProofStep({ d }: { d: Detail }) {
  const path = d.guidance.plan.proof.path;
  const active = d.proof.filter((p) => p.status === "active");
  const own = active.filter((p) => p.provenance === "firsthand");
  const counted = own.filter(countsAsProof);
  const waiting = own.filter((p) => !countsAsProof(p));
  const others = active.filter((p) => p.provenance !== "firsthand");
  const old = d.proof.filter((p) => p.status !== "active");
  return (
    <>
      <Panel
        id="path"
        title="Your path"
        line="Chosen once per season."
        action={<EditLink to={`${base(d)}/edit/path`} />}
      >
        <Card className="p-5">
          {path === "A" ? (
            <Text>A · Outcome flex: show results you already have.</Text>
          ) : path === "B" ? (
            <Text>B · Volume sprint: no results yet, so post a lot for 30 days to earn them.</Text>
          ) : (
            <Empty>No path chosen yet.</Empty>
          )}
        </Card>
      </Panel>
      <Panel
        id="counts"
        title="Proof that counts"
        line={`${counted.length} of ${d.plan.proofNeeded} needed this season. An entry counts once it has a link anyone can open.`}
        action={<PrimaryLink to={`${base(d)}/edit/proof`}>New proof</PrimaryLink>}
      >
        {counted.length ? (
          <ListCard>
            {counted.map((p) => (
              <ProofRow key={p.id} p={p} d={d} />
            ))}
          </ListCard>
        ) : (
          <Muted>Nothing counts yet.</Muted>
        )}
      </Panel>
      <Panel
        id="needs-link"
        title="Needs a link"
        line="Your proof, in your words. Add a public repo, demo or post and it counts."
      >
        {waiting.length ? (
          <ListCard>
            {waiting.map((p) => (
              <ProofRow key={p.id} p={p} d={d} />
            ))}
          </ListCard>
        ) : (
          <Muted>Nothing waiting for a link.</Muted>
        )}
      </Panel>
      {others.length > 0 && (
        <Panel
          id="others"
          title="From others"
          line="Quotes, references and things not yet checked. They never count as your proof."
        >
          <ListCard>
            {others.map((p) => (
              <ProofRow key={p.id} p={p} d={d} />
            ))}
          </ListCard>
        </Panel>
      )}
      {old.length > 0 && (
        <Panel id="old" title="Archived and withdrawn">
          <ListCard>
            {old.map((p) => (
              <ProofRow key={p.id} p={p} d={d} />
            ))}
          </ListCard>
        </Panel>
      )}
    </>
  );
}

function Funnel({ d }: { d: Detail }) {
  const tests = d.guidance.plan.person.tests;
  return (
    <Card className="grid gap-3 p-5">
      <Label>Your funnel</Label>
      <div className="grid gap-2">
        <div className="rounded-lg border px-4 py-2 text-sm">Everyone</div>
        {PERSON_TESTS.map((t, i) => {
          const score = tests[t]?.score ?? null;
          return (
            <div key={t} className="grid gap-1" style={{ paddingInline: `${(i + 1) * 4}%` }}>
              <div className="flex items-center justify-between gap-2 rounded-lg border px-4 py-2 text-sm">
                <span>
                  {i + 1} {PERSON_TEST_TITLES[t]}
                </span>
                <span className="font-medium">{score === null ? "not scored" : `${score}/10`}</span>
              </div>
              <Progress value={(score ?? 0) * 10} aria-label={`${PERSON_TEST_TITLES[t]} score`} />
            </div>
          );
        })}
        <div
          className="rounded-lg border px-4 py-2 text-sm font-medium"
          style={{ marginInline: "20%" }}
        >
          Your person: {d.guidance.plan.person.who || "not named yet"}
        </div>
      </div>
      <Muted>
        Redrawn from hoeem's "Write for everyone and nobody pays". Each test narrows the funnel.
      </Muted>
    </Card>
  );
}

function PersonStep({ d }: { d: Detail }) {
  const p = d.guidance.plan.person;
  return (
    <>
      <Panel id="funnel" title="Your funnel">
        <Funnel d={d} />
      </Panel>
      <Panel
        id="person"
        title="Your person"
        line="The one person you serve, their pain, and what they already pay for."
        action={<EditLink to={`${base(d)}/edit/person`} />}
      >
        <Card className="grid gap-4 p-5">
          {p.who ? <Text>{p.who}</Text> : <Empty>Not named yet.</Empty>}
          <div className="grid gap-1">
            <Label>Their pain</Label>
            {p.pain ? <Text>{p.pain}</Text> : <Empty>Not yet.</Empty>}
          </div>
          <div className="grid gap-1">
            <Label>What they already pay for</Label>
            {p.pays ? <Text>{p.pays}</Text> : <Empty>Not yet.</Empty>}
          </div>
        </Card>
      </Panel>
      <Panel
        id="tests"
        title="The four tests"
        line="Score each from 1 to 10, with a note on why."
        action={<EditLink to={`${base(d)}/edit/tests`} />}
      >
        <ListCard>
          {PERSON_TESTS.map((t) => (
            <ListRow
              key={t}
              aside={<span className="font-medium">{p.tests[t]?.score ?? "–"}/10</span>}
            >
              <span className="grid">
                <span className="font-medium">{PERSON_TEST_TITLES[t]}</span>
                {p.tests[t]?.note && (
                  <small className="text-muted-foreground">{p.tests[t]?.note}</small>
                )}
              </span>
            </ListRow>
          ))}
        </ListCard>
      </Panel>
      <Panel
        id="audience"
        title="Audiences and promise"
        action={<EditLink to={`${base(d)}/edit/profile`} />}
      >
        <Card className="grid gap-4 p-5">
          <div className="grid gap-1">
            <Label>Intended audiences</Label>
            {d.brand.audiences.length ? (
              <ul className="m-0 grid gap-1 pl-5">
                {d.brand.audiences.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : (
              <Empty>None yet.</Empty>
            )}
          </div>
          <div className="grid gap-1">
            <Label>Audience promise</Label>
            {d.guidance.audiencePromise ? (
              <Text>{d.guidance.audiencePromise}</Text>
            ) : (
              <Empty>Not yet.</Empty>
            )}
          </div>
        </Card>
      </Panel>
    </>
  );
}

function AssociationStep({ d }: { d: Detail }) {
  const a = d.guidance.plan.association;
  return (
    <>
      <Panel
        id="themes"
        title="Your themes"
        line="What your person loves. Most posts use one of these."
        action={<EditLink to={`${base(d)}/edit/amplify`} />}
      >
        {a.amplify.length ? (
          <ListCard as="ol">
            {a.amplify.map((x, i) => (
              <ListRow key={`${x.title ?? ""}|${x.item}|${x.postIdea}`}>
                <span className="grid gap-1">
                  <span className="font-medium">
                    {i + 1}. {x.title || x.item}
                  </span>
                  {x.title && x.item && <small className="text-muted-foreground">{x.item}</small>}
                  {x.postIdea && <small>Post idea: {x.postIdea}</small>}
                </span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Empty>No themes yet.</Empty>
        )}
      </Panel>
      <Panel
        id="against"
        title="What you stand against"
        action={<EditLink to={`${base(d)}/edit/antibrand`} />}
      >
        {a.antiBrand.length ? (
          <ListCard>
            {a.antiBrand.map((x) => (
              <ListRow key={`${x.item}|${x.standard}`}>
                <span className="grid gap-1">
                  <span className="font-medium">{x.item}</span>
                  {x.standard && <small className="text-muted-foreground">{x.standard}</small>}
                </span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Empty>Nothing yet.</Empty>
        )}
      </Panel>
      <Panel
        id="constants"
        title="Visual constants"
        line="The two or three things people see every time."
        action={<EditLink to={`${base(d)}/edit/constants`} />}
      >
        {a.visualConstants.length ? (
          <ListCard>
            {a.visualConstants.map((c) => (
              <ListRow key={c}>{c}</ListRow>
            ))}
          </ListCard>
        ) : (
          <Empty>None yet.</Empty>
        )}
      </Panel>
      {(a.keep?.length ?? 0) > 0 && (
        <Panel id="keep" title="Keep">
          <ListCard>
            {a.keep?.map((k) => (
              <ListRow key={k}>{k}</ListRow>
            ))}
          </ListCard>
        </Panel>
      )}
      <Panel
        id="verbal"
        title="Verbal style"
        line="How you sound, from Voice and look."
        action={<EditLink to={`${base(d)}/edit/voice`} />}
      >
        <Card className="p-5">
          {d.guidance.verbalStyle || d.guidance.voice?.toneRules ? (
            <Text>{d.guidance.voice?.toneRules || d.guidance.verbalStyle}</Text>
          ) : (
            <Empty>Not yet.</Empty>
          )}
        </Card>
      </Panel>
    </>
  );
}

function ProductStep({ d }: { d: Detail }) {
  const products = d.guidance.plan.product.freeProducts;
  return (
    <>
      <Panel
        id="free"
        title="Your free product"
        line="When every gate is ticked, it delivers on its hook."
        action={<EditLink to={`${base(d)}/edit/product`} />}
      >
        {products.length ? (
          <div className="grid gap-4">
            {products.map((f) => (
              <Card key={`${f.name}|${f.hook}`} className="grid gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-lg font-semibold">{f.name}</span>
                  <span className="flex gap-2">
                    {f.shelved && <Pill>On the shelf</Pill>}
                    <Pill
                      tone={
                        f.delivers === "yes" || (f.gates?.length && f.gates.every((g) => g.done))
                          ? "done"
                          : "partial"
                      }
                    >
                      {f.delivers === "yes" || (f.gates?.length && f.gates.every((g) => g.done))
                        ? "Delivers"
                        : "Not yet"}
                    </Pill>
                  </span>
                </div>
                {f.hook && <Text>{f.hook}</Text>}
                {f.url ? (
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-sm underline">
                    {f.url}
                  </a>
                ) : (
                  <Muted>No link yet.</Muted>
                )}
                {f.fixes && (
                  <div className="grid gap-1">
                    <Label>What it fixes</Label>
                    <Text>{f.fixes}</Text>
                  </div>
                )}
                {(f.gates?.length ?? 0) > 0 && (
                  <div className="grid gap-1">
                    <Label>Before you promote it</Label>
                    <ul className="m-0 grid gap-1 p-0">
                      {f.gates?.map((g) => (
                        <li key={g.label} className="flex items-center gap-2 text-sm">
                          <StatusDot status={g.done ? "done" : "not-started"} />
                          {g.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(f.later?.length ?? 0) > 0 && (
                  <div className="grid gap-1">
                    <Label>Later</Label>
                    <ul className="m-0 grid gap-1 pl-5">
                      {f.later?.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <NothingYet
            text="No free product yet."
            action={<PrimaryLink to={`${base(d)}/edit/product`}>Add one</PrimaryLink>}
          />
        )}
      </Panel>
      <Panel
        id="grows"
        title="Where it grows"
        line="Season by season."
        action={<PageLink to={`${base(d)}/seasons`}>Seasons</PageLink>}
      >
        <ListCard>
          {d.seasons.map((s) => (
            <ListRow key={s.n}>
              <span className="grid">
                <span className="font-medium">Season {s.n}</span>
                <small className="text-muted-foreground">{s.goal || s.idea || "No goal yet"}</small>
              </span>
            </ListRow>
          ))}
          {d.ideas
            .filter((i) => !d.seasons.some((s) => s.n === i.n))
            .map((i) => (
              <ListRow key={`idea-${i.n}`}>
                <span className="grid">
                  <span className="font-medium">Season {i.n} · idea</span>
                  <small className="text-muted-foreground">{i.idea}</small>
                </span>
              </ListRow>
            ))}
        </ListCard>
      </Panel>
    </>
  );
}

const APP_STATUS = { public: "Public", private: "Private", planned: "Not built" } as const;

function BeltStep({ d }: { d: Detail }) {
  const b = d.guidance.plan.belt;
  const apps = b.apps ?? [];
  const s = currentSeason(d.seasons);
  const e = (part: string) => <EditLink to={`${base(d)}/edit/${part}`} />;
  return (
    <>
      <Panel id="belt" title="Your belt" action={e("belt")}>
        <Card className="grid gap-4 p-5">
          <span className="text-lg font-semibold">{b.project || "No project yet"}</span>
          <Facts
            items={[
              { label: "Target", value: b.target || (s?.target ? String(s.target) : "–") },
              { label: "Launch", value: b.launchDate ? day(b.launchDate) : "–" },
              ...(s
                ? [{ label: "Season", value: `${s.n} · ${day(s.start)} – ${day(s.end)}` }]
                : []),
              { label: "Weekly check-in", value: b.checkInDay || "–" },
            ]}
          />
        </Card>
      </Panel>
      <Panel
        id="apps"
        title="What's public"
        line={`${apps.filter((a) => a.status === "public").length} of ${s?.target ?? apps.length} public.`}
        action={e("apps")}
      >
        {apps.length ? (
          <ListCard>
            {apps.map((a) => (
              <ListRow
                key={a.name}
                aside={
                  <Pill
                    tone={
                      a.status === "public"
                        ? "done"
                        : a.status === "private"
                          ? "partial"
                          : undefined
                    }
                  >
                    {APP_STATUS[a.status]}
                  </Pill>
                }
              >
                <span className="grid">
                  <span className="font-medium">{a.name}</span>
                  {a.url && <small className="text-muted-foreground">{a.url}</small>}
                </span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Empty>Nothing listed yet.</Empty>
        )}
      </Panel>
      <Panel
        id="check-ins"
        title="Weekly check-in"
        line={
          s && b.checkInDay
            ? `Every ${b.checkInDay} · ${checkIns(s, b.checkInDay).length} check-ins this season`
            : "No check-in day yet."
        }
        action={e("belt")}
      >
        {s && b.checkInDay ? (
          <div className="flex flex-wrap gap-2">
            {checkIns(s, b.checkInDay).map((c) => (
              <Pill key={c} tone={c < today() ? "done" : undefined}>
                {day(c)}
              </Pill>
            ))}
          </div>
        ) : (
          <Empty>Set a weekly check-in day on the belt.</Empty>
        )}
      </Panel>
      <Panel id="promise" title="The promise" action={e("belt")}>
        <Card className="p-5">
          {b.promise ? <Text>{b.promise}</Text> : <Empty>Not yet.</Empty>}
        </Card>
      </Panel>
      <Panel id="shown" title="Where the deadline shows" action={e("belt")}>
        <Card className="p-5">
          {b.deadlineShown ? <Text>{b.deadlineShown}</Text> : <Empty>Not yet.</Empty>}
        </Card>
      </Panel>
      <Panel id="slips" title="If it slips" action={e("belt")}>
        <Card className="p-5">
          {b.delayPlan ? <Text>{b.delayPlan}</Text> : <Empty>Not yet.</Empty>}
        </Card>
      </Panel>
    </>
  );
}

function SeasonsView({ d }: { d: Detail }) {
  const now = currentSeason(d.seasons);
  const next = Math.max(0, ...d.seasons.map((s) => s.n), ...d.ideas.map((i) => i.n)) + 1;
  return (
    <PageBody
      title="Seasons"
      line="hoeem's seasons are 90 days. Day 1–30 Proof sprint, Day 31–60 Your person + Association, Day 61–90 Product + Belt."
      action={
        <PrimaryLink to={`${base(d)}/edit/season/${d.seasons.length + 1}`}>New season</PrimaryLink>
      }
    >
      <Panel id="seasons" title="Your seasons">
        <ListCard>
          {d.seasons.map((s) => (
            <ListRow key={s.n} aside={<EditLink to={`${base(d)}/edit/season/${s.n}`} />}>
              <span className="grid gap-1">
                <span className="font-medium">
                  Season {s.n} {now?.n === s.n && <Pill tone="done">Now</Pill>}
                </span>
                <small className="text-muted-foreground">
                  {day(s.start)} – {day(s.end)} · path {s.path || "not chosen"}
                  {s.target ? ` · target ${s.target}` : ""} · {s.proofNeeded} proof links
                </small>
                {s.goal && <small>{s.goal}</small>}
                {s.idea && <small className="text-muted-foreground">Idea: {s.idea}</small>}
              </span>
            </ListRow>
          ))}
        </ListCard>
      </Panel>
      <Panel
        id="ideas"
        title="Ideas for later seasons"
        action={<PageLink to={`${base(d)}/edit/idea/${next}`}>Add idea</PageLink>}
      >
        {d.ideas.filter((i) => !d.seasons.some((s) => s.n === i.n)).length ? (
          <ListCard>
            {d.ideas
              .filter((i) => !d.seasons.some((s) => s.n === i.n))
              .map((i) => (
                <ListRow key={i.n} aside={<EditLink to={`${base(d)}/edit/idea/${i.n}`} />}>
                  <span className="grid">
                    <span className="font-medium">Season {i.n}</span>
                    <small className="text-muted-foreground">{i.idea}</small>
                  </span>
                </ListRow>
              ))}
          </ListCard>
        ) : (
          <Muted>No ideas kept yet.</Muted>
        )}
      </Panel>
    </PageBody>
  );
}

export type Section = (props: { d: Detail }) => ReactNode;
export { today };
