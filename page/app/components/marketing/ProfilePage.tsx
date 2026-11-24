import type { Entity, EntityDetail, Voice } from "@shared/marketing";
import { IconArrowDown, IconArrowUp, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "@shims/react-router";
import { toast } from "sonner";

import { toDataUrl, toImageDataUrl } from "@/components/marketing/BrandPicture";
import { EntityAvatar } from "@/components/marketing/EntitiesEditor";
import { ChannelsAndAccounts } from "@/components/marketing/EntityForms";
import { AppearancePicker } from "@/components/marketing/EntityIcon";
import {
  card,
  chip,
  EditFrame,
  EmptyCard,
  EditLink,
  FileButton,
  greyButton,
  kicker,
  muted,
  PageLink,
  Panel,
  readImage,
  Row,
} from "@/components/marketing/kit/page";
import { PeersEdit, PeersView } from "@/components/marketing/PeersPanel";
import { GAP_HINTS } from "@/components/marketing/plan/hints";
import { useBackTo, useFromHref, usePlanSave } from "@/components/marketing/plan/kit";
import { useSeasons } from "@/components/marketing/plan/season";
import { Status, useWrite } from "@/components/marketing/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ProfilePage({ detail }: { detail: EntityDetail }) {
  const e = detail.entity;
  const accounts = detail.accounts.filter((a) => !a.archived);
  const [peerAccount, setPeerAccount] = useState(accounts[0]?.id ?? "");
  const disabled = e.archived;
  const edit = (part: string) => `/entities/${e.id}/profile/edit/${part}`;
  const seasonsHref = useFromHref(`/entities/${e.id}/seasons`);
  return (
    <div className="flex max-w-[75rem] flex-col gap-7">
      <Panel
        id="identity"
        title="Identity"
        action={<EditLink disabled={disabled} to={edit("identity")} />}
      >
        <IdentityView detail={detail} />
      </Panel>
      <Panel
        id="aims"
        title="What you're aiming for"
        action={<EditLink disabled={disabled} to={edit("aims")} />}
      >
        <div className={card}>
          {e.goals.length ? (
            <ol className="grid gap-2 text-[15px]">
              {e.goals.map((g, i) => (
                <li key={i} className="flex gap-3">
                  <span className={cn("w-5 shrink-0 font-bold tabular-nums", muted)}>{i + 1}</span>
                  <span>{g}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={cn("text-sm", muted)}>No goals yet.</p>
          )}
        </div>
      </Panel>
      <Panel
        id="sound"
        title="How you sound"
        action={<EditLink disabled={disabled} to={edit("sound")} />}
      >
        <VoiceView detail={detail} />
      </Panel>
      <Panel
        id="peers"
        title="Who you look up to"
        action={
          <EditLink
            disabled={disabled}
            to={peerAccount ? `${edit("peers")}?account=${peerAccount}` : edit("peers")}
          />
        }
      >
        <div className={card}>
          <PeersView detail={detail} accountId={peerAccount} onAccount={setPeerAccount} />
        </div>
      </Panel>
      <Panel
        id="where"
        title="Where you post"
        action={<EditLink disabled={disabled} to={edit("where")} />}
      >
        <WherePost detail={detail} />
      </Panel>
      <Panel
        id="seasons"
        title="Seasons"
        action={<PageLink to={seasonsHref}>Open season editor</PageLink>}
      >
        <SeasonsList entity={e} />
      </Panel>
    </div>
  );
}

export const PROFILE_PARTS = {
  identity: "Identity",
  aims: "What you're aiming for",
  sound: "How you sound",
  peers: "Who you look up to",
  where: "Where you post",
} as const;
export type ProfilePart = keyof typeof PROFILE_PARTS;

export function ProfileEdit({ detail, part }: { detail: EntityDetail; part: ProfilePart }) {
  const backTo = useBackTo(`/entities/${detail.entity.id}/profile`);
  const [params] = useSearchParams();
  if (part === "identity") return <IdentityEdit detail={detail} backTo={backTo} />;
  if (part === "aims") return <GoalsEdit entity={detail.entity} backTo={backTo} />;
  if (part === "sound") return <VoiceEdit detail={detail} backTo={backTo} />;
  if (part === "peers") {
    const accountId = params.get("account") ?? detail.accounts.find((a) => !a.archived)?.id ?? "";
    return (
      <EditFrame
        title={PROFILE_PARTS.peers}
        description="Changes save as you make them."
        backTo={backTo}
      >
        <div className="py-[22px]">
          {accountId ? (
            <PeersEdit detail={detail} accountId={accountId} />
          ) : (
            <EmptyCard
              text="Peers belong to one account. Add an account in Where you post first."
              action={
                <PageLink onWhite to={`/entities/${detail.entity.id}/profile/edit/where`}>
                  Add an account
                </PageLink>
              }
            />
          )}
        </div>
      </EditFrame>
    );
  }
  return (
    <EditFrame
      title={PROFILE_PARTS.where}
      description="Channels, and the accounts on each. Changes save as you make them."
      backTo={backTo}
    >
      <div className="py-[22px]">
        <ChannelsAndAccounts detail={detail} />
      </div>
    </EditFrame>
  );
}

function IdentityView({ detail }: { detail: EntityDetail }) {
  const e = detail.entity;
  const colours = detail.guidance.visual.colours;
  const images = e.images ?? [];
  return (
    <>
      <div className={cn(card, "flex flex-wrap items-start gap-6")}>
        <EntityAvatar entity={e} size={88} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-[28px] font-extrabold leading-tight">{e.name}</span>
          {e.purpose ? (
            <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--p-4a4943)]">
              {e.purpose}
            </p>
          ) : (
            <p className={cn("text-sm", muted)}>No tagline yet.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className={kicker}>Colours</span>
          {colours.length ? (
            <span className="flex flex-wrap gap-2">
              {colours.map((c) => (
                <span
                  key={c}
                  title={c}
                  className="size-10 rounded-[10px] border border-[var(--p-e6e4dd)]"
                  style={{ background: c }}
                />
              ))}
            </span>
          ) : (
            <span className={cn("text-sm", muted)}>None yet</span>
          )}
        </div>
      </div>
      <div className={cn(card, "flex flex-col gap-3")}>
        <span className={kicker}>Brand images</span>
        {images.length ? (
          <div className="flex flex-wrap gap-3">
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Brand image ${i + 1}`}
                className="h-24 rounded-[10px] border border-[var(--p-e6e4dd)] object-cover"
              />
            ))}
          </div>
        ) : (
          <p className={cn("text-sm", muted)}>No brand images yet.</p>
        )}
      </div>
    </>
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

function IdentityEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const navigate = useNavigate();
  const e = detail.entity;
  const g = detail.guidance;
  const saveEntity = useWrite<Entity>("save-entity");
  const { save: savePlan } = usePlanSave(e.id, "association");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: e.name,
    purpose: e.purpose,
    image: e.image ?? "",
    icon: e.icon,
    colour: e.colour,
    images: e.images ?? [],
    colours: [...g.visual.colours],
  });
  const preview = { image: f.image, icon: f.icon, colour: f.colour };
  const submit = async () => {
    if (!f.name.trim()) return toast.error("Name is required.");
    if (f.colours.some((c) => !HEX.test(c))) return toast.error("Use #rrggbb colours.");
    setBusy(true);
    try {
      const r = await saveEntity.run({
        id: e.id,
        expectedVersion: e.version,
        name: f.name.trim(),
        purpose: f.purpose,
        image: f.image,
        icon: f.icon,
        colour: f.colour,
        images: f.images,
      });
      if (!r) return;
      const colours = f.colours.map((c) => c.toLowerCase());
      if (JSON.stringify(colours) !== JSON.stringify(g.visual.colours)) {
        if (!(await savePlan({ visual: { ...g.visual, colours } }))) return;
      }
      toast.success("Identity saved");
      navigate(backTo);
    } finally {
      setBusy(false);
    }
  };
  return (
    <EditFrame title="Identity" backTo={backTo} onSave={() => void submit()} busy={busy}>
      <div className="grid gap-6">
        <Row title="Picture">
          <div className="flex items-center gap-4">
            <EntityAvatar entity={preview} size={64} />
            <FileButton
              id="identity-picture"
              label={f.image ? "Change picture" : "Upload picture"}
              onFile={readImage(toDataUrl, (image) => setF((x) => ({ ...x, image })))}
            />
            {f.image && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setF({ ...f, image: "" })}
              >
                Remove
              </Button>
            )}
          </div>
        </Row>
        <Row title="Name" htmlFor="identity-name">
          <Input
            id="identity-name"
            value={f.name}
            onChange={(ev) => setF({ ...f, name: ev.target.value })}
          />
        </Row>
        <Row
          title="Tagline"
          line="Why this brand exists, in a line or two."
          htmlFor="identity-tagline"
        >
          <Textarea
            id="identity-tagline"
            rows={3}
            value={f.purpose}
            onChange={(ev) => setF({ ...f, purpose: ev.target.value })}
          />
        </Row>
        <Row title="Colours">
          <div className="grid gap-2">
            {f.colours.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="color"
                  aria-label={`Colour ${i + 1}`}
                  value={HEX.test(c) ? c : "#000000"}
                  onChange={(ev) =>
                    setF({
                      ...f,
                      colours: f.colours.map((x, j) => (j === i ? ev.target.value : x)),
                    })
                  }
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  aria-label={`Colour ${i + 1} hex`}
                  value={c}
                  onChange={(ev) =>
                    setF({
                      ...f,
                      colours: f.colours.map((x, j) => (j === i ? ev.target.value.trim() : x)),
                    })
                  }
                  className="w-32 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove colour ${c}`}
                  onClick={() => setF({ ...f, colours: f.colours.filter((_, j) => j !== i) })}
                >
                  <IconX size={16} />
                </Button>
              </div>
            ))}
            <div>
              <Button
                type="button"
                variant="ghost"
                className={cn(greyButton, "bg-[var(--p-f0efe9)]")}
                disabled={f.colours.length >= 20}
                onClick={() => setF({ ...f, colours: [...f.colours, "#000000"] })}
              >
                Add colour
              </Button>
            </div>
          </div>
        </Row>
        <Row title="Icon and colour" line="Shown when there's no picture.">
          <AppearancePicker
            idp={`identity-${e.id}`}
            icon={f.icon}
            colour={f.colour}
            onChange={(v) => setF({ ...f, ...v })}
          />
        </Row>
        <Row title="Brand images" line="Up to 8. PNG, JPEG or WebP.">
          <div className="grid gap-3">
            {f.images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {f.images.map((src, i) => (
                  <span key={i} className="relative">
                    <img
                      src={src}
                      alt={`Brand image ${i + 1}`}
                      className="h-20 rounded-[10px] border border-[var(--p-e6e4dd)] object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label={`Remove brand image ${i + 1}`}
                      className="absolute -right-2 -top-2 size-6 rounded-full"
                      onClick={() =>
                        setF({
                          ...f,
                          images: f.images.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <IconX size={12} />
                    </Button>
                  </span>
                ))}
              </div>
            )}
            <div>
              <FileButton
                id="identity-images"
                label="Add images"
                multiple
                disabled={f.images.length >= 8}
                onFile={readImage(
                  (file) => toImageDataUrl(file),
                  (url) =>
                    setF((x) => (x.images.length >= 8 ? x : { ...x, images: [...x.images, url] })),
                )}
              />
            </div>
          </div>
        </Row>
      </div>
    </EditFrame>
  );
}

function GoalsEdit({ entity: e, backTo }: { entity: Entity; backTo: string }) {
  const navigate = useNavigate();
  const save = useWrite<Entity>("save-entity", { success: "Goals saved" });
  const [goals, setGoals] = useState<string[]>(e.goals.length ? [...e.goals] : [""]);
  const move = (i: number, d: number) => {
    const next = [...goals];
    next.splice(i + d, 0, next.splice(i, 1)[0]);
    setGoals(next);
  };
  return (
    <EditFrame
      title="What you're aiming for"
      backTo={backTo}
      busy={save.busy}
      onSave={() =>
        void save
          .run({
            id: e.id,
            expectedVersion: e.version,
            goals: goals.map((g) => g.trim()).filter(Boolean),
          })
          .then((r) => r && navigate(backTo))
      }
    >
      <Row title="Goals" line="What this brand is working towards, in order.">
        {goals.map((g, i) => (
          <div key={i} className="flex items-start gap-1">
            <Textarea
              aria-label={`Goal ${i + 1}`}
              rows={2}
              value={g}
              onChange={(ev) => setGoals(goals.map((x, j) => (j === i ? ev.target.value : x)))}
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
              disabled={i === goals.length - 1}
              onClick={() => move(i, 1)}
            >
              <IconArrowDown size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove goal ${i + 1}`}
              onClick={() => setGoals(goals.filter((_, j) => j !== i))}
            >
              <IconX size={16} />
            </Button>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="ghost"
            className={cn(greyButton, "bg-[var(--p-f0efe9)]")}
            disabled={goals.length >= 20}
            onClick={() => setGoals([...goals, ""])}
          >
            Add goal
          </Button>
        </div>
      </Row>
    </EditFrame>
  );
}

const EMPTY_VOICE: Voice = {
  keyPhrases: [],
  borrowedPhrases: [],
  toneRules: "",
  example: "",
};

export function VoiceView({ detail }: { detail: EntityDetail }) {
  const v = detail.guidance.voice;
  const fallback = detail.guidance.verbalStyle.trim();
  if (!v)
    return (
      <div className={card}>
        {fallback ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--p-4a4943)]">
            {fallback}
          </p>
        ) : (
          <p className={cn("text-sm", muted)}>Not described yet.</p>
        )}
      </div>
    );
  return (
    <div className={cn(card, "grid gap-6 md:grid-cols-2")}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className={kicker}>Key phrases</span>
          {v.keyPhrases.length ? (
            <span className="flex flex-wrap gap-1.5">
              {v.keyPhrases.map((p) => (
                <span key={p} className={cn(chip, "font-semibold")}>
                  {p}
                </span>
              ))}
            </span>
          ) : (
            <span className={cn("text-sm", muted)}>None yet</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className={kicker}>Borrowed phrases</span>
          {v.borrowedPhrases.length ? (
            <span className="flex flex-wrap gap-1.5">
              {v.borrowedPhrases.map((b) => (
                <span key={b.phrase} className={chip}>
                  {b.phrase}
                  {b.from && <span className={muted}> · {b.from}</span>}
                </span>
              ))}
            </span>
          ) : (
            <span className={cn("text-sm", muted)}>None yet</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className={kicker}>Tone rules</span>
          {v.toneRules.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--p-4a4943)]">
              {v.toneRules}
            </p>
          ) : (
            <span className={cn("text-sm", muted)}>None yet</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={kicker}>Example in your words</span>
        {v.example.trim() ? (
          <blockquote className="border-l-[3px] border-[var(--p-e6e4dd)] pl-4 text-[15px] italic leading-relaxed text-[var(--p-4a4943)]">
            {v.example}
          </blockquote>
        ) : (
          <span className={cn("text-sm", muted)}>None yet</span>
        )}
      </div>
    </div>
  );
}

function VoiceEdit({ detail, backTo }: { detail: EntityDetail; backTo: string }) {
  const navigate = useNavigate();
  const { save } = usePlanSave(detail.entity.id, "association");
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState<Voice>(() => ({
    ...EMPTY_VOICE,
    ...detail.guidance.voice,
  }));
  const [phrase, setPhrase] = useState("");
  const addPhrase = () => {
    const p = phrase.trim();
    if (p && !v.keyPhrases.includes(p)) setV({ ...v, keyPhrases: [...v.keyPhrases, p] });
    setPhrase("");
  };
  const submit = async () => {
    setBusy(true);
    const clean: Voice = {
      ...v,
      keyPhrases: v.keyPhrases,
      borrowedPhrases: v.borrowedPhrases
        .filter((b) => b.phrase.trim())
        .map((b) => ({ phrase: b.phrase.trim(), from: b.from.trim() })),
    };
    const r = await save({ voice: clean });
    setBusy(false);
    if (r) navigate(backTo);
  };
  return (
    <EditFrame
      title="How you sound"
      description={GAP_HINTS["verbal-style"]}
      backTo={backTo}
      onSave={() => void submit()}
      busy={busy}
    >
      <div className="grid gap-6">
        <Row
          title="Key phrases"
          line="Words and phrases that are yours. Press Enter to add."
          htmlFor="voice-phrase"
        >
          <div className="grid gap-2">
            {v.keyPhrases.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {v.keyPhrases.map((p) => (
                  <Badge
                    key={p}
                    variant="secondary"
                    className="gap-1 py-1 pl-2.5 pr-1 text-[13px] font-semibold"
                  >
                    {p}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${p}`}
                      className="size-5"
                      onClick={() =>
                        setV({
                          ...v,
                          keyPhrases: v.keyPhrases.filter((x) => x !== p),
                        })
                      }
                    >
                      <IconX size={12} />
                    </Button>
                  </Badge>
                ))}
              </span>
            )}
            <Input
              id="voice-phrase"
              value={phrase}
              placeholder="Add a phrase"
              onChange={(ev) => setPhrase(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                  ev.preventDefault();
                  addPhrase();
                }
              }}
              onBlur={addPhrase}
            />
          </div>
        </Row>
        <Row
          title="Borrowed phrases"
          line="Other people's phrases you use, with who they're from, so you always credit them."
        >
          <div className="grid gap-2">
            {v.borrowedPhrases.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  aria-label={`Borrowed phrase ${i + 1}`}
                  placeholder="Phrase"
                  value={b.phrase}
                  onChange={(ev) =>
                    setV({
                      ...v,
                      borrowedPhrases: v.borrowedPhrases.map((x, j) =>
                        j === i ? { ...x, phrase: ev.target.value } : x,
                      ),
                    })
                  }
                  className="min-w-0 flex-[3]"
                />
                <Input
                  aria-label={`From, phrase ${i + 1}`}
                  placeholder="From"
                  value={b.from}
                  onChange={(ev) =>
                    setV({
                      ...v,
                      borrowedPhrases: v.borrowedPhrases.map((x, j) =>
                        j === i ? { ...x, from: ev.target.value } : x,
                      ),
                    })
                  }
                  className="min-w-0 flex-[2]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove borrowed phrase ${i + 1}`}
                  onClick={() =>
                    setV({
                      ...v,
                      borrowedPhrases: v.borrowedPhrases.filter((_, j) => j !== i),
                    })
                  }
                >
                  <IconX size={16} />
                </Button>
              </div>
            ))}
            <div>
              <Button
                type="button"
                variant="ghost"
                className={cn(greyButton, "bg-[var(--p-f0efe9)]")}
                onClick={() =>
                  setV({
                    ...v,
                    borrowedPhrases: [...v.borrowedPhrases, { phrase: "", from: "" }],
                  })
                }
              >
                Add borrowed phrase
              </Button>
            </div>
          </div>
        </Row>
        <Row title="Tone rules" htmlFor="voice-tone">
          <Textarea
            id="voice-tone"
            rows={5}
            value={v.toneRules}
            onChange={(ev) => setV({ ...v, toneRules: ev.target.value })}
          />
        </Row>
        <Row title="Example in your words" htmlFor="voice-example">
          <Textarea
            id="voice-example"
            rows={5}
            value={v.example}
            onChange={(ev) => setV({ ...v, example: ev.target.value })}
          />
        </Row>
      </div>
    </EditFrame>
  );
}

function WherePost({ detail }: { detail: EntityDetail }) {
  const channels = detail.channels.filter((c) => !c.archived);
  if (!channels.length)
    return (
      <div className={card}>
        <p className={cn("text-sm", muted)}>No channels yet.</p>
      </div>
    );
  return (
    <div className="grid gap-3">
      {channels.map((c) => {
        const accounts = detail.accounts.filter((a) => a.channelId === c.id && !a.archived);
        return (
          <div key={c.id} className={cn(card, "flex flex-col gap-3 p-5")}>
            <span className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase">
                {c.kind}
              </Badge>
              <span className="text-[15px] font-extrabold">{c.name}</span>
            </span>
            {accounts.length ? (
              <ul className="grid gap-2">
                {accounts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{a.name}</span>
                    {a.handle && <span className={chip}>@{a.handle}</span>}
                    {a.role && <Badge variant="outline">{a.role}</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn("text-sm", muted)}>No accounts on this channel yet.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const fmt = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function SeasonsList({ entity }: { entity: Entity }) {
  const seasons = useSeasons(entity.id);
  return (
    <Status loading={seasons.isLoading} error={seasons.error}>
      {seasons.data &&
        (seasons.data.seasons.length ? (
          <ul className="grid gap-2">
            {seasons.data.seasons.map((s) => (
              <li
                key={s.n}
                className={cn(card, "flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5")}
              >
                <span className="text-[15px] font-extrabold">Season {s.n}</span>
                <span className={cn("text-[13px]", muted)}>
                  {fmt(s.start)} – {fmt(s.end)}
                </span>
                {s.n === seasons.data.current.n && (
                  <span className="rounded-full bg-[var(--p-f2fbf4)] px-2 py-0.5 text-xs font-semibold text-[var(--p-1a7f37)]">
                    Now
                  </span>
                )}
                {s.goal && (
                  <span className="min-w-0 basis-full truncate text-sm text-[var(--p-4a4943)]">
                    {s.goal}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className={card}>
            <p className={cn("text-sm", muted)}>No seasons yet.</p>
          </div>
        ))}
    </Status>
  );
}
