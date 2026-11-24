import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PGlite } from "@electric-sql/pglite";
import { migrateBrand } from "../src/brand/store.js";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const from = option("--from");
const to = resolve(option("--to") ?? "data/brand.db");
if (!from) {
  console.error(
    "Usage: npm run migrate:marketing -- --from <a backup of Marketing's data/pglite> [--to data/brand.db]",
  );
  process.exit(2);
}
const source = realpathSync(resolve(from));
const live = join(homedir(), "develop/taskflow/marketing/data/pglite");
if (existsSync(live) && source === realpathSync(live)) {
  console.error("Refused: that is Marketing's live database. Point --from at a backup copy.");
  process.exit(2);
}
if (existsSync(to)) {
  console.error(`Refused: ${to} already exists. Brand never writes over a database.`);
  process.exit(2);
}

const work = mkdtempSync(join(tmpdir(), "brand-migrate-"));
const copy = join(work, "pglite");
cpSync(source, copy, { recursive: true });
rmSync(join(copy, "postmaster.pid"), { force: true });

const pg = await PGlite.create(copy);
type Row = Record<string, unknown>;
const rows = async (sql: string) => (await pg.query<Row>(sql)).rows;
const s = (v: unknown) =>
  v == null ? null : typeof v === "object" ? JSON.stringify(v) : String(v);
const n = (v: unknown) => (v == null ? null : Number(v));

mkdirSync(dirname(to), { recursive: true });
const db = new DatabaseSync(to);
migrateBrand(db);
db.exec("DELETE FROM brand_actors");

const KEPT_HISTORY: Record<string, string> = {
  entity: "brand",
  identity: "identity",
  knowledge: "proof",
  account: "account",
};

const plan: { table: string; source: string; insert: string; values: (r: Row) => unknown[] }[] = [
  {
    table: "brand_actors",
    source: "SELECT * FROM mkt_actors ORDER BY id",
    insert: "INSERT INTO brand_actors (id, name, kind, archived) VALUES (?, ?, ?, ?)",
    values: (r) => [r.id, r.name, r.kind, r.archived ? 1 : 0],
  },
  {
    table: "brands",
    source: "SELECT * FROM mkt_entities ORDER BY created_at",
    insert:
      "INSERT INTO brands (id, name, data, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    values: (r) => [r.id, r.name, s(r.data), n(r.version), r.created_at, r.updated_at],
  },
  {
    table: "brand_guidance",
    source: "SELECT * FROM mkt_guidance ORDER BY subject_kind, subject_id, n",
    insert:
      "INSERT INTO brand_guidance (subject_kind, subject_id, n, data, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    values: (r) => [
      r.subject_kind === "entity" ? "brand" : r.subject_kind,
      r.subject_id,
      n(r.n),
      s(r.data),
      r.note,
      r.created_by,
      r.created_at,
    ],
  },
  {
    table: "brand_channels",
    source: "SELECT * FROM mkt_channels ORDER BY id",
    insert:
      "INSERT INTO brand_channels (id, brand_id, kind, name, data, version) VALUES (?, ?, ?, ?, ?, ?)",
    values: (r) => [r.id, r.entity_id, r.kind, r.name, s(r.data), n(r.version)],
  },
  {
    table: "brand_accounts",
    source: "SELECT * FROM mkt_accounts ORDER BY id",
    insert:
      "INSERT INTO brand_accounts (id, brand_id, channel_id, name, data, version) VALUES (?, ?, ?, ?, ?, ?)",
    values: (r) => [r.id, r.entity_id, r.channel_id, r.name, s(r.data), n(r.version)],
  },
  {
    table: "brand_peers",
    source: "SELECT * FROM mkt_peers ORDER BY created_at",
    insert:
      "INSERT INTO brand_peers (id, account_id, handle, status, data, version, created_by, created_at, removed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    values: (r) => [
      r.id,
      r.account_id,
      r.handle,
      r.status,
      s(r.data),
      n(r.version),
      r.created_by,
      r.created_at,
      r.removed_at,
    ],
  },
  {
    table: "brand_identity",
    source: "SELECT * FROM mkt_identity ORDER BY created_at",
    insert:
      "INSERT INTO brand_identity (id, brand_id, status, data, version, suggested_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    values: (r) => [
      r.id,
      r.entity_id,
      r.status,
      s(r.data),
      n(r.version),
      r.suggested_by,
      r.created_at,
      r.updated_at,
    ],
  },
  {
    table: "brand_identity_versions",
    source: "SELECT * FROM mkt_identity_versions ORDER BY identity_id, version",
    insert:
      "INSERT INTO brand_identity_versions (identity_id, version, status, data, note, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    values: (r) => [
      r.identity_id,
      n(r.version),
      r.status,
      s(r.data),
      r.note,
      r.changed_by,
      r.changed_at,
    ],
  },
  {
    table: "brand_proof",
    source: "SELECT * FROM mkt_knowledge ORDER BY created_at",
    insert:
      "INSERT INTO brand_proof (id, brand_id, account_id, kind, provenance, status, data, version, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    values: (r) => [
      r.id,
      r.entity_id,
      r.account_id,
      r.kind,
      r.provenance,
      r.status,
      s(r.data),
      n(r.version),
      r.created_by,
      r.created_at,
      r.updated_at,
    ],
  },
  {
    table: "brand_proof_versions",
    source: "SELECT * FROM mkt_knowledge_versions ORDER BY knowledge_id, version",
    insert:
      "INSERT INTO brand_proof_versions (proof_id, version, kind, provenance, status, data, note, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    values: (r) => [
      r.knowledge_id,
      n(r.version),
      r.kind,
      r.provenance,
      r.status,
      s(r.data),
      r.note,
      r.changed_by,
      r.changed_at,
    ],
  },
  {
    table: "brand_seasons",
    source: "SELECT * FROM mkt_seasons ORDER BY entity_id, n",
    insert:
      "INSERT INTO brand_seasons (brand_id, n, data, version, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    values: (r) => [
      r.entity_id,
      n(r.n),
      s(r.data),
      n(r.version),
      r.updated_by,
      r.created_at,
      r.updated_at,
    ],
  },
  {
    table: "brand_season_ideas",
    source: "SELECT * FROM mkt_season_ideas ORDER BY entity_id, n",
    insert:
      "INSERT INTO brand_season_ideas (brand_id, n, idea, version, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    values: (r) => [r.entity_id, n(r.n), r.idea, n(r.version), r.updated_by, r.updated_at],
  },
  {
    table: "brand_history",
    source: `SELECT * FROM mkt_activity WHERE subject_kind IN (${Object.keys(KEPT_HISTORY)
      .map((k) => `'${k}'`)
      .join(",")}) ORDER BY id`,
    insert:
      "INSERT INTO brand_history (id, subject_kind, subject_id, brand_id, actor_id, text, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    values: (r) => [
      n(r.id),
      KEPT_HISTORY[String(r.subject_kind)],
      r.subject_id,
      r.entity_id,
      r.actor_id,
      r.text,
      s(r.data ?? {}),
      r.created_at,
    ],
  },
];

const report: { table: string; source: number; copied: number }[] = [];
db.exec("BEGIN IMMEDIATE");
try {
  for (const step of plan) {
    const found = await rows(step.source);
    const insert = db.prepare(step.insert);
    for (const r of found) insert.run(...(step.values(r) as (string | number | null)[]));
    const copied = Number(
      (db.prepare(`SELECT count(*) AS c FROM ${step.table}`).get() as { c: number }).c,
    );
    if (copied !== found.length)
      throw new Error(`${step.table}: read ${found.length}, wrote ${copied}`);
    report.push({ table: step.table, source: found.length, copied });
  }
  const owner = db.prepare("SELECT 1 FROM brand_actors WHERE id = 'owner'").get();
  if (!owner) {
    const jae = db.prepare("SELECT name FROM brand_actors WHERE id = 'jae'").get() as
      | { name: string }
      | undefined;
    db.prepare("INSERT INTO brand_actors (id, name, kind) VALUES ('owner', ?, 'human')").run(
      jae?.name ?? "You",
    );
  }
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  db.close();
  await pg.close();
  rmSync(to, { force: true });
  rmSync(work, { recursive: true, force: true });
  throw error;
}
db.close();
await pg.close();
rmSync(work, { recursive: true, force: true });
console.table(report);
console.log(`Wrote ${to}. The source was read from a temporary copy and not changed.`);
