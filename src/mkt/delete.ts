import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { DbExec } from "./host.js";
import type { z } from "zod";

import { activity, bad, db, notFound, now, one, q, write } from "./core.js";
import type * as S from "./schemas.js";

type Kind = z.infer<typeof S.deleteKind>;
type Edge = { child: string; col: string; parent: string; pcol: string };
type Step = { table: string; col: string; values: unknown[] };

const ROOT: Record<Kind, string> = {
  entity: "mkt_entities",
  channel: "mkt_channels",
  account: "mkt_accounts",
};

const SHARED = new Set([
  "mkt_actors",
  "mkt_sources",
  "mkt_requests",
  "mkt_write_lock",
  "mkt_limits",
]);

async function foreignKeys(conn: DbExec): Promise<Edge[]> {
  const rows = await q(
    conn,
    `SELECT c.conrelid::regclass::text AS child, a.attname AS col, c.confrelid::regclass::text AS parent, af.attname AS pcol
       FROM pg_constraint c
       JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
       JOIN pg_attribute af ON af.attrelid=c.confrelid AND af.attnum=c.confkey[1]
      WHERE c.contype='f' AND array_length(c.conkey,1)=1`,
  );
  return rows
    .map((r) => ({
      child: String(r.child),
      col: String(r.col),
      parent: String(r.parent),
      pcol: String(r.pcol),
    }))
    .filter((e) => !SHARED.has(e.child) && !SHARED.has(e.parent));
}

const placeholders = (n: number) => Array.from({ length: n }, () => "?").join(",");

async function collect(conn: DbExec, kind: Kind, id: string) {
  const edges = await foreignKeys(conn);
  const rows = new Map<string, any[]>();
  const seen = new Map<string, Set<string>>();
  const steps: Step[] = [];
  const add = (table: string, found: any[]) => {
    const s = seen.get(table) ?? new Set<string>();
    seen.set(table, s);
    const fresh = found.filter((r) => {
      const k = JSON.stringify(r);
      if (s.has(k)) return false;
      s.add(k);
      return true;
    });
    if (fresh.length) rows.set(table, [...(rows.get(table) ?? []), ...fresh]);
    return fresh;
  };
  const root = ROOT[kind];
  const first = await q(conn, `SELECT * FROM ${root} WHERE id=?`, [id]);
  if (!first.length) notFound(`${kind[0].toUpperCase()}${kind.slice(1)} not found.`);
  add(root, first);
  steps.push({ table: root, col: "id", values: [id] });
  const queue: { table: string; rows: any[] }[] = [{ table: root, rows: first }];
  while (queue.length) {
    const { table, rows: parents } = queue.shift()!;
    for (const e of edges.filter((x) => x.parent === table)) {
      const values = [...new Set(parents.map((r) => r[e.pcol]).filter((v) => v != null))];
      if (!values.length) continue;
      const found = await q(
        conn,
        `SELECT * FROM ${e.child} WHERE ${e.col} IN (${placeholders(values.length)})`,
        values,
      );
      if (!found.length) continue;
      steps.push({ table: e.child, col: e.col, values });
      const fresh = add(e.child, found);
      if (fresh.length) queue.push({ table: e.child, rows: fresh });
    }
  }

  const subjects: [string, unknown[]][] = [
    ["entity", (rows.get("mkt_entities") ?? []).map((r) => r.id)],
    ["account", (rows.get("mkt_accounts") ?? []).map((r) => r.id)],
  ];
  for (const [subject, ids] of subjects) {
    if (!ids.length) continue;
    const found = await q(
      conn,
      `SELECT * FROM mkt_guidance WHERE subject_kind=? AND subject_id IN (${placeholders(ids.length)})`,
      [subject, ...ids],
    );
    if (found.length) add("mkt_guidance", found);
  }

  const accountIds = (rows.get("mkt_accounts") ?? []).map((r) => r.id);
  if (accountIds.length) {
    const found = await q(
      conn,
      `SELECT * FROM mkt_limits WHERE scope IN (${placeholders(accountIds.length)})`,
      accountIds,
    );
    if (found.length) add("mkt_limits", found);
  }
  if (kind === "entity") {
    const found = await q(conn, "SELECT * FROM mkt_activity WHERE entity_id=?", [id]);
    if (found.length) add("mkt_activity", found);
  }
  return { edges, rows, steps, item: first[0] };
}

function deleteOrder(edges: Edge[], tables: string[]): string[] {
  const set = new Set(tables);
  const out: string[] = [];
  const done = new Set<string>();
  const visit = (t: string, path: Set<string>) => {
    if (done.has(t) || path.has(t)) return;
    path.add(t);
    for (const e of edges)
      if (e.parent === t && e.child !== t && set.has(e.child)) visit(e.child, path);
    path.delete(t);
    done.add(t);
    out.push(t);
  };
  for (const t of tables) visit(t, new Set());
  return out;
}

const LABELS: Record<string, string> = {
  mkt_channels: "channels",
  mkt_accounts: "accounts",
  mkt_seasons: "seasons",
  mkt_season_ideas: "season ideas",
  mkt_guidance: "plan and persona versions",
  mkt_work: "drafts",
  mkt_revisions: "draft revisions",
  mkt_publications: "publications",
  mkt_snapshots: "metric snapshots",
  mkt_knowledge: "proof items",
  mkt_interviews: "interviews",
  mkt_briefs: "briefs",
  mkt_slots: "calendar slots",
  mkt_identity: "identity lines",
  mkt_peers: "peers",
  mkt_feed: "feed items",
  mkt_conversations: "conversations",
  mkt_outcomes: "outcomes",
  mkt_decisions: "decisions",
  mkt_lessons: "lessons",
  mkt_pipeline_runs: "content runs",
  mkt_activity: "history entries",
};

export async function previewDelete(a: z.infer<typeof S.previewDelete>) {
  const { rows, item } = await collect(db(), a.kind, a.id);
  const counts = [...rows.entries()]
    .filter(([t]) => t !== ROOT[a.kind] && LABELS[t])
    .map(([t, r]) => ({ label: LABELS[t], count: r.length }))
    .filter((c) => c.count > 0);
  const total = [...rows.values()].reduce((n, r) => n + r.length, 0);
  return {
    kind: a.kind,
    id: a.id,
    name: String(item.name ?? ""),
    archived: Boolean(item.data?.archived),
    counts,
    totalRows: total,
  };
}

function backup(kind: Kind, id: string, by: string, rows: Map<string, any[]>) {
  const dir = resolve(process.cwd(), "data/deleted");
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${now().replace(/[:.]/g, "-")}-${kind}-${id}.json`);
  writeFileSync(
    file,
    JSON.stringify({ kind, id, by, deletedAt: now(), rows: Object.fromEntries(rows) }, null, 2),
  );
  return file;
}

export async function deleteItem(a: z.infer<typeof S.deleteItem>) {
  return write(a.by, a.requestId, ["delete-item", a], async (tx) => {
    const item = await one(tx, `SELECT * FROM ${ROOT[a.kind]} WHERE id=?`, [a.id]);
    if (!item) notFound(`${a.kind[0].toUpperCase()}${a.kind.slice(1)} not found.`);
    if (a.kind === "entity" && !item.data?.archived)
      bad("Archive the entity before deleting it.", "not_archived", 409);
    if (a.confirmName.trim() !== String(item.name).trim())
      bad("Type the exact name to confirm.", "name_mismatch", 400);
    const { edges, rows, steps } = await collect(tx, a.kind, a.id);
    const file = backup(a.kind, a.id, a.by, rows);
    for (const table of deleteOrder(
      edges,
      [...rows.keys()].filter((t) => !["mkt_guidance", "mkt_activity", "mkt_limits"].includes(t)),
    )) {
      for (const s of steps.filter((x) => x.table === table))
        await q(
          tx,
          `DELETE FROM ${table} WHERE ${s.col} IN (${placeholders(s.values.length)})`,
          s.values,
        );
    }
    const accounts = (rows.get("mkt_accounts") ?? []).map((r) => r.id);
    if (a.kind === "entity")
      await q(tx, "DELETE FROM mkt_guidance WHERE subject_kind='entity' AND subject_id=?", [a.id]);
    if (accounts.length) {
      await q(
        tx,
        `DELETE FROM mkt_guidance WHERE subject_kind='account' AND subject_id IN (${placeholders(accounts.length)})`,
        accounts,
      );
      await q(
        tx,
        `DELETE FROM mkt_limits WHERE scope IN (${placeholders(accounts.length)})`,
        accounts,
      );
    }
    if (a.kind === "entity") await q(tx, "DELETE FROM mkt_activity WHERE entity_id=?", [a.id]);
    const entityId = a.kind === "entity" ? null : String(item.entity_id);
    await activity(tx, a.kind, a.id, entityId, a.by, `Deleted ${a.kind} ${item.name}`, {
      backup: file,
    });
    return {
      deleted: true,
      kind: a.kind,
      id: a.id,
      name: String(item.name),
      backup: file,
    };
  });
}
