import type { EntityDetail, Peer } from "@shared/marketing";
import { useActionQuery } from "@shims/use-action";
import { useState } from "react";

import { Field, Picker, Status, useWrite } from "@/components/marketing/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function usePeers(accountId: string) {
  return useActionQuery<{ peers: Peer[] }>(
    "list-peers",
    { accountId: accountId || "__none", status: "active" },
    { enabled: Boolean(accountId) },
  );
}

export function PeersView({
  detail,
  accountId,
  onAccount,
}: {
  detail: EntityDetail;
  accountId: string;
  onAccount: (id: string) => void;
}) {
  const accounts = detail.accounts.filter((a) => !a.archived);
  const query = usePeers(accountId);
  const peers = query.data?.peers ?? [];
  if (!accounts.length)
    return (
      <p className="text-sm text-[var(--p-6b6a63)]">
        Add an account in Where you post first; peers belong to one account.
      </p>
    );
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Account:</span>
        <Picker
          label="Account"
          value={accountId}
          onChange={onAccount}
          options={accounts}
          allowEmpty={false}
        />
      </div>
      <p className="text-sm text-[var(--p-6b6a63)]">
        External people whose conversations this account wants to contribute to. Peers are not your
        accounts and following one is not an endorsement.
      </p>
      <Status
        loading={query.isLoading}
        error={query.error}
        empty={!query.isLoading && !peers.length ? "No peers for this account yet." : undefined}
      >
        <ul className="grid gap-2">
          {peers.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-baseline gap-2 rounded-[14px] border border-[var(--p-e6e4dd)] bg-[var(--p-card)] px-4 py-3 text-sm"
            >
              <span className="font-semibold">@{p.handle}</span>
              {p.sector && <Badge variant="secondary">{p.sector}</Badge>}
              {p.reason && <span className="basis-full text-[var(--p-4a4943)]">{p.reason}</span>}
            </li>
          ))}
        </ul>
      </Status>
    </div>
  );
}

export function PeersEdit({ detail, accountId }: { detail: EntityDetail; accountId: string }) {
  const account = detail.accounts.find((a) => a.id === accountId);
  const query = usePeers(accountId);
  const peers = query.data?.peers ?? [];
  const save = useWrite("save-peer", { success: "Peer saved" });
  const [form, setForm] = useState({ handle: "", sector: "", reason: "" });
  if (!account) return <p className="text-sm text-[var(--p-6b6a63)]">Choose an account first.</p>;
  return (
    <div className="grid gap-5">
      <p className="text-sm text-[var(--p-6b6a63)]">For {account.name}.</p>
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await save.run({ accountId, ...form }))
            setForm({ handle: "", sector: "", reason: "" });
        }}
      >
        <Field label="Handle or profile URL" htmlFor="peer-handle">
          <Input
            id="peer-handle"
            value={form.handle}
            onChange={(e) => setForm({ ...form, handle: e.target.value })}
            placeholder="@handle"
          />
        </Field>
        <Field label="Sector" htmlFor="peer-sector">
          <Input
            id="peer-sector"
            value={form.sector}
            onChange={(e) => setForm({ ...form, sector: e.target.value })}
          />
        </Field>
        <Field label="Reason for following" htmlFor="peer-reason">
          <Input
            id="peer-reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </Field>
        <div>
          <Button type="submit" disabled={save.busy || !form.handle.trim()}>
            Add peer
          </Button>
        </div>
      </form>
      <Status
        loading={query.isLoading}
        error={query.error}
        empty={!query.isLoading && !peers.length ? "No peers for this account yet." : undefined}
      >
        <ul className="grid gap-2">
          {peers.map((p) => (
            <li
              key={`${p.id}-${p.version}`}
              className="flex items-center justify-between gap-2 rounded-[14px] border border-[var(--p-e6e4dd)] px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-semibold">@{p.handle}</span>
                {p.sector && <Badge variant="secondary">{p.sector}</Badge>}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={save.busy}
                onClick={() =>
                  void save.run({
                    id: p.id,
                    expectedVersion: p.version,
                    status: "removed",
                  })
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </Status>
    </div>
  );
}
