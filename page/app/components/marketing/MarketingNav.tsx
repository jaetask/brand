import { PLAN_LEVELS, PLAN_LEVEL_TITLES, type Entity, type EntityDetail } from "@shared/marketing";
import {
  IconArrowDown,
  IconArrowUp,
  IconQuote,
  type IconSun,
  IconTarget,
} from "@tabler/icons-react";
import { actionErrorMessage, useActionMutation, useActionQuery } from "@shims/use-action";
import type { ReactNode } from "react";
import { Link, useLocation } from "@shims/react-router";
import { toast } from "sonner";

import { BrandPicture } from "@/components/marketing/BrandPicture";
import { ACTION_SECTIONS, planComplete } from "@/components/marketing/entity-sections";
import { EntityIcon } from "@/components/marketing/EntityIcon";
import { useSeasons } from "@/components/marketing/plan/season";
import { useEntityContext, useOwner } from "@/components/marketing/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const NAV_ITEMS: { to: string; label: string; icon: typeof IconSun }[] = [];

const itemClass =
  "flex min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-sidebar-accent aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium";
const groupLabel =
  "px-[10px] pb-[6px] pt-[14px] text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground";

export function MarketingNav({ collapsed }: { collapsed: boolean }) {
  const owner = useOwner();
  const { pathname } = useLocation();
  const [entityId, setEntity] = useEntityContext();
  const entities = useActionQuery<{ entities: Entity[] }>("list-entities", {});
  const active = (entities.data?.entities ?? [])
    .filter((e) => !e.archived)
    .sort(
      (a, b) => a.navOrder - b.navOrder || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
    );

  const reorder = useActionMutation<unknown, Record<string, unknown>>("reorder-entities" as never, {
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not save. Please retry."),
  });
  async function move(id: string, target: number) {
    if (reorder.isPending) return;
    const next = [...active];
    const from = next.findIndex((e) => e.id === id);
    if (from < 0 || from === target || target < 0 || target >= next.length) return;
    next.splice(target, 0, next.splice(from, 1)[0]);
    try {
      await reorder.mutateAsync({
        entities: next.map((e) => ({ id: e.id, expectedVersion: e.version })),
        by: owner?.id ?? "",
      });
    } catch {
    } finally {
      await entities.refetch();
    }
  }
  const routeEntity = /^\/entities\/([^/]+)/.exec(pathname)?.[1];
  const current = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const selectedId = routeEntity ?? entityId;
  return (
    <div className={cn("grid gap-1 pb-4", collapsed ? "px-1" : "px-3")}>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          title={label}
          aria-current={current(to) ? "page" : undefined}
          className={itemClass}
        >
          <Icon size={16} />
          {!collapsed && label}
        </Link>
      ))}
      <div
        className={cn(
          "mt-3 flex items-center justify-between",
          collapsed ? "justify-center" : "px-3",
        )}
      >
        {!collapsed && (
          <Link
            to="/entities"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            Brands
          </Link>
        )}
      </div>
      {active.map((e, index) => (
        <EntityNode
          key={e.id}
          entity={e}
          index={index}
          count={active.length}
          busy={reorder.isPending}
          onMove={(target) => void move(e.id, target)}
          collapsed={collapsed}
          selected={selectedId === e.id}
          onSelect={() => setEntity(e.id)}
          pathname={pathname}
        />
      ))}
      {!collapsed && entities.data && !active.length && (
        <Link
          to="/entities"
          className="px-3 py-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Create your first entity
        </Link>
      )}
    </div>
  );
}

function EntityNode({
  entity,
  index,
  count,
  busy,
  onMove,
  collapsed,
  selected,
  onSelect,
  pathname,
}: {
  entity: Entity;
  index: number;
  count: number;
  busy: boolean;
  onMove: (target: number) => void;
  collapsed: boolean;
  selected: boolean;
  onSelect: () => void;
  pathname: string;
}) {
  const base = `/entities/${entity.id}`;
  const detail = useActionQuery<EntityDetail>(
    "get-entity",
    { id: entity.id },
    { enabled: !collapsed || selected },
  );
  const complete = detail.data ? planComplete(detail.data) : null;
  const here = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  if (!selected)
    return collapsed ? (
      <Link
        to={base}
        onClick={onSelect}
        title={entity.name}
        aria-label={entity.name}
        className={cn(itemClass, "justify-center px-0")}
      >
        <BrandPicture
          entity={entity}
          size={16}
          fallback={<EntityIcon icon={entity.icon} colour={entity.colour} />}
        />
      </Link>
    ) : (
      <div className="group flex items-center rounded-[8px] hover:bg-sidebar-accent">
        <Link
          to={base}
          onClick={onSelect}
          className={cn("flex min-h-9 min-w-0 flex-1 items-center gap-2.5", rowBox)}
        >
          <BrandPicture
            entity={entity}
            size={30}
            fallback={<BrandAvatar name={entity.name} size={30} />}
          />
          <span className="truncate text-[15px] leading-tight">{entity.name}</span>
          {complete != null && <PlanDot complete={complete} />}
        </Link>
        <Reorder entity={entity} index={index} count={count} busy={busy} onMove={onMove} />
      </div>
    );

  const setupHere = here(`${base}/seasons`) || here(`${base}/channels`);
  if (collapsed)
    return (
      <div className="grid gap-0.5 rounded-md bg-sidebar-accent/40 py-0.5">
        <Link
          to={`${base}/profile`}
          onClick={onSelect}
          title={`${entity.name} · profile`}
          aria-label={`${entity.name} profile`}
          aria-current={here(`${base}/profile`) ? "page" : undefined}
          className={cn(itemClass, "justify-center px-0")}
        >
          <BrandPicture
            entity={entity}
            size={16}
            fallback={<EntityIcon icon={entity.icon} colour={entity.colour} />}
          />
        </Link>
        <Link
          to={`${base}/beliefs`}
          onClick={onSelect}
          title="What you believe"
          aria-label="What you believe"
          aria-current={here(`${base}/beliefs`) ? "page" : undefined}
          className={cn(itemClass, "justify-center px-0")}
        >
          <IconQuote size={16} />
        </Link>
        <Link
          to={`${base}/plan`}
          onClick={onSelect}
          title="Overview"
          aria-label="Overview"
          aria-current={pathname === `${base}/plan` ? "page" : undefined}
          className={cn(itemClass, "justify-center px-0")}
        >
          <IconTarget size={16} />
        </Link>
        {ACTION_SECTIONS.map((s) => (
          <Link
            key={s.id}
            to={`${base}/${s.id}`}
            onClick={onSelect}
            title={s.label}
            aria-label={s.label}
            aria-current={here(`${base}/${s.id}`) ? "page" : undefined}
            className={cn(itemClass, "justify-center px-0")}
          >
            <s.icon size={16} />
          </Link>
        ))}
      </div>
    );
  const planHere = pathname === `${base}/plan` || pathname === `${base}/plan/history`;
  const stepHere = (level: string) =>
    pathname === `${base}/plan/${level}` || (level === "proof" && pathname === `${base}/proof`);

  return (
    <div className="grid rounded-[12px] bg-[var(--tk-card)] p-1.5">
      <div className={cn("group flex items-center", rowBox, "hover:bg-sidebar-accent")}>
        <Link
          to={`${base}/profile`}
          onClick={onSelect}
          aria-current={here(`${base}/profile`) || setupHere ? "page" : undefined}
          className="flex min-h-9 min-w-0 flex-1 items-center gap-2.5"
        >
          <BrandPicture
            entity={entity}
            size={30}
            fallback={<BrandAvatar name={entity.name} size={30} />}
          />
          <span className="truncate text-[15px] font-bold leading-tight">{entity.name}</span>
        </Link>
        <Reorder entity={entity} index={index} count={count} busy={busy} onMove={onMove} />
      </div>
      <DrawnRow
        to={`${base}/beliefs`}
        current={here(`${base}/beliefs`)}
        onSelect={onSelect}
        label="What you believe"
        sub="Lines that define your character"
      />
      <PlanGroup entityId={entity.id} />
      <div className="grid">
        <DrawnRow to={`${base}/plan`} current={planHere} onSelect={onSelect} label="Overview" />
        <div className="grid" aria-label="Plan steps">
          {PLAN_LEVELS.map((level, i) => {
            const state = detail.data?.plan.levels.find((l) => l.level === level)?.state;
            return (
              <DrawnRow
                key={level}
                to={`${base}/plan/${level}`}
                current={stepHere(level)}
                onSelect={onSelect}
                label={
                  <>
                    {i + 1}&nbsp;&nbsp;{PLAN_LEVEL_TITLES[level]}
                  </>
                }
                dot={state ? state === "done" : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const rowBox = "rounded-[8px] px-[10px] py-[7px]";
const subText = "text-[11.5px] font-normal leading-snug text-muted-foreground";

function PlanGroup({ entityId }: { entityId: string }) {
  const seasons = useSeasons(entityId);
  const n = seasons.data?.current.n;
  return <span className={groupLabel}>Plan{n ? ` · Season ${n}` : ""}</span>;
}

function BrandAvatar({ name, size }: { name: string; size: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.47) }}
      className="grid shrink-0 place-items-center rounded-full bg-[#111214] font-extrabold leading-none text-[#2fe0be] dark:bg-[#050506] dark:ring-1 dark:ring-white/15"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function PlanDot({ complete }: { complete: boolean }) {
  const label = complete ? "100%" : "Below 100%";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "ml-auto size-[9px] shrink-0 rounded-full",
        complete ? "bg-[var(--p-1a7f37)]" : "bg-[var(--p-d97706)]",
      )}
    />
  );
}

function DrawnRow({
  to,
  current,
  onSelect,
  label,
  sub,
  dot,
}: {
  to: string;
  current: boolean;
  onSelect: () => void;
  label: ReactNode;
  sub?: string;
  dot?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onSelect}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex min-w-0 items-center gap-2 text-[14px] hover:bg-sidebar-accent/70 aria-[current=page]:font-bold",
        rowBox,
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{label}</span>
        {sub && <span className={cn(subText, "truncate")}>{sub}</span>}
      </span>
      {dot != null && <PlanDot complete={dot} />}
    </Link>
  );
}

function Reorder({
  entity,
  index,
  count,
  busy,
  onMove,
}: {
  entity: Entity;
  index: number;
  count: number;
  busy: boolean;
  onMove: (target: number) => void;
}) {
  return (
    <div className="ml-auto flex shrink-0 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${entity.name} up`}
        title="Move up"
        disabled={index === 0 || busy}
        onClick={() => onMove(index - 1)}
        className="size-6 p-1 disabled:opacity-30"
      >
        <IconArrowUp size={12} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${entity.name} down`}
        title="Move down"
        disabled={index === count - 1 || busy}
        onClick={() => onMove(index + 1)}
        className="size-6 p-1 disabled:opacity-30"
      >
        <IconArrowDown size={12} />
      </Button>
    </div>
  );
}
