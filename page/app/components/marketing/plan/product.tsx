import type { EntityDetail, FreeProduct } from "@shared/marketing";
import { IconArrowDown, IconArrowUp, IconMicrophone, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "@shims/react-router";

import {
  EditFrame,
  EditLink,
  EmptyCard,
  ListCard,
  ListRow,
  PageLink,
  Panel,
  Row,
  StatusDot,
  card,
  greyButtonOnWhite,
  muted,
} from "@/components/marketing/kit/page";
import { GAP_HINTS } from "@/components/marketing/plan/hints";
import { usePlanSave, type PlanSave } from "@/components/marketing/plan/kit";
import { useSeasons } from "@/components/marketing/plan/season";
import { stepEditPath, type StepEditProps } from "@/components/marketing/plan/step-edit";
import { useWrite } from "@/components/marketing/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = { detail: EntityDetail; save: PlanSave; disabled: boolean };
type SeasonsData = NonNullable<ReturnType<typeof useSeasons>["data"]>;

const blankProduct = (): FreeProduct => ({
  name: "",
  hook: "",
  url: "",
  delivers: "unknown",
  fixes: "",
});

function mainProduct(products: FreeProduct[]) {
  const i = products.findIndex((p) => !p.shelved);
  return { main: i >= 0 ? products[i] : undefined, index: i };
}

function seasonColumns(view: SeasonsData) {
  const cur = view.current.n;
  const count = Math.max(cur + 2, view.seasons.length, ...view.ideas.map((x) => x.n));
  return Array.from({ length: count - cur + 1 }, (_, i) => cur + i);
}

export function ProductWork({ detail, save, disabled }: Props) {
  const entityId = detail.entity.id;
  const products = detail.guidance.plan.product.freeProducts;
  const { main, index } = mainProduct(products);
  const shelf = products.map((p, i) => ({ p, i })).filter((x) => x.p.shelved);
  const seasons = useSeasons(entityId);
  const target = seasons.data?.current.target ?? detail.plan.seasonTarget ?? 8;
  const apps = (detail.guidance.plan.belt.apps ?? [])
    .filter((a) => !/^talk$/i.test(a.name))
    .map((a) => a.name);
  const edit = (part: string) => stepEditPath(entityId, "product", part);
  const updateMain = (patch: Partial<FreeProduct>) =>
    save({
      freeProducts: products.map((p, j) => (j === index ? { ...p, ...patch } : p)),
    });
  const gates = main?.gates ?? [];
  const later = main?.later ?? [];

  return (
    <div className="flex flex-col gap-7">
      <Panel
        id="check-free-product"
        title="Your free product"
        action={main ? <EditLink to={edit("product")} disabled={disabled} /> : undefined}
      >
        {main ? (
          <ProductCard product={main} apps={apps} tiles={Math.max(0, target - 1)} />
        ) : (
          <EmptyCard
            text="No free product yet."
            action={
              <PageLink to={edit("product")} disabled={disabled} onWhite>
                Add product
              </PageLink>
            }
          />
        )}
      </Panel>

      {main && (
        <Panel
          id="check-delivers"
          title="Before you promote it"
          subtitle="When every gate is ticked, it delivers on its hook."
          action={<EditLink to={edit("gates")} disabled={disabled} />}
        >
          {gates.length ? (
            <ListCard>
              {gates.map((g, i) => (
                <ListRow
                  key={i}
                  aside={
                    <StatusDot
                      status={g.done ? "done" : "not-started"}
                      label={g.done ? "Done" : "Not yet"}
                    />
                  }
                >
                  <span className="flex items-center gap-3">
                    <Checkbox
                      id={`gate-${i}`}
                      aria-label={g.label}
                      checked={g.done}
                      disabled={disabled}
                      onCheckedChange={(v) =>
                        void updateMain({
                          gates: gates.map((x, j) => (j === i ? { ...x, done: v === true } : x)),
                        })
                      }
                    />
                    <Label htmlFor={`gate-${i}`} className="text-[15px] font-normal leading-snug">
                      {g.label}
                    </Label>
                  </span>
                </ListRow>
              ))}
            </ListCard>
          ) : (
            <EmptyCard
              text="No release gates yet."
              action={
                <PageLink to={edit("gates")} disabled={disabled} onWhite>
                  Add gates
                </PageLink>
              }
            />
          )}
        </Panel>
      )}

      {seasons.data && (
        <Panel
          id="grows"
          title="Where it grows"
          subtitle="Season by season."
          action={<EditLink to={edit("grows")} disabled={disabled} />}
        >
          <WhereItGrows view={seasons.data} productName={main?.name ?? ""} />
        </Panel>
      )}

      {(later.length > 0 || shelf.length > 0) && (
        <Panel
          id="not-now"
          title="Not now"
          action={<EditLink to={edit("notnow")} disabled={disabled} />}
        >
          <ListCard>
            {later.map((l, i) => (
              <ListRow
                key={`later-${i}`}
                aside={
                  <Button
                    type="button"
                    variant="ghost"
                    className={greyButtonOnWhite}
                    disabled={disabled}
                    onClick={() =>
                      void updateMain({
                        later: later.filter((_, j) => j !== i),
                        gates: [...gates, { label: l, done: false }],
                      })
                    }
                  >
                    Bring back
                  </Button>
                }
              >
                <span className="text-[15px]">{l}</span>
                <span className={cn("text-[13px]", muted)}>
                  Later · a gate for {main?.name || "this product"}
                </span>
              </ListRow>
            ))}
            {shelf.map(({ p, i }) => (
              <ListRow
                key={`shelf-${i}`}
                aside={
                  <Button
                    type="button"
                    variant="ghost"
                    className={greyButtonOnWhite}
                    disabled={disabled}
                    onClick={() =>
                      void save({
                        freeProducts: products.map((x, j) =>
                          j === i ? { ...x, shelved: false } : x,
                        ),
                      })
                    }
                  >
                    Bring back
                  </Button>
                }
              >
                <span className="text-[15px] font-bold">{p.name || "Unnamed"}</span>
                <span className={cn("text-[13px]", muted)}>
                  On the shelf{p.fixes ? ` · ${p.fixes}` : ""}
                </span>
              </ListRow>
            ))}
          </ListCard>
        </Panel>
      )}
    </div>
  );
}

function ProductCard({
  product: p,
  apps,
  tiles,
}: {
  product: FreeProduct;
  apps: string[];
  tiles: number;
}) {
  const isTalk = /talk/i.test(p.name);
  return (
    <div className={cn(card, "flex flex-col gap-5")}>
      <div className="flex flex-wrap items-center gap-4">
        {isTalk && tiles > 0 && (
          <div className="flex items-center gap-1.5" aria-label={`Talk plus ${tiles} apps`}>
            <span className="grid size-16 place-items-center rounded-2xl bg-[var(--p-1f2328)] text-[var(--p-on-ink)]">
              <IconMicrophone size={28} />
            </span>
            <span className={cn("font-extrabold", muted)}>+</span>
            <span className="grid grid-cols-4 gap-1">
              {Array.from({ length: tiles }, (_, i) => (
                <span
                  key={i}
                  title={apps[i] ?? `App ${i + 2}`}
                  className="grid size-[26px] place-items-center rounded-[7px] border border-[var(--p-e6e4dd)] bg-[var(--p-f0efe9)] text-[11px] font-bold text-[var(--p-4a4943)]"
                >
                  {(apps[i] ?? String(i + 2)).slice(0, 1).toUpperCase()}
                </span>
              ))}
            </span>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-2xl font-extrabold">{p.name || "Unnamed"}</span>
          {isTalk && (
            <span className={cn("text-sm", muted)}>
              Talk is the app you talk to. The other apps each own one job.
            </span>
          )}
          {p.fixes && <span className={cn("text-sm", muted)}>{p.fixes}</span>}
          <span className={cn("break-all text-xs", muted)}>{p.url || "No link yet"}</span>
        </div>
      </div>
      <p
        className={cn(
          "border-l-4 border-[var(--p-c9c7bf)] py-1.5 pl-[18px] text-[19px] font-semibold leading-normal",
          !p.hook.trim() && muted,
        )}
      >
        {p.hook.trim() || "No hook yet: what the title promises."}
      </p>
    </div>
  );
}

function WhereItGrows({ view, productName }: { view: SeasonsData; productName: string }) {
  const cur = view.current.n;
  const cols = seasonColumns(view);
  return (
    <div className="grid overflow-hidden rounded-[14px] border border-[var(--p-e6e4dd)] bg-[var(--p-card)] md:grid-cols-3">
      {cols.map((n, i) => {
        const now = n === cur;
        const idea = view.ideas.find((x) => x.n === n)?.idea ?? "";
        const shown = now ? idea || productName : idea;
        return (
          <div
            key={n}
            className={cn(
              "flex flex-col gap-1.5 px-6 py-5",
              i !== cols.length - 1 && "border-[var(--p-e6e4dd)] md:border-r",
            )}
          >
            <span
              className={cn(
                "w-fit rounded-full px-2.5 py-1 text-xs font-semibold",
                now
                  ? "bg-[var(--p-dafbe1)] text-[var(--p-1a7f37)]"
                  : "bg-[var(--p-f0efe9)] text-[var(--p-4a4943)]",
              )}
            >
              Season {n} · {now ? "now" : "idea"}
            </span>
            <span
              className={cn(
                "whitespace-pre-wrap text-[15px] font-bold",
                !shown && cn("font-normal", muted),
              )}
            >
              {shown || "No idea yet."}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const TITLES: Record<string, string> = {
  product: "Your free product",
  gates: "Before you promote it",
  grows: "Where it grows",
  notnow: "Not now",
};

export function ProductEdit({ detail, part, backTo }: StepEditProps) {
  const { save } = usePlanSave(detail.entity.id, "product");
  const products = detail.guidance.plan.product.freeProducts;
  const props = { detail, products, save, backTo };
  if (part === "product") return <ProductFieldsEdit {...props} />;
  if (part === "gates") return <GatesEdit {...props} />;
  if (part === "grows") return <GrowsEdit {...props} />;
  if (part === "notnow") return <NotNowEdit {...props} />;
  return (
    <EditFrame title="Not found" backTo={backTo}>
      <p className={cn("py-6 text-sm", muted)}>There is no {part} page on Product.</p>
    </EditFrame>
  );
}

type EditProps = {
  detail: EntityDetail;
  products: FreeProduct[];
  save: PlanSave;
  backTo: string;
};

function useSubmit(save: PlanSave, backTo: string) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const submit = async (freeProducts: FreeProduct[]) => {
    setBusy(true);
    const ok = await save({ freeProducts });
    setBusy(false);
    if (ok) navigate(backTo);
  };
  return { busy, submit };
}

function ProductFieldsEdit({ products, save, backTo }: EditProps) {
  const { main, index } = mainProduct(products);
  const [f, setF] = useState<FreeProduct>(main ?? blankProduct());
  const { busy, submit } = useSubmit(save, backTo);
  const clean = {
    ...f,
    name: f.name.trim(),
    hook: f.hook.trim(),
    url: f.url.trim(),
    fixes: f.fixes.trim(),
  };
  return (
    <EditFrame
      title={main ? TITLES.product : "Add a free product"}
      description="The free thing that proves your promise."
      backTo={backTo}
      busy={busy}
      onSave={() =>
        void submit(
          index >= 0 ? products.map((p, j) => (j === index ? clean : p)) : [...products, clean],
        )
      }
    >
      <Row title="Name" htmlFor="product-name">
        <Input
          id="product-name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </Row>
      <Row title="The hook" line={GAP_HINTS["free-product"]} htmlFor="product-hook">
        <Textarea
          id="product-hook"
          rows={3}
          value={f.hook}
          onChange={(e) => setF({ ...f, hook: e.target.value })}
        />
      </Row>
      <Row title="Link" htmlFor="product-url">
        <Input
          id="product-url"
          type="url"
          value={f.url}
          placeholder="https://"
          onChange={(e) => setF({ ...f, url: e.target.value })}
        />
      </Row>
      <Row
        title="What it fixes"
        line="The problem it solves for your person."
        htmlFor="product-fixes"
      >
        <Textarea
          id="product-fixes"
          rows={2}
          value={f.fixes}
          onChange={(e) => setF({ ...f, fixes: e.target.value })}
        />
      </Row>
    </EditFrame>
  );
}

function GatesEdit({ products, save, backTo }: EditProps) {
  const { main, index } = mainProduct(products);
  const [gates, setGates] = useState(
    main?.gates?.length ? main.gates.map((g) => ({ ...g })) : [{ label: "", done: false }],
  );
  const { busy, submit } = useSubmit(save, backTo);
  const move = (i: number, d: number) => {
    const next = [...gates];
    next.splice(i + d, 0, next.splice(i, 1)[0]);
    setGates(next);
  };
  if (!main) return <NoProduct backTo={backTo} />;
  const clean = gates.map((g) => ({ ...g, label: g.label.trim() })).filter((g) => g.label);
  return (
    <EditFrame
      title={TITLES.gates}
      description={GAP_HINTS.delivers}
      backTo={backTo}
      busy={busy}
      onSave={() => void submit(products.map((p, j) => (j === index ? { ...p, gates: clean } : p)))}
    >
      <Row title="Gates" line="What must be true before you promote it, in order.">
        {gates.map((g, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              aria-label={`Gate ${i + 1}`}
              value={g.label}
              onChange={(e) =>
                setGates(gates.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move up"
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <IconArrowUp size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move down"
              disabled={i === gates.length - 1}
              onClick={() => move(i, 1)}
            >
              <IconArrowDown size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove gate ${i + 1}`}
              onClick={() => setGates(gates.filter((_, j) => j !== i))}
            >
              <IconX size={16} />
            </Button>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="ghost"
            className={greyButtonOnWhite}
            onClick={() => setGates([...gates, { label: "", done: false }])}
          >
            Add gate
          </Button>
        </div>
      </Row>
    </EditFrame>
  );
}

function GrowsEdit({ detail, products, backTo }: EditProps) {
  const seasons = useSeasons(detail.entity.id);
  if (!seasons.data)
    return (
      <EditFrame title={TITLES.grows} backTo={backTo}>
        <p className={cn("py-6 text-sm", muted)}>Loading seasons…</p>
      </EditFrame>
    );
  return (
    <GrowsForm
      entityId={detail.entity.id}
      view={seasons.data}
      productName={mainProduct(products).main?.name ?? ""}
      backTo={backTo}
    />
  );
}

function GrowsForm({
  entityId,
  view,
  productName,
  backTo,
}: {
  entityId: string;
  view: SeasonsData;
  productName: string;
  backTo: string;
}) {
  const navigate = useNavigate();
  const write = useWrite("save-season-idea");
  const saved = (n: number) => view.ideas.find((x) => x.n === n)?.idea ?? "";
  const [cols, setCols] = useState(() => seasonColumns(view));
  const [ideas, setIdeas] = useState<Record<number, string>>(() =>
    Object.fromEntries(cols.map((n) => [n, saved(n)])),
  );
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    for (const n of cols) {
      const v = (ideas[n] ?? "").trim();
      if (v === saved(n).trim()) continue;
      if (!(await write.run({ entityId, n, idea: v }))) {
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    navigate(backTo);
  };
  const last = cols[cols.length - 1];
  return (
    <EditFrame
      title={TITLES.grows}
      description="What each season could be for."
      backTo={backTo}
      busy={busy}
      onSave={() => void submit()}
    >
      {cols.map((n) => (
        <Row
          key={n}
          title={`Season ${n}`}
          line={n === view.current.n ? "Now." : "An idea for later."}
          htmlFor={`season-idea-${n}`}
        >
          <Textarea
            id={`season-idea-${n}`}
            rows={2}
            maxLength={500}
            value={ideas[n] ?? ""}
            placeholder={
              n === view.current.n && productName ? productName : "What could this season be for?"
            }
            onChange={(e) => setIdeas({ ...ideas, [n]: e.target.value })}
          />
        </Row>
      ))}
      <Row title="More seasons">
        <div>
          <Button
            type="button"
            variant="ghost"
            className={greyButtonOnWhite}
            disabled={last >= 100}
            onClick={() => setCols([...cols, last + 1])}
          >
            Add season {last + 1}
          </Button>
        </div>
      </Row>
    </EditFrame>
  );
}

function NotNowEdit({ products, save, backTo }: EditProps) {
  const { main, index } = mainProduct(products);
  const [later, setLater] = useState<string[]>(main?.later?.length ? [...main.later] : []);
  const [shelved, setShelved] = useState(() => products.map((p) => !!p.shelved));
  const { busy, submit } = useSubmit(save, backTo);
  const onSave = () => {
    const ideas = later.map((l) => l.trim()).filter(Boolean);
    void submit(
      products.map((p, j) => ({
        ...p,
        shelved: shelved[j],
        ...(j === index ? { later: ideas } : {}),
      })),
    );
  };
  return (
    <EditFrame
      title={TITLES.notnow}
      description="Ideas kept for later, and products on the shelf."
      backTo={backTo}
      busy={busy}
      onSave={onSave}
    >
      {main && (
        <Row
          title="Later"
          line={`Ideas for ${main.name || "your free product"}, kept out of the gates for now.`}
        >
          {later.map((l, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                aria-label={`Later idea ${i + 1}`}
                value={l}
                onChange={(e) => setLater(later.map((x, j) => (j === i ? e.target.value : x)))}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove later idea ${i + 1}`}
                onClick={() => setLater(later.filter((_, j) => j !== i))}
              >
                <IconX size={16} />
              </Button>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="ghost"
              className={greyButtonOnWhite}
              onClick={() => setLater([...later, ""])}
            >
              Add idea
            </Button>
          </div>
        </Row>
      )}
      <Row
        title="On the shelf"
        line="Kept, not worked on, not counted. The first product not on the shelf is your free product."
      >
        {products.length ? (
          products.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <Checkbox
                id={`shelf-${i}`}
                checked={shelved[i]}
                onCheckedChange={(v) =>
                  setShelved(shelved.map((x, j) => (j === i ? v === true : x)))
                }
              />
              <Label htmlFor={`shelf-${i}`} className="text-[15px] font-normal">
                {p.name || "Unnamed"}
              </Label>
            </div>
          ))
        ) : (
          <p className={cn("text-sm", muted)}>No products yet.</p>
        )}
      </Row>
    </EditFrame>
  );
}

function NoProduct({ backTo }: { backTo: string }) {
  return (
    <EditFrame title="No free product yet" backTo={backTo}>
      <p className={cn("py-6 text-sm", muted)}>Add a free product first.</p>
    </EditFrame>
  );
}

export const productCheckPart: Record<string, string> = {
  "free-product": "product",
  delivers: "gates",
};
