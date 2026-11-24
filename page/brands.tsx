import {
  EditFrame,
  ListCard,
  ListRow,
  PageBody,
  Panel,
  PrimaryLink,
  ProjectIcon,
  Row,
  useBackTo,
} from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { Input } from "@jaetask/toolkit/ui/input";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { useState } from "react";
import { type Brand, succeeded, useRead } from "./api.js";
import { act, NothingYet, brandIcon, Muted } from "./look.js";

export function BrandMark({ brand, size = 20 }: { brand: Brand; size?: number }) {
  return brand.image ? (
    <img
      src={brand.image}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
    />
  ) : (
    <ProjectIcon projectIcon={brandIcon(brand.icon)} iconColour={brand.colour} size={size} />
  );
}

export function BrandsPage({ brands }: { brands: Brand[] | undefined }) {
  const list = brands ?? [];
  const move = (i: number, to: number) => {
    const ids = list.map((b) => b.id);
    const [id] = ids.splice(i, 1);
    if (!id) return;
    ids.splice(to, 0, id);
    void act("brand-order-set", { brands: ids });
  };
  return (
    <PageBody
      title="Brands"
      line="Every brand you build and maintain: who it is, what it believes, how it sounds and the plan it runs by."
      action={<PrimaryLink to="/brands/new">New brand</PrimaryLink>}
    >
      <Panel id="brands" title="Your brands" line="In the order they show in the sidebar.">
        {list.length ? (
          <ListCard>
            {list.map((b, i) => (
              <ListRow
                key={b.id}
                to={`/b/${b.id}/plan`}
                aside={
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${b.name} up`}
                      disabled={i === 0}
                      onClick={() => move(i, i - 1)}
                    >
                      <IconArrowUp size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${b.name} down`}
                      disabled={i === list.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      <IconArrowDown size={16} />
                    </Button>
                  </>
                }
              >
                <span className="flex items-center gap-3">
                  <BrandMark brand={b} size={28} />
                  <span className="grid">
                    <span className="font-medium">{b.name}</span>
                    {b.purpose && <small className="text-muted-foreground">{b.purpose}</small>}
                  </span>
                </span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <NothingYet
            text="No brands yet. Add the first one."
            action={<PrimaryLink to="/brands/new">New brand</PrimaryLink>}
          />
        )}
      </Panel>
    </PageBody>
  );
}

export function NewBrandPage() {
  const back = useBackTo("/brands");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const outcome = await act("brand-create", { name: name.trim() }, "Brand created");
    setBusy(false);
    if (succeeded(outcome)) window.location.hash = `/b/${(outcome.output as Brand).id}/profile`;
  };
  return (
    <EditFrame
      title="New brand"
      line="It starts with the usual principles and an empty plan."
      backTo={back}
      onSave={save}
      busy={busy}
      saveLabel="Create"
    >
      <Row title="Name" line="As the brand is known, such as its handle." htmlFor="brand-name">
        <Input
          id="brand-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </Row>
    </EditFrame>
  );
}

export function ArchivePage() {
  const archived = useRead<Brand[]>("brand-list", { archived: true });
  return (
    <PageBody title="Archive" line="Archived brands keep everything. Restore puts one back.">
      <Panel id="archived" title="Archived brands">
        {archived?.length ? (
          <ListCard>
            {archived.map((b) => (
              <ListRow
                key={b.id}
                aside={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void act("brand-restore", { brand: b.id }, "Restored")}
                  >
                    Restore
                  </Button>
                }
              >
                <span className="flex items-center gap-3">
                  <BrandMark brand={b} />
                  {b.name}
                </span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Muted>Nothing is archived.</Muted>
        )}
      </Panel>
    </PageBody>
  );
}
