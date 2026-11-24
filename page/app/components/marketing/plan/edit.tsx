import { IconGripVertical, IconPencil, IconPlus, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function useSavedFlash() {
  const [flash, setFlash] = useState<string>("");
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  const show = (r: unknown) => {
    if (!r) return;
    setFlash("✓ Saved");
    clearTimeout(t.current);
    t.current = setTimeout(() => setFlash(""), 2000);
  };
  return [flash, show] as const;
}

export function SavedFlash({ text }: { text: string }) {
  return text ? (
    <span role="status" className="text-xs font-bold text-[var(--p-1a7f37)]">
      {text}
    </span>
  ) : null;
}

export function InlineText({
  value,
  save,
  label,
  placeholder = "Add an answer",
  multiline = false,
  disabled = false,
  className,
  id,
  clamp,
  display,
}: {
  display?: (v: string) => ReactNode;

  clamp?: number;
  value: string;
  save: (v: string) => Promise<unknown>;

  label: string;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;

  className?: string;
  id?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  const [flash, showFlash] = useSavedFlash();
  const [more, setMore] = useState(false);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const rest = useRef<HTMLButtonElement>(null);
  const [restHeight, setRestHeight] = useState(0);
  useEffect(() => {
    if (!editing) setShown(value);
  }, [value, editing]);
  useEffect(() => {
    const el = ref.current;
    if (!editing || !multiline || !el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(restHeight, el.scrollHeight)}px`;
  }, [draft, editing, multiline, restHeight]);
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const end = ref.current.value.length;
      ref.current.setSelectionRange(end, end);
    }
  }, [editing]);
  const open = () => {
    if (disabled) return;

    setRestHeight(rest.current?.offsetHeight ?? 0);
    setDraft(shown);
    setEditing(true);
  };
  const commit = async () => {
    setEditing(false);
    const v = draft.trim();
    if (v === shown.trim()) return;
    setShown(v);
    showFlash(await save(v));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setDraft(shown);
      setEditing(false);
    } else if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
      e.preventDefault();
      void commit();
    }
  };
  const box = "rounded-xl px-3 py-2 -mx-3 -my-2";
  return (
    <div id={id} className="grid w-full min-w-0 flex-1 scroll-mt-24 gap-1">
      {editing ? (
        multiline ? (
          <Textarea
            ref={ref}
            aria-label={label}
            value={draft}
            rows={1}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={onKey}
            className={cn(
              box,
              "w-[calc(100%+1.5rem)] min-h-0 resize-none overflow-hidden border-2 border-[var(--p-1f2328)] bg-[var(--p-card)] shadow-none focus-visible:ring-0",
              className,
            )}
          />
        ) : (
          <Input
            ref={ref}
            aria-label={label}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={onKey}
            style={restHeight ? { minHeight: restHeight } : undefined}
            className={cn(
              box,
              "h-auto w-[calc(100%+1.5rem)] border-2 border-[var(--p-1f2328)] bg-[var(--p-card)] shadow-none focus-visible:ring-0",
              className,
            )}
          />
        )
      ) : (
        <Button
          ref={rest}
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={open}
          aria-label={`${label}: ${shown || "not answered"}. Click to change.`}
          className={cn(
            box,
            "group relative h-auto w-[calc(100%+1.5rem)] justify-start whitespace-pre-wrap border border-transparent text-left font-[inherit] hover:border-dashed hover:border-[var(--p-c9c7bf)] hover:bg-[var(--p-fbfbf9)] disabled:opacity-100",
            className,
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1",
              !shown && "font-normal text-[var(--p-8c8b84)]",
              clamp && !more && "line-clamp-3",
            )}
            style={clamp && !more ? { WebkitLineClamp: clamp } : undefined}
          >
            {shown ? (display ? display(shown) : shown) : placeholder}
          </span>
          {!disabled && (
            <IconPencil
              size={12}
              className="absolute right-2 top-2 text-[var(--p-6b6a63)] opacity-0 group-hover:opacity-100"
              aria-hidden
            />
          )}
        </Button>
      )}
      {clamp && !editing && shown.length > clamp * 30 && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto w-fit p-0 text-xs text-[var(--p-6b6a63)]"
          onClick={() => setMore(!more)}
        >
          {more ? "less" : "more"}
        </Button>
      )}
      {editing && draft !== shown && (
        <span className="mt-1.5 text-xs text-[var(--p-6b6a63)]">
          {multiline
            ? "Enter to save · Shift+Enter for a new line · Esc to undo"
            : "Enter to save · Esc to undo"}
        </span>
      )}
      <SavedFlash text={flash} />
    </div>
  );
}

export function ListEdit({
  items,
  save,
  label,
  addLabel,
  disabled = false,
  render,
  rowClassName,
}: {
  items: string[];
  save: (v: string[]) => Promise<unknown>;
  label: string;
  addLabel: string;
  disabled?: boolean;

  render?: (item: string, i: number) => ReactNode;
  rowClassName?: string;
}) {
  const [list, setList] = useState(items);
  const [adding, setAdding] = useState("");
  const [drag, setDrag] = useState<number | null>(null);
  const [flash, showFlash] = useSavedFlash();
  const key = JSON.stringify(items);
  useEffect(() => setList(JSON.parse(key) as string[]), [key]);
  const commit = async (next: string[]) => {
    const clean = next.map((x) => x.trim()).filter(Boolean);
    setList(clean);
    showFlash(await save(clean));
  };
  return (
    <div className="flex flex-col" aria-label={label}>
      {list.map((item, i) => (
        <div
          key={`${i}-${item}`}
          className={cn(
            "flex items-start gap-3 border-t border-[var(--p-f0efe9)] py-2.5",
            drag === i && "opacity-50",
            rowClassName,
          )}
          draggable={!disabled}
          onDragStart={() => setDrag(i)}
          onDragEnd={() => setDrag(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (drag == null || drag === i) return;
            const next = [...list];
            next.splice(i, 0, next.splice(drag, 1)[0]);
            setDrag(null);
            void commit(next);
          }}
        >
          {!disabled && (
            <IconGripVertical
              size={16}
              className="mt-1 shrink-0 cursor-grab text-[var(--p-c9c7bf)]"
              aria-hidden
            />
          )}
          <div className="min-w-0 flex-1">
            {render ? render(item, i) : null}
            <InlineText
              label={`${label} ${i + 1}`}
              value={item}
              disabled={disabled}
              save={(v) =>
                commit(v ? list.map((x, j) => (j === i ? v : x)) : list.filter((_, j) => j !== i))
              }
              className="text-[15px]"
            />
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-[var(--p-c9c7bf)] hover:text-[var(--p-1f2328)]"
              aria-label={`Remove ${item}`}
              onClick={() => void commit(list.filter((_, j) => j !== i))}
            >
              <IconX size={14} />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="flex items-center gap-3 border-t border-[var(--p-f0efe9)] py-2.5 text-[15px] text-[var(--p-6b6a63)]">
          <IconPlus size={16} className="shrink-0" aria-hidden />
          <Input
            aria-label={addLabel}
            placeholder={addLabel}
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && adding.trim()) {
                e.preventDefault();
                const v = adding.trim();
                setAdding("");
                void commit([...list, v]);
              }
            }}
            onBlur={() => {
              if (adding.trim()) {
                const v = adding.trim();
                setAdding("");
                void commit([...list, v]);
              }
            }}
            className="h-auto border-0 p-0 text-[15px] shadow-none placeholder:text-[var(--p-6b6a63)] focus-visible:ring-0"
          />
        </div>
      )}
      <SavedFlash text={flash} />
    </div>
  );
}

export function Suggestion({
  label,
  source,
  text,
  onUse,
  onDismiss,
  disabled = false,
}: {
  label: string;
  source?: string;
  text: string;
  onUse: (text: string) => Promise<unknown> | void;
  onDismiss: () => Promise<unknown> | void;
  disabled?: boolean;
}) {
  const [mine, setMine] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--p-c8dcf5)] bg-[var(--p-f5f9ff)] px-[18px] py-4">
      <span className="flex items-center gap-2">
        <span className="rounded-full bg-[var(--p-eef5ff)] px-2.5 py-1 text-xs font-semibold text-[var(--p-0b4a8f)]">
          {label}
        </span>
        {source && <span className="text-xs text-[var(--p-6b6a63)]">{source}</span>}
      </span>
      {mine == null ? (
        <span className="text-[15px] leading-normal text-[var(--p-1f2328)]">{text}</span>
      ) : (
        <Textarea
          aria-label={`${label}, in your words`}
          value={mine}
          onChange={(e) => setMine(e.target.value)}
          rows={3}
          className="border-2 border-[var(--p-1f2328)] bg-[var(--p-card)] text-[15px]"
          autoFocus
        />
      )}
      {!disabled && (
        <span className="flex flex-wrap items-center gap-2">
          {mine == null ? (
            <>
              <Button
                size="sm"
                className="bg-[var(--p-1f2328)] text-[var(--p-on-ink)] hover:bg-[var(--p-1f2328)]/90"
                onClick={() => void onUse(text)}
              >
                Use this
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMine(text)}>
                Say it my way
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                className="bg-[var(--p-1f2328)] text-[var(--p-on-ink)] hover:bg-[var(--p-1f2328)]/90"
                disabled={!mine.trim()}
                onClick={() => void onUse(mine.trim())}
              >
                Save my version
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMine(null)}>
                Back
              </Button>
            </>
          )}
          <Button
            variant="link"
            size="sm"
            className="ml-1.5 h-auto p-0 text-[13px] text-[var(--p-6b6a63)] underline underline-offset-[3px]"
            onClick={() => void onDismiss()}
          >
            Keep mine
          </Button>
        </span>
      )}
    </div>
  );
}
