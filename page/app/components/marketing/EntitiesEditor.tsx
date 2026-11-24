import { defaultAppearance } from "@shared/entity-appearance";
import type { Entity } from "@shared/marketing";
import { IconChevronRight, IconGripVertical } from "@tabler/icons-react";
import { actionErrorMessage, useActionMutation, useActionQuery } from "@shims/use-action";
import { useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "@shims/react-router";
import { toast } from "sonner";

import { toDataUrl } from "@/components/marketing/BrandPicture";
import { DeleteDialog } from "@/components/marketing/DeleteDialog";
import { AppearancePicker, EntityIcon } from "@/components/marketing/EntityIcon";
import { PageLink } from "@/components/marketing/kit/page";
import { useSeasons } from "@/components/marketing/plan/season";
import { Status, useEntityContext, useOwner, useWrite } from "@/components/marketing/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const muted = "text-[var(--p-6b6a63)]";
const greyButton =
  "h-auto rounded-[10px] bg-[var(--p-f0efe9)] px-3.5 py-2 text-[13px] font-semibold text-[var(--p-1f2328)] hover:bg-[var(--p-e6e4dd)]";

const byOrder = (a: Entity, b: Entity) =>
  a.navOrder - b.navOrder || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

export function EntityAvatar({
  entity,
  size,
}: {
  entity: Pick<Entity, "image" | "icon" | "colour">;
  size: number;
}) {
  if (entity.image)
    return (
      <img
        src={entity.image}
        alt=""
        aria-hidden
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: `${entity.colour}1a` }}
    >
      <EntityIcon icon={entity.icon} colour={entity.colour} size={Math.round(size * 0.5)} />
    </span>
  );
}

function SeasonLine({ entity }: { entity: Entity }) {
  const q = useSeasons(entity.id);
  if (entity.archived) return <>Hidden from the sidebar</>;
  const v = q.data;
  if (!v?.seasons.length) return <>{q.isLoading ? " " : "No season yet"}</>;
  return <>Season {v.current.n} now</>;
}

export function EntitiesEditor() {
  const query = useActionQuery<{ entities: Entity[] }>("list-entities", {
    includeArchived: true,
  });
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const owner = useOwner();
  const reorder = useActionMutation<unknown, Record<string, unknown>>("reorder-entities" as never, {
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not save. Please retry."),
  });
  const all = query.data?.entities ?? [];
  const active = all.filter((e) => !e.archived).sort(byOrder);
  const archived = all.filter((e) => e.archived).sort(byOrder);
  const list = [...active, ...archived];
  const selectedId = params.get("entity");
  const selected = creating ? undefined : (list.find((e) => e.id === selectedId) ?? list[0]);
  const pick = (id: string) => {
    setCreating(false);
    setParams({ entity: id }, { replace: true });
  };
  async function drop(targetId: string) {
    const id = dragId;
    setDragId(null);
    if (!id || id === targetId || reorder.isPending) return;
    const next = [...active];
    const from = next.findIndex((e) => e.id === id);
    const to = next.findIndex((e) => e.id === targetId);
    if (from < 0 || to < 0) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    try {
      await reorder.mutateAsync({
        entities: next.map((e) => ({ id: e.id, expectedVersion: e.version })),
        by: owner?.id ?? "",
      });
    } catch {
    } finally {
      await query.refetch();
    }
  }
  return (
    <div className="flex w-full min-w-0 max-w-[75rem] flex-col gap-7 p-6 text-[var(--p-1f2328)]">
      <div className={cn("-mb-3 flex justify-end text-[13px]", muted)}>
        <Button
          type="button"
          variant="link"
          className={cn("h-auto p-0 text-[13px]", muted, "hover:text-foreground")}
          onClick={() => navigate(-1)}
        >
          ← Back
        </Button>
      </div>
      <Status loading={query.isLoading} error={query.error}>
        <div className="grid items-start gap-7 lg:grid-cols-[300px_minmax(0,1fr)]">
          <nav
            aria-label="Entities"
            className="flex flex-col gap-1.5 rounded-2xl bg-[var(--p-f0efe9)] p-2.5"
          >
            {list.map((e) => {
              const on = e.id === selected?.id;
              return (
                <div
                  key={e.id}
                  draggable={!e.archived}
                  onDragStart={(ev) => {
                    setDragId(e.id);
                    ev.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(ev) => {
                    if (dragId && !e.archived) ev.preventDefault();
                  }}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    void drop(e.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                  className={cn("rounded-xl", dragId === e.id && "opacity-50")}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    aria-current={on ? "true" : undefined}
                    onClick={() => pick(e.id)}
                    className={cn(
                      "h-auto w-full items-center justify-start gap-3 rounded-xl px-3.5 py-3 text-left font-normal hover:bg-[var(--p-card)]/70",
                      on &&
                        "bg-[var(--p-card)] shadow-[0_0_0_1.5px_var(--p-1f2328)] hover:bg-[var(--p-card)]",
                      e.archived && "opacity-60",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("shrink-0", muted, e.archived ? "invisible" : "cursor-grab")}
                      title="Drag to reorder"
                    >
                      <IconGripVertical size={16} />
                    </span>
                    <EntityAvatar entity={e} size={36} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-extrabold">{e.name}</span>
                      <span className={cn("truncate text-[13px]", muted)}>
                        <SeasonLine entity={e} />
                      </span>
                    </span>
                    {e.archived && (
                      <span className="shrink-0 rounded-full bg-[var(--p-e6e4dd)] px-2.5 py-1 text-xs font-semibold text-[var(--p-4a4943)]">
                        Archived
                      </span>
                    )}
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="mt-2 rounded-[10px] bg-[var(--p-card)]"
              onClick={() => setCreating(true)}
            >
              + New entity
            </Button>
          </nav>
          <div className="min-w-0 rounded-2xl border border-[var(--p-e6e4dd)] bg-[var(--p-card)] px-8 py-7">
            {creating || !selected ? (
              <NewEntity onCancel={list.length ? () => setCreating(false) : undefined} />
            ) : (
              <EntityForm key={selected.id} entity={selected} />
            )}
          </div>
        </div>
      </Status>
    </div>
  );
}

function Group({ title, line, children }: { title: string; line?: string; children: ReactNode }) {
  return (
    <div className="grid gap-6 border-t border-[var(--p-e6e4dd)] py-[22px] xl:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-extrabold">{title}</span>
        {line && <span className={cn("text-xs leading-snug", muted)}>{line}</span>}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function PictureInput({ id, onFile }: { id: string; onFile: (dataUrl: string) => void }) {
  return (
    <Input
      id={id}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file)
          void toDataUrl(file)
            .then(onFile)
            .catch((err: unknown) =>
              toast.error(err instanceof Error ? err.message : "Could not read that image."),
            );
      }}
    />
  );
}

function EntityForm({ entity }: { entity: Entity }) {
  const save = useWrite<Entity>("save-entity");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
        <div className="flex items-center gap-4">
          <EntityAvatar entity={entity} size={56} />
          <div className="flex flex-col gap-1">
            <span className="text-[26px] font-extrabold leading-tight">{entity.name}</span>
            <span className={cn("text-[13px]", muted)}>
              <SeasonLine entity={entity} />
            </span>
          </div>
        </div>
        {!entity.archived && (
          <PageLink to={`/entities/${entity.id}/profile`}>
            Open profile <IconChevronRight size={14} />
          </PageLink>
        )}
      </div>
      <Group
        title="Archive"
        line={
          entity.archived
            ? "Archived: hidden from the sidebar. Delete removes it and everything under it for good."
            : "Archived entities leave the sidebar. Nothing is deleted."
        }
      >
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className={greyButton}
            disabled={save.busy}
            onClick={() =>
              void save.run({
                id: entity.id,
                expectedVersion: entity.version,
                archived: !entity.archived,
              })
            }
          >
            {entity.archived ? "Restore" : "Archive"}
          </Button>
          {entity.archived && (
            <Button
              type="button"
              variant="ghost"
              className={greyButton}
              onClick={() => setDeleting(true)}
            >
              Delete
            </Button>
          )}
        </div>
        <DeleteDialog
          kind="entity"
          id={entity.id}
          name={entity.name}
          typeName
          open={deleting}
          onOpenChange={setDeleting}
          onDeleted={() => navigate("/entities", { replace: true })}
        />
      </Group>
    </div>
  );
}

function NewEntity({ onCancel }: { onCancel?: () => void }) {
  const save = useWrite<Entity>("save-entity", { success: "Entity created" });
  const [, setEntity] = useEntityContext();
  const navigate = useNavigate();
  const [f, setF] = useState<{
    name: string;
    image: string;
    icon: string;
    colour: string;
  }>(() => ({ name: "", image: "", ...defaultAppearance(String(Date.now())) }));
  const preview = { image: f.image, icon: f.icon, colour: f.colour };
  return (
    <form
      className="flex flex-col"
      onSubmit={async (e) => {
        e.preventDefault();
        const created = await save.run({
          name: f.name.trim(),
          icon: f.icon,
          colour: f.colour,
          ...(f.image ? { image: f.image } : {}),
        });
        if (created) {
          setEntity(created.id);
          navigate(`/entities/${created.id}/profile`);
        }
      }}
    >
      <div className="flex items-center gap-4 pb-5">
        <EntityAvatar entity={preview} size={56} />
        <span className="text-[26px] font-extrabold leading-tight">New entity</span>
      </div>
      <Group title="Name" line="What you call this entity.">
        <Input
          aria-label="Name"
          autoFocus
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          className="h-auto rounded-[10px] border-[var(--p-d6d4cc)] px-3 py-2.5 text-[17px] font-bold"
        />
        <span className={cn("text-xs", muted)}>Shown in the sidebar. Each name is unique.</span>
      </Group>
      <Group title="Picture" line="Optional. PNG, JPEG or WebP. Cropped square.">
        <div className="flex items-center gap-4">
          {f.image ? (
            <EntityAvatar entity={preview} size={64} />
          ) : (
            <Button
              type="button"
              variant="ghost"
              aria-label="Upload picture"
              onClick={() => document.getElementById("new-entity-picture")?.click()}
              className={cn(
                "size-16 rounded-full border-2 border-dashed border-[var(--p-d6d4cc)] p-0 text-2xl",
                muted,
              )}
            >
              +
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className={greyButton}
            onClick={() => document.getElementById("new-entity-picture")?.click()}
          >
            {f.image ? "Change picture" : "Upload picture"}
          </Button>
          {f.image && (
            <Button
              type="button"
              variant="link"
              className={cn("h-auto p-0 text-[13px]", muted)}
              onClick={() => setF({ ...f, image: "" })}
            >
              Remove
            </Button>
          )}
          <PictureInput
            id="new-entity-picture"
            onFile={(image) => setF((x) => ({ ...x, image }))}
          />
        </div>
      </Group>
      <Group title="Icon and colour" line="Shown when there's no picture.">
        <AppearancePicker
          idp="new-entity"
          icon={f.icon}
          colour={f.colour}
          onChange={(v) => setF({ ...f, ...v })}
        />
      </Group>
      <div className="flex justify-end gap-2 border-t border-[var(--p-e6e4dd)] pt-[22px]">
        {onCancel && (
          <Button type="button" variant="ghost" className={greyButton} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={save.busy || !f.name.trim()}
          className="h-auto rounded-[10px] px-4 py-2 text-[13px] font-semibold"
        >
          Create and open profile
        </Button>
      </div>
    </form>
  );
}
