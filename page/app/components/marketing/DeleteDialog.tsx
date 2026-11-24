import { useActionQuery } from "@shims/use-action";
import { useState } from "react";

import { Status, useWrite } from "@/components/marketing/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Kind = "entity" | "channel" | "account";
type Preview = { name: string; counts: { label: string; count: number }[] };

export const greyButton =
  "h-auto rounded-[10px] bg-[var(--p-f0efe9)] px-3.5 py-2 text-[13px] font-semibold text-[var(--p-1f2328)] hover:bg-[var(--p-e6e4dd)]";

export function DeleteDialog({
  kind,
  id,
  name,
  typeName = false,
  open,
  onOpenChange,
  onDeleted,
}: {
  kind: Kind;
  id: string;
  name: string;
  typeName?: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted?: () => void;
}) {
  const preview = useActionQuery<Preview>("get-delete-preview", { kind, id }, { enabled: open });
  const del = useWrite<{ deleted: boolean }>("delete-item", {
    success: `Deleted ${name}`,
  });
  const [typed, setTyped] = useState("");
  const ok = !typeName || typed.trim() === name.trim();
  const counts = preview.data?.counts ?? [];
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setTyped("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[480px] gap-4 rounded-2xl border-[var(--p-e6e4dd)] bg-[var(--p-card)] p-7 text-[var(--p-1f2328)]">
        <DialogTitle className="text-xl font-extrabold">Delete {name}?</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-[var(--p-4a4943)]">
          This permanently removes the {kind}
          {kind === "channel"
            ? " and its accounts"
            : kind === "entity"
              ? " and everything under it"
              : ""}
          . A backup file is saved first, but it won't come back in the app.
        </DialogDescription>
        <Status loading={preview.isLoading} error={preview.error}>
          {counts.length > 0 ? (
            <ul className="grid gap-1 rounded-xl bg-[var(--p-f0efe9)] px-4 py-3 text-[13px]">
              {counts.map((c) => (
                <li key={c.label} className="flex justify-between gap-4">
                  <span>{c.label[0].toUpperCase() + c.label.slice(1)}</span>
                  <span className="font-semibold tabular-nums">{c.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            preview.data && (
              <p className="text-[13px] text-[var(--p-6b6a63)]">Nothing else is attached to it.</p>
            )
          )}
        </Status>
        {typeName && (
          <div className="grid gap-1.5">
            <Label htmlFor={`delete-${id}`} className="text-[13px] font-bold">
              Type {name} to confirm
            </Label>
            <Input
              id={`delete-${id}`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="h-10 rounded-[10px] border-[var(--p-d6d4cc)]"
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className={greyButton}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={greyButton}
            disabled={!ok || del.busy || !preview.data}
            onClick={async () => {
              const r = await del.run({ kind, id, confirmName: name });
              if (r) {
                setTyped("");
                onOpenChange(false);
                onDeleted?.();
              }
            }}
          >
            Delete permanently
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
