import type { LevelStatus } from "@shared/marketing";
import { IconCheck } from "@tabler/icons-react";
import { Fragment } from "react";

import { IN_PROGRESS, PASSED } from "@/components/marketing/plan/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "brand";

function goTo(key: string) {
  const el = document.getElementById(`check-${key}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.querySelector<HTMLElement>("input, textarea, button, [role=combobox], a")?.focus({
    preventScroll: true,
  });
  el.classList.add("ring-2", IN_PROGRESS.ring);
  setTimeout(() => el.classList.remove("ring-2", IN_PROGRESS.ring), 1400);
}

export function Pipeline({
  status,
  brand,
  onWaiting,
}: {
  status: LevelStatus;
  brand: string;
  onWaiting?: (key: string) => void;
}) {
  const items = status.items;
  const passed = items.filter((x) => x.ok).length;
  const all = passed === items.length;
  return (
    <div className="grid gap-0 overflow-hidden rounded-[10px] border border-[var(--p-d0d7de)] bg-[var(--p-card)] text-[var(--p-1f2328)] [color-scheme:light]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--p-d0d7de)] px-5 py-4">
        <div className="grid gap-1">
          <span className="font-mono text-sm text-[var(--p-57606a)]">
            {slug(brand)} / plan · step-{status.n}-{status.level}
          </span>
          <span className="flex items-center gap-1.5 text-[17px] font-bold">
            {all ? (
              <>
                <IconCheck size={16} className="text-[var(--p-1a7f37)]" /> All checks have passed
              </>
            ) : (
              `${passed} of ${items.length} checks passed`
            )}
          </span>
        </div>
        <span
          className="inline-flex overflow-hidden rounded-md font-mono text-[13px] font-semibold leading-6 text-white"
          aria-label={`plan ${passed} of ${items.length}${all ? ", passing" : ""}`}
        >
          <span className="bg-[#555] px-2">plan</span>
          <span className={cn("px-2", all ? PASSED.bg : IN_PROGRESS.bg)}>
            {all ? "passing" : `${passed}/${items.length}`}
          </span>
        </span>
      </div>
      <div className="overflow-x-auto bg-[var(--p-f6f8fa)] p-5">
        <ol className="flex w-full min-w-max items-start lg:min-w-0" aria-label="Checks">
          {items.map((x, i) => {
            const wireOn = i > 0 && items[i - 1].ok && x.ok;
            return (
              <Fragment key={x.key}>
                {i > 0 && (
                  <li
                    aria-hidden
                    className={cn(
                      "mt-[26px] h-0.5 min-w-2.5 flex-[0_1_48px]",
                      wireOn ? "bg-[var(--p-1a7f37)]" : "bg-[var(--p-d0d7de)]",
                    )}
                  />
                )}
                <li className="shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => (!x.ok && onWaiting ? onWaiting(x.key) : goTo(x.key))}
                    title={`${x.label}: ${x.ok ? "passed" : "waiting"}`}
                    className="h-auto flex-col gap-2 rounded-lg border border-[var(--p-d0d7de)] bg-[var(--p-card)] px-3.5 py-2.5 font-normal text-[var(--p-1f2328)] shadow-none hover:bg-[var(--p-f3f4f6)]"
                  >
                    <span
                      className={cn(
                        "flex size-[22px] items-center justify-center rounded-full",
                        x.ok
                          ? "bg-[var(--p-1a7f37)] text-white"
                          : "border-2 border-dashed border-[var(--p-8c959f)] bg-[var(--p-card)]",
                      )}
                    >
                      {x.ok && <IconCheck size={13} stroke={3} />}
                    </span>
                    <span className="font-mono text-sm font-medium">{x.key}</span>
                  </Button>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </div>
      <ol
        className="grid gap-0.5 border-t border-[var(--p-d0d7de)] bg-[var(--p-f6f8fa)] px-5 py-3.5 font-mono text-sm leading-[1.75]"
        aria-label="Log"
      >
        {items.map((x) => (
          <li
            key={x.key}
            className={cn(
              "whitespace-pre",
              x.ok ? "text-[var(--p-1f2328)]" : "text-[var(--p-59636e)]",
            )}
          >
            <span className={x.ok ? "text-[var(--p-1a7f37)]" : ""}>{x.ok ? "✓" : "○"}</span> {x.key}
            {"  "}
            <span className="text-[var(--p-6e7781)]">
              {x.ok ? "passed" : "waiting for your answer"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
