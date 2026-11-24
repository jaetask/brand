import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { sqliteBrands } from "./store.js";

const fresh = () =>
  sqliteBrands(new DatabaseSync(":memory:"), () => Date.parse("2026-11-24T12:00:00Z"));

test("a new brand starts with the usual principles, season 1, and only association started", () => {
  const brands = fresh();
  const b = brands.create("acme", "owner");
  const d = brands.detail(b.id);
  assert.equal(d.brand.name, "acme");
  assert.equal(d.guidance.principles.length, 5);
  assert.equal(d.seasons.length, 1);
  assert.deepEqual(
    d.plan.levels.map((l) => l.state),
    ["empty", "empty", "partial", "empty", "empty"],
  );
});

test("saving guidance keeps every version and merges the plan by step", () => {
  const brands = fresh();
  const { id } = brands.create("acme", "owner");
  brands.saveGuidance(id, { plan: { proof: { path: "A" } } }, "path", "owner");
  const { n } = brands.saveGuidance(id, { audiencePromise: "Ship it." }, "promise", "owner");
  const d = brands.detail(id);
  assert.equal(n, 3);
  assert.equal(d.guidance.plan.proof.path, "A");
  assert.equal(d.guidance.audiencePromise, "Ship it.");
  assert.equal(d.guidanceVersions.length, 3);
  assert.equal(d.brand.guidanceVersion, 3);
});

test("proof counts for step 1 only when it is firsthand and has a link", () => {
  const brands = fresh();
  const { id } = brands.create("acme", "owner");
  const blank = {
    body: "",
    source: "",
    sourceUrl: "",
    speaker: "",
    subject: "",
    occurredOn: "",
    topics: [],
    uncertainty: "",
  };
  brands.addProof(
    id,
    {
      kind: "fact",
      provenance: "firsthand",
      data: { ...blank, title: "a", proofUrl: "https://x.test/a" },
    },
    "owner",
  );
  brands.addProof(
    id,
    { kind: "fact", provenance: "firsthand", data: { ...blank, title: "b", proofUrl: "" } },
    "owner",
  );
  brands.addProof(
    id,
    {
      kind: "reference",
      provenance: "third_party",
      data: { ...blank, title: "c", proofUrl: "https://x.test/c" },
    },
    "owner",
  );
  assert.equal(brands.detail(id).plan.proofLinked, 1);
});

test("identity lines keep each version and their status", () => {
  const brands = fresh();
  const { id } = brands.create("acme", "owner");
  const line = brands.addIdentity(
    id,
    { line: "Ship small.", credit: "own", creditUrl: "", thought: "", themes: [] },
    "suggested",
    "a1",
  );
  brands.changeIdentity(line.id, { status: "accepted" }, "", "owner");
  const d = brands.detail(id);
  assert.equal(d.plan.identityAccepted, 1);
  assert.equal(d.identity[0]?.version, 2);
});

test("archived brands leave the list and come back on restore", () => {
  const brands = fresh();
  const { id } = brands.create("acme", "owner");
  brands.setArchived(id, true, "owner");
  assert.equal(brands.list().length, 0);
  assert.equal(brands.list(true).length, 1);
  brands.setArchived(id, false, "owner");
  assert.equal(brands.list().length, 1);
});

test("writes work inside a transaction the caller already opened", () => {
  const db = new DatabaseSync(":memory:");
  const brands = sqliteBrands(db);
  db.exec("BEGIN");
  const { id } = brands.create("acme", "owner");
  brands.saveGuidance(id, { conduct: "Kind." }, "", "owner");
  db.exec("COMMIT");
  assert.equal(brands.detail(id).guidance.conduct, "Kind.");
});
