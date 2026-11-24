import { EmptyLine, PROJECT_ICONS } from "@jaetask/toolkit/suite";
import { Badge } from "@jaetask/toolkit/ui/badge";
import { Button } from "@jaetask/toolkit/ui/button";
import { Checkbox } from "@jaetask/toolkit/ui/checkbox";
import { Input } from "@jaetask/toolkit/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@jaetask/toolkit/ui/select";
import { Textarea } from "@jaetask/toolkit/ui/textarea";
import { toast } from "@jaetask/toolkit/hooks";
import { ToggleGroup, ToggleGroupItem } from "@jaetask/toolkit/ui/toggle-group";
import { IconPlus, IconX } from "@tabler/icons-react";
import { type ReactNode, useRef, useState } from "react";
import { call, type Outcome, refusal, succeeded } from "./api.js";

const OLD_ICONS: Record<string, string> = {
  "building-store": "folder",
  user: "person",
  world: "globe",
  speakerphone: "flag",
};

export const brandIcon = (icon: string) => {
  const name = OLD_ICONS[icon] ?? icon;
  return (PROJECT_ICONS as readonly string[]).includes(name) ? name : "folder";
};

export const day = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export async function act(action: string, input: unknown, done?: string): Promise<Outcome> {
  const outcome = await call(action, input);
  if (succeeded(outcome)) {
    if (done) toast({ title: done });
  } else {
    toast({ title: "Not saved", description: refusal(outcome), variant: "destructive" });
  }
  return outcome;
}

export function Text({ children }: { children: ReactNode }) {
  return <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{children}</p>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm text-muted-foreground">{children}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm text-muted-foreground italic">{children}</p>;
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

export function Pill({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "done" | "partial" | undefined;
}) {
  return (
    <Badge variant={tone === "done" ? "default" : tone === "partial" ? "secondary" : "outline"}>
      {children}
    </Badge>
  );
}

export function Field({
  id,
  value,
  onChange,
  placeholder,
  long,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  long?: boolean;
}) {
  return long ? (
    <Textarea
      id={id}
      value={value}
      rows={4}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <Input
      id={id}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

let lastKey = 0;
function useKeys(length: number) {
  const ref = useRef<string[]>([]);
  while (ref.current.length < length) ref.current.push(`k${++lastKey}`);
  return {
    at: (i: number) => ref.current[i] ?? `k${i}`,
    remove: (i: number) => {
      ref.current.splice(i, 1);
    },
  };
}

export function Lines({
  id,
  value,
  onChange,
  placeholder,
  add = "Add",
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  add?: string;
}) {
  const keys = useKeys(value.length);
  return (
    <div className="grid gap-2" id={id}>
      {value.map((line, i) => (
        <div key={keys.at(i)} className="flex items-start gap-2">
          <Textarea
            aria-label={`${placeholder ?? "Line"} ${i + 1}`}
            value={line}
            rows={1}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${i + 1}`}
            onClick={() => {
              keys.remove(i);
              onChange(value.filter((_, j) => j !== i));
            }}
          >
            <IconX size={16} />
          </Button>
        </div>
      ))}
      <div>
        <Button variant="outline" size="sm" onClick={() => onChange([...value, ""])}>
          <IconPlus size={14} /> {add}
        </Button>
      </div>
    </div>
  );
}

export function Rows<T>({
  id,
  value,
  onChange,
  blank,
  render,
  add = "Add",
}: {
  id: string;
  value: T[];
  onChange: (v: T[]) => void;
  blank: () => T;
  render: (row: T, set: (patch: Partial<T>) => void, i: number) => ReactNode;
  add?: string;
}) {
  const keys = useKeys(value.length);
  return (
    <div className="grid gap-3" id={id}>
      {value.map((row, i) => (
        <div key={keys.at(i)} className="grid gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{i + 1}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${i + 1}`}
              onClick={() => {
                keys.remove(i);
                onChange(value.filter((_, j) => j !== i));
              }}
            >
              <IconX size={16} />
            </Button>
          </div>
          {render(
            row,
            (patch) => onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : v))),
            i,
          )}
        </div>
      ))}
      <div>
        <Button variant="outline" size="sm" onClick={() => onChange([...value, blank()])}>
          <IconPlus size={14} /> {add}
        </Button>
      </div>
    </div>
  );
}

export function Pick<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; name: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label={label}
      className="flex-wrap justify-start"
      value={value}
      onValueChange={(v) => onChange(v as T)}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.id || "none"} value={o.id}>
          {o.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

const NONE = "__none";
export function Choose({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger id={id} aria-label={label} className="w-auto min-w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id || NONE} value={o.id || NONE}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Tick({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );
}

export function useDraft<T>(initial: T) {
  const [draft, setDraft] = useState<T>(initial);
  const set = (patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch }));
  return [draft, set, setDraft] as const;
}

export const lines = (v: string[]) => v.map((s) => s.trim()).filter(Boolean);

export function NothingYet({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-3">
      <EmptyLine>{text}</EmptyLine>
      {action}
    </div>
  );
}
