import { actionErrorMessage, useActionMutation, useActionQuery } from "@shims/use-action";
import { useCallback, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type Owner = { id: string; name: string };

export function useOwner(): Owner | undefined {
  return useActionQuery<Owner>("get-owner", {}).data;
}

export function useWrite<T = any>(name: string, options: { success?: string } = {}) {
  const mutation = useActionMutation<T, Record<string, unknown>>(name as never);
  const owner = useOwner();
  const pending = useRef<{ signature: string; requestId: string } | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const run = useCallback(
    async (args: Record<string, unknown>): Promise<T | undefined> => {
      if (!owner) {
        toast.error("Still loading. Try again in a moment.");
        return undefined;
      }
      const signature = JSON.stringify(args);
      if (pending.current?.signature !== signature)
        pending.current = { signature, requestId: crypto.randomUUID() };
      setBusy(true);
      setError(undefined);
      try {
        const result = await mutation.mutateAsync({
          by: owner.id,
          requestId: pending.current.requestId,
          ...args,
        });
        pending.current = undefined;
        if (options.success) toast.success(options.success);
        return result;
      } catch (err) {
        const message = actionErrorMessage(err) ?? "Could not save. Try again.";
        setError(message);
        toast.error(message);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [mutation, options.success, owner],
  );

  return { run, busy, error, clearError: () => setError(undefined) };
}

const ENTITY_KEY = "marketing:entity";
const ENTITY_EVENT = "marketing:entity-change";
function readEntity() {
  try {
    return window.localStorage.getItem(ENTITY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function useEntityContext(): [string, (id: string) => void] {
  const entities = useActionQuery<{
    entities: { id: string; archived: boolean }[];
  }>("list-entities" as never, {} as never);
  const stored = useSyncExternalStore(
    (cb) => {
      window.addEventListener(ENTITY_EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(ENTITY_EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    readEntity,
    () => "",
  );
  const known = entities.data?.entities;
  const value = stored && known?.some((e) => e.id === stored && !e.archived) ? stored : "";
  const set = useCallback((id: string) => {
    try {
      window.localStorage.setItem(ENTITY_KEY, id);
    } catch {}
    window.dispatchEvent(new Event(ENTITY_EVENT));
  }, []);
  return [value, set];
}

export function Picker({
  label,
  value,
  onChange,
  options,
  empty = "None",
  allowEmpty = true,
  disabled = false,
  className,
}: {
  label: string;
  value?: string | null;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
  empty?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select
      disabled={disabled}
      value={value || "__none"}
      onValueChange={(v) => onChange(v === "__none" ? "" : v)}
    >
      <SelectTrigger aria-label={label} className={cn("w-auto min-w-32", className)}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none">{empty}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function LinesInput({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <Textarea
      id={id}
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}

export function Status({
  loading,
  error,
  empty,
  children,
}: {
  loading?: boolean;
  error?: unknown;
  empty?: ReactNode;
  children?: ReactNode;
}) {
  if (loading)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading…
      </p>
    );
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {actionErrorMessage(error) ?? "Could not load this view."}
      </p>
    );
  if (empty) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <>{children}</>;
}

const STATE_STYLES: Record<string, string> = {
  draft: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  approved: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  published: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  deferred: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  rejected: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100",
  archived: "bg-muted text-muted-foreground",
};
export function StateBadge({ state }: { state: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STATE_STYLES[state])}>
      {state.replace(/_/g, " ")}
    </Badge>
  );
}

export function DestinationBadge({
  account,
}: {
  account?: { name: string; handle?: string; channelKind?: string } | null;
}) {
  if (!account) return null;
  const label = account.channelKind === "x" && account.handle ? `@${account.handle}` : account.name;
  return (
    <Badge variant="secondary" title={`Destination: ${account.name}`}>
      {account.channelKind ? `${account.channelKind.toUpperCase()} · ` : ""}
      {label}
    </Badge>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const when = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
