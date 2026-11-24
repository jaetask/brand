import { cpSync, existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { BRAND_SCHEMA, BRAND_TABLES } from "../src/mkt/schema.js";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const from = option("--from");
const to = resolve(option("--to") ?? "data/pglite");
if (!from) {
  console.error(
    "Usage: npm run migrate:marketing -- --from <a backup of Marketing's data/pglite> [--to data/pglite]",
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
const reading = join(work, "source");
cpSync(source, reading, { recursive: true });
rmSync(join(reading, "postmaster.pid"), { force: true });

type Count = { table: string; source: number; brand: number };
const counts = async (pg: PGlite) => {
  const out = new Map<string, number>();
  for (const table of BRAND_TABLES) {
    const exists = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name=$1",
      [table],
    );
    if (!exists.rows[0]?.n) continue;
    const r = await pg.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`);
    out.set(table, r.rows[0]?.n ?? 0);
  }
  return out;
};

const src = await PGlite.create(reading);
const before = await counts(src);
await src.close();

cpSync(reading, to, { recursive: true });
rmSync(work, { recursive: true, force: true });

const pg = await PGlite.create(to);
const tables = await pg.query<{ table_name: string }>(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
);
const keep = new Set<string>(BRAND_TABLES);
for (const { table_name } of tables.rows) {
  if (!keep.has(table_name)) await pg.exec(`DROP TABLE IF EXISTS "${table_name}" CASCADE`);
}
await pg.exec(BRAND_SCHEMA);
const after = await counts(pg);
await pg.close();

const report: Count[] = BRAND_TABLES.map((table) => ({
  table,
  source: before.get(table) ?? 0,
  brand: after.get(table) ?? 0,
}));
console.table(report);
const wrong = report.filter((r) => r.source !== r.brand && before.has(r.table));
if (wrong.length) {
  console.error(`Counts differ for ${wrong.map((r) => r.table).join(", ")}.`);
  process.exit(1);
}
console.log(`Wrote ${to}. The source was read from a temporary copy and not changed.`);
