import type { AccountDetail, Channel, ChannelKind, EntityDetail, Persona } from "@shared/marketing";
import { useState } from "react";

import { DeleteDialog } from "@/components/marketing/DeleteDialog";
import { Field, LinesInput, Picker, StateBadge, useWrite } from "@/components/marketing/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function OverviewForm({ detail }: { detail: EntityDetail }) {
  const e = detail.entity;
  const save = useWrite("save-entity", { success: "Entity saved" });
  const [name, setName] = useState(e.name);
  const [purpose, setPurpose] = useState(e.purpose);
  const [audiences, setAudiences] = useState(e.audiences);
  const [goals, setGoals] = useState(e.goals);
  return (
    <form
      className="grid gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        void save.run({
          id: e.id,
          expectedVersion: e.version,
          name,
          purpose,
          audiences,
          goals,
        });
      }}
    >
      <Field label="Name" htmlFor="e-name">
        <Input
          id="e-name"
          value={name}
          onChange={(v) => setName(v.target.value)}
          disabled={e.archived}
        />
      </Field>
      <Field label="Purpose" htmlFor="e-purpose">
        <Textarea
          id="e-purpose"
          rows={3}
          value={purpose}
          onChange={(v) => setPurpose(v.target.value)}
          disabled={e.archived}
        />
      </Field>
      <Field label="Intended audiences" hint="One per line." htmlFor="e-aud">
        <LinesInput id="e-aud" value={audiences} onChange={setAudiences} />
      </Field>
      <Field
        label="Goals"
        hint="One per line. Qualitative goals are fine; don't invent numeric targets."
        htmlFor="e-goals"
      >
        <LinesInput id="e-goals" value={goals} onChange={setGoals} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={save.busy || e.archived}>
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={save.busy}
          onClick={() =>
            void save.run({
              id: e.id,
              expectedVersion: e.version,
              archived: !e.archived,
            })
          }
        >
          {e.archived ? "Restore entity" : "Archive entity"}
        </Button>
      </div>
    </form>
  );
}

const KINDS: { id: ChannelKind; name: string }[] = [
  { id: "x", name: "X" },
  { id: "blog", name: "Blog" },
  { id: "newsletter", name: "Newsletter" },
  { id: "website", name: "Website" },
  { id: "other", name: "Other" },
];

export function ChannelsAndAccounts({ detail }: { detail: EntityDetail }) {
  const e = detail.entity;
  const saveChannel = useWrite("save-channel", { success: "Channel saved" });
  const saveAccount = useWrite("save-account", { success: "Account saved" });
  const [channelName, setChannelName] = useState("");
  const [kind, setKind] = useState<ChannelKind>("x");
  const [acc, setAcc] = useState({
    channelId: "",
    name: "",
    handle: "",
    role: "",
  });
  const activeChannels = detail.channels.filter((c) => !c.archived);
  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <h2 className="text-sm font-semibold">Channels</h2>
        <ul className="grid gap-2">
          {detail.channels.map((c) => (
            <ChannelRow key={c.id} channel={c} />
          ))}
        </ul>
        {!e.archived && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={async (ev) => {
              ev.preventDefault();
              if (
                await saveChannel.run({
                  entityId: e.id,
                  kind,
                  name: channelName,
                })
              )
                setChannelName("");
            }}
          >
            <Field label="Channel name" htmlFor="c-name">
              <Input
                id="c-name"
                value={channelName}
                onChange={(v) => setChannelName(v.target.value)}
                placeholder="X, Company blog…"
              />
            </Field>
            <Picker
              label="Channel kind"
              value={kind}
              onChange={(v) => setKind(v as ChannelKind)}
              options={KINDS}
              allowEmpty={false}
            />
            <Button type="submit" disabled={saveChannel.busy || !channelName.trim()}>
              Add channel
            </Button>
          </form>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="text-sm font-semibold">Accounts (destinations)</h2>
        <p className="text-sm text-muted-foreground">
          An account is one presence on a channel with its own persona. Drafts keep the destination
          chosen when they were created.
        </p>
        <div className="grid gap-3">
          {detail.accounts.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              channel={detail.channels.find((c) => c.id === a.channelId)}
            />
          ))}
        </div>
        {!e.archived && activeChannels.length > 0 && (
          <form
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-5 md:items-end"
            onSubmit={async (ev) => {
              ev.preventDefault();
              if (await saveAccount.run({ entityId: e.id, ...acc }))
                setAcc({
                  channelId: acc.channelId,
                  name: "",
                  handle: "",
                  role: "",
                });
            }}
          >
            <Field label="Channel">
              <Picker
                label="Account channel"
                value={acc.channelId}
                onChange={(channelId) => setAcc({ ...acc, channelId })}
                options={activeChannels}
                empty="Choose"
              />
            </Field>
            <Field label="Account name" htmlFor="a-name">
              <Input
                id="a-name"
                value={acc.name}
                onChange={(v) => setAcc({ ...acc, name: v.target.value })}
              />
            </Field>
            <Field label="Handle" htmlFor="a-handle">
              <Input
                id="a-handle"
                value={acc.handle}
                onChange={(v) => setAcc({ ...acc, handle: v.target.value })}
                placeholder="without @"
              />
            </Field>
            <Field label="Role" htmlFor="a-role">
              <Input
                id="a-role"
                value={acc.role}
                onChange={(v) => setAcc({ ...acc, role: v.target.value })}
                placeholder="primary, meme…"
              />
            </Field>
            <Button type="submit" disabled={saveAccount.busy || !acc.channelId || !acc.name.trim()}>
              Add account
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

export function ChannelRow({ channel }: { channel: Channel }) {
  const save = useWrite("save-channel");
  const rename = useWrite("save-channel", { success: "Channel renamed" });
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(channel.name);
  const [localError, setLocalError] = useState<string>();
  const inputId = `channel-name-${channel.id}`;
  const cancel = () => {
    setEditing(false);
    setName(channel.name);
    setLocalError(undefined);
    rename.clearError();
  };
  return (
    <li className="grid gap-2 rounded-md border px-3 py-2" aria-label={`Channel ${channel.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" title="Platform kind (fixed)">
            {channel.kind.toUpperCase()}
          </Badge>
          {!editing && channel.name}
          {!editing && channel.url && <span className="text-muted-foreground">{channel.url}</span>}
          {channel.archived && <StateBadge state="archived" />}
        </span>
        {!editing && (
          <span className="flex gap-1">
            {!channel.archived && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={save.busy}
              onClick={() =>
                void save.run({
                  id: channel.id,
                  expectedVersion: channel.version,
                  archived: !channel.archived,
                })
              }
            >
              {channel.archived ? "Restore" : "Archive"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDeleting(true)}>
              Delete
            </Button>
            <DeleteDialog
              kind="channel"
              id={channel.id}
              name={channel.name}
              open={deleting}
              onOpenChange={setDeleting}
            />
          </span>
        )}
      </div>
      {editing && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return setLocalError("Name is required.");
            if (trimmed.length > 160) return setLocalError("Use 160 characters or fewer.");
            setLocalError(undefined);
            if (trimmed === channel.name) return cancel();

            if (
              await rename.run({
                id: channel.id,
                expectedVersion: channel.version,
                name: trimmed,
              })
            )
              setEditing(false);
          }}
        >
          <Field
            label="Channel display name"
            htmlFor={inputId}
            hint={`Kind: ${channel.kind.toUpperCase()} (fixed). Accounts and drafts keep pointing at this channel.`}
          >
            <Input
              id={inputId}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(localError || rename.error)}
            />
          </Field>
          <Button type="submit" size="sm" disabled={rename.busy}>
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={cancel}>
            Cancel
          </Button>
          {(localError || rename.error) && (
            <p role="alert" className="w-full text-xs text-destructive">
              {localError || rename.error}
            </p>
          )}
        </form>
      )}
    </li>
  );
}

export function AccountCard({ account, channel }: { account: AccountDetail; channel?: Channel }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const save = useWrite("save-account");
  return (
    <article className="grid gap-3 rounded-lg border p-4" aria-label={`Account ${account.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{account.name}</span>
          <Badge variant="secondary">
            {channel?.name ?? account.channelKind}
            {account.handle ? ` · @${account.handle}` : ""}
          </Badge>
          {account.role && <Badge variant="outline">{account.role}</Badge>}
          {account.archived && <StateBadge state="archived" />}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
            {open ? "Close persona" : "Edit persona"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={save.busy}
            onClick={() =>
              void save.run({
                id: account.id,
                expectedVersion: account.version,
                archived: !account.archived,
              })
            }
          >
            {account.archived ? "Restore" : "Archive"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(true)}>
            Delete
          </Button>
          <DeleteDialog
            kind="account"
            id={account.id}
            name={account.name}
            open={deleting}
            onOpenChange={setDeleting}
          />
        </div>
      </div>
      {account.conflicts.length > 0 && (
        <div
          role="alert"
          className="grid gap-1 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm dark:bg-amber-950/40"
        >
          <p className="font-medium">Persona conflicts with entity principles</p>
          {account.conflicts.map((c, i) => (
            <p key={i}>
              <span className="font-mono text-xs">{c.field}</span>: “{c.excerpt}” — {c.explanation}{" "}
              (Principle: {c.principle})
            </p>
          ))}
        </div>
      )}
      {!open && account.persona.tone && (
        <p className="text-sm text-muted-foreground">Tone: {account.persona.tone}</p>
      )}
      {open && <PersonaForm account={account} onDone={() => setOpen(false)} />}
    </article>
  );
}

function PersonaForm({ account, onDone }: { account: AccountDetail; onDone: () => void }) {
  const save = useWrite("update-persona", {
    success: "New persona version saved",
  });
  const [p, setP] = useState<Persona>(account.persona);
  const [instructions, setInstructions] = useState(account.instructions);
  const saveAccount = useWrite("save-account");
  const set = (patch: Partial<Persona>) => setP({ ...p, ...patch });
  const pid = `p-${account.id}`;
  return (
    <form
      className="grid gap-3"
      onSubmit={async (ev) => {
        ev.preventDefault();
        let version = account.version;
        if (instructions !== account.instructions) {
          const saved = await saveAccount.run({
            id: account.id,
            expectedVersion: version,
            instructions,
          });
          if (!saved) return;
          version = (saved as { version: number }).version;
        }
        if (
          await save.run({
            accountId: account.id,
            expectedVersion: version,
            persona: p,
            note: "",
          })
        )
          onDone();
      }}
    >
      <Field label="Tone" htmlFor={`${pid}-tone`}>
        <Textarea
          id={`${pid}-tone`}
          rows={2}
          value={p.tone}
          onChange={(v) => set({ tone: v.target.value })}
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Traits" hint="One per line." htmlFor={`${pid}-traits`}>
          <LinesInput
            id={`${pid}-traits`}
            value={p.traits}
            onChange={(traits) => set({ traits })}
          />
        </Field>
        <Field label="Topics" hint="One per line." htmlFor={`${pid}-topics`}>
          <LinesInput
            id={`${pid}-topics`}
            value={p.topics}
            onChange={(topics) => set({ topics })}
          />
        </Field>
        <Field
          label="Boundaries"
          hint="Topics or behaviour to avoid, one per line."
          htmlFor={`${pid}-bounds`}
        >
          <LinesInput
            id={`${pid}-bounds`}
            value={p.boundaries}
            onChange={(boundaries) => set({ boundaries })}
          />
        </Field>
        <Field label="Audience" htmlFor={`${pid}-aud`}>
          <Textarea
            id={`${pid}-aud`}
            rows={3}
            value={p.audience}
            onChange={(v) => set({ audience: v.target.value })}
          />
        </Field>
      </div>
      <Field label="Example posts" hint="One per line." htmlFor={`${pid}-ex`}>
        <LinesInput
          id={`${pid}-ex`}
          rows={3}
          value={p.examples}
          onChange={(examples) => set({ examples })}
        />
      </Field>
      <Field label="Operating instructions" htmlFor={`${pid}-instr`}>
        <Textarea
          id={`${pid}-instr`}
          rows={3}
          value={instructions}
          onChange={(v) => setInstructions(v.target.value)}
        />
      </Field>
      <div>
        <Button type="submit" disabled={save.busy || saveAccount.busy || account.archived}>
          Save persona
        </Button>
      </div>
    </form>
  );
}
