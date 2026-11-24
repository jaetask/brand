import { useState, type ComponentProps, type ReactNode } from "react";
import { Link } from "@shims/react-router";
import { toast } from "sonner";

import { useFromHref } from "@/components/marketing/plan/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const ink = "text-[var(--p-1f2328)]";
export const muted = "text-[var(--p-6b6a63)]";
export const card = "rounded-[14px] border border-[var(--p-e6e4dd)] bg-[var(--p-card)] p-6";
export const kicker = "text-xs font-bold uppercase tracking-[0.08em] text-[var(--p-6b6a63)]";
export const greyButton =
  "h-auto rounded-[10px] bg-[var(--p-card)] px-3.5 py-2 text-[13px] font-semibold text-[var(--p-1f2328)] hover:bg-[var(--p-e6e4dd)]";

export const greyButtonOnWhite = cn(greyButton, "bg-[var(--p-f0efe9)]");
export const chip =
  "rounded-full bg-[var(--p-f0efe9)] px-2.5 py-1 text-[13px] text-[var(--p-1f2328)]";

export function Panel({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "flex scroll-mt-24 flex-col gap-3.5 rounded-[20px] bg-[var(--p-f0efe9)] px-6 pb-6 pt-[22px]",
        ink,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-title`} className="text-xl font-extrabold">
            {title}
          </h2>
          {subtitle && <p className={cn("text-sm leading-snug", muted)}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CardLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} />;
}

export function OpenLink({
  href,
  children,
  outline = false,
}: {
  href: string;
  children: ReactNode;
  outline?: boolean;
}) {
  return (
    <Button
      asChild
      size={outline ? "sm" : undefined}
      variant={outline ? "outline" : "ghost"}
      className={outline ? undefined : greyButtonOnWhite}
    >
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    </Button>
  );
}

export function PageLink({
  to,
  children,
  disabled,
  onWhite = false,
}: {
  to: string;
  children: ReactNode;
  disabled?: boolean;
  onWhite?: boolean;
}) {
  const href = useFromHref(to);
  const cls = onWhite ? greyButtonOnWhite : greyButton;
  if (disabled)
    return (
      <Button type="button" variant="ghost" className={cls} disabled>
        {children}
      </Button>
    );
  return (
    <Button asChild variant="ghost" className={cls}>
      <Link to={href}>{children}</Link>
    </Button>
  );
}

export function EditLink({
  to,
  disabled,
  label = "Edit",
}: {
  to: string;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <PageLink to={to} disabled={disabled}>
      {label}
    </PageLink>
  );
}

export function PrimaryLink({ to, children }: { to: string; children: ReactNode }) {
  const href = useFromHref(to);
  return (
    <Button asChild>
      <Link to={href}>{children}</Link>
    </Button>
  );
}

export function PageBody({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex max-w-[75rem] flex-col gap-7">
      {action && <div className="-mt-12 flex justify-end">{action}</div>}
      {children}
    </div>
  );
}

export function ListCard({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-[var(--p-e6e4dd)] overflow-hidden rounded-[14px] border border-[var(--p-e6e4dd)] bg-[var(--p-card)]">
      {children}
    </ul>
  );
}

export function ListRow({
  to,
  children,
  aside,
}: {
  to?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const href = useFromHref(to ?? "");
  const body = <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>;
  return (
    <li className="flex items-center gap-3 px-5 py-[13px]">
      {to ? (
        <Link to={href} className="flex min-w-0 flex-1 rounded-md hover:opacity-80">
          {body}
        </Link>
      ) : (
        body
      )}
      {aside && <span className="flex shrink-0 items-center gap-2">{aside}</span>}
    </li>
  );
}

export function EmptyCard({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-dashed border-[var(--p-c9c7bf)] px-5 py-4">
      <p className={cn("text-sm", muted)}>{text}</p>
      {action}
    </div>
  );
}

export type Progress = "not-started" | "in-progress" | "done";
const DOT: Record<Progress, string> = {
  "not-started": "bg-[var(--p-c9c7bf)]",
  "in-progress": "bg-[var(--p-d97706)]",
  done: "bg-[var(--p-1a7f37)]",
};
const WORD: Record<Progress, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  done: "Done",
};

export function StatusDot({ status, label }: { status: Progress; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px]", muted)}>
      <span aria-hidden className={cn("size-2 rounded-full", DOT[status])} />
      {label ?? WORD[status]}
    </span>
  );
}

export function BackLink({ to }: { to: string }) {
  return (
    <Button asChild variant="ghost" className={greyButtonOnWhite}>
      <Link to={to}>Back</Link>
    </Button>
  );
}

export function EditFrame({
  title,
  description,
  backTo,
  children,
  onSave,
  busy,
  saveLabel = "Save",
  extra,
}: {
  title: string;
  description?: string;
  backTo: string;
  children: ReactNode;
  onSave?: () => void;
  busy?: boolean;
  saveLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <div className={cn("flex max-w-[75rem] flex-col gap-6", ink)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[26px] font-extrabold leading-tight">{title}</h2>
          {description && <p className={cn("text-sm", muted)}>{description}</p>}
        </div>
        <BackLink to={backTo} />
      </div>
      <div className="rounded-2xl border border-[var(--p-e6e4dd)] bg-[var(--p-card)] px-8 pb-2 pt-1">
        {children}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {extra && <span className="mr-auto">{extra}</span>}
        {onSave ? (
          <>
            <Button asChild variant="ghost" className={greyButtonOnWhite}>
              <Link to={backTo}>Cancel</Link>
            </Button>
            <Button type="button" disabled={busy} onClick={onSave}>
              {busy ? "Saving…" : saveLabel}
            </Button>
          </>
        ) : (
          <Button asChild>
            <Link to={backTo}>Done</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function Row({
  title,
  line,
  htmlFor,
  children,
}: {
  title: string;
  line?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 border-t border-[var(--p-e6e4dd)] py-[22px] first:border-t-0 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
      <div className="flex flex-col gap-1">
        {htmlFor ? (
          <Label htmlFor={htmlFor} className="text-[15px] font-extrabold">
            {title}
          </Label>
        ) : (
          <span className="text-[15px] font-extrabold">{title}</span>
        )}
        {line && <span className={cn("text-xs leading-snug", muted)}>{line}</span>}
      </div>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </div>
  );
}

export function ChipPicker<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; name: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Button
          key={o.id}
          type="button"
          variant="ghost"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-auto rounded-full px-3 py-1.5 text-[13px] font-semibold",
            value === o.id
              ? "bg-[var(--p-1f2328)] text-[var(--p-on-ink)] hover:bg-[var(--p-1f2328)]"
              : "bg-[var(--p-f0efe9)] text-[var(--p-1f2328)]",
          )}
        >
          {o.name}
        </Button>
      ))}
    </div>
  );
}

export function useShowMore<T>(items: T[], n = 5) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, n);
  const more =
    !all && items.length > n ? (
      <div>
        <Button type="button" variant="ghost" className={greyButton} onClick={() => setAll(true)}>
          Show all {items.length}
        </Button>
      </div>
    ) : null;
  return { shown, more };
}

export function FileButton({
  id,
  label,
  onFile,
  disabled,
  multiple,
}: {
  id: string;
  label: string;
  onFile: (f: File) => void;
  disabled?: boolean;
  multiple?: boolean;
}) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={greyButtonOnWhite}
        disabled={disabled}
        onClick={() => document.getElementById(id)?.click()}
      >
        {label}
      </Button>
      <Input
        id={id}
        type="file"
        multiple={multiple}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          for (const f of Array.from(e.target.files ?? [])) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

export const readImage =
  (fn: (f: File) => Promise<string>, done: (url: string) => void) => (f: File) =>
    void fn(f)
      .then(done)
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Could not read that image."),
      );
