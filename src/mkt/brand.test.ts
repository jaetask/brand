import assert from "node:assert/strict";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { getOwner } from "./core.js";
import { getEntityDetail, getPlan, listEntities, saveEntity, savePlanLevel } from "./entities.js";
import { bindDatabase, toPostgresParams } from "./host.js";
import { BRAND_SCHEMA } from "./schema.js";

test("question marks become numbered parameters, except inside quotes", () => {
  assert.equal(
    toPostgresParams("SELECT * FROM t WHERE a=? AND b='?' AND c=?"),
    "SELECT * FROM t WHERE a=$1 AND b='?' AND c=$2",
  );
});

test("a fresh install creates a brand, saves a plan step and reads it back", async () => {
  const pg = await PGlite.create();
  await pg.exec(BRAND_SCHEMA);
  bindDatabase(pg);
  const owner = await getOwner();
  assert.equal(owner.id, "owner");
  const created = (await saveEntity({
    name: "Acme",
    by: owner.id,
    requestId: "r1",
  } as never)) as { id: string };
  const id = created.id;
  const plan = (await getPlan({ entityId: id })) as { entity: { version: number } };
  await savePlanLevel({
    entityId: id,
    expectedVersion: plan.entity.version,
    level: "belt",
    values: { checkInDay: "Monday" },
    note: "",
    by: owner.id,
    requestId: "r2",
  } as never);
  const detail = await getEntityDetail(id);
  assert.equal(detail.guidance.plan.belt.checkInDay, "Monday");
  const list = (await listEntities(true)) as { entities: { name: string }[] };
  assert.deepEqual(
    list.entities.map((e) => e.name),
    ["Acme"],
  );
  await pg.close();
});
