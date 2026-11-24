import { randomUUID } from "node:crypto";

import { fail } from "./host.js";
import { getDbExec, type DbExec } from "./host.js";

let testDb: DbExec | undefined;

export function useTestDb(db?: DbExec) {
  testDb = db;
}
export const db = () => testDb ?? getDbExec();
let clock: (() => Date) | undefined;

export function useTestClock(fn?: () => Date) {
  clock = fn;
}
export const nowDate = () => (clock ? clock() : new Date());
export const now = () => nowDate().toISOString();
let idSeq: { n: number } | undefined;

export function useTestIds(on = true) {
  idSeq = on ? { n: 0 } : undefined;
}
export const newId = () => (idSeq ? `k-${++idSeq.n}` : randomUUID());

export async function q(conn: DbExec, sql: string, args: unknown[] = []) {
  return (await conn.execute({ sql, args })).rows as any[];
}
export async function one(conn: DbExec, sql: string, args: unknown[] = []) {
  return (await q(conn, sql, args))[0] as any;
}

export function bad(message: string, code = "invalid_input", statusCode = 400): never {
  throw fail(message, { errorCode: code, statusCode });
}
export function notFound(what: string): never {
  bad(`That ${what} does not exist.`, "not_found", 404);
}
export function checkVersion(actual: number, expected: number | undefined) {
  if (expected === undefined) bad("expectedVersion is required for updates.", "version_required");
  if (actual !== expected)
    bad("This record changed. Read it again before editing.", "version_conflict", 409);
}

export type Actor = { id: string; name: string; kind: "human" | "harness" };
export async function getActor(conn: DbExec, id: string): Promise<Actor> {
  const r = await one(conn, "SELECT * FROM mkt_actors WHERE id=?", [id]);
  if (!r || r.archived)
    bad(
      `Unknown actor "${id}". Use the owner's ID for the UI (get-owner), codex for the in-app assistant or your registered harness ID.`,
      "unknown_actor",
    );
  return { id: r.id, name: r.name, kind: r.kind };
}

export async function getOwner(): Promise<Actor> {
  const r = await one(
    db(),
    "SELECT * FROM mkt_actors WHERE kind='human' AND NOT coalesce(archived,false) ORDER BY id LIMIT 1",
  );
  if (!r) bad("No human actor is registered.", "no_owner", 500);
  return { id: r.id, name: r.name, kind: r.kind };
}
export async function requireHuman(conn: DbExec, by: string, what: string) {
  const actor = await getActor(conn, by);
  if (actor.kind !== "human") bad(`${what} requires a human decision.`, "human_required", 403);
  return actor;
}

export async function write<T>(
  by: string,
  requestId: string | undefined,
  input: unknown,
  fn: (tx: DbExec, actor: Actor) => Promise<T>,
): Promise<T> {
  const conn = db();
  if (!conn.transaction) throw new Error("Transactional database required");
  return conn.transaction(async (tx) => {
    await q(tx, "SELECT id FROM mkt_write_lock WHERE id=1 FOR UPDATE");
    const actor = await getActor(tx, by);
    const fingerprint = JSON.stringify(input);
    if (requestId) {
      const prior = await one(tx, "SELECT * FROM mkt_requests WHERE id=?", [requestId]);
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          bad("Request ID already used for a different operation.", "request_conflict", 409);
        return prior.result as T;
      }
    }
    const result = await fn(tx, actor);
    if (requestId)
      await q(tx, "INSERT INTO mkt_requests(id,fingerprint,result) VALUES(?,?,?::jsonb)", [
        requestId,
        fingerprint,
        JSON.stringify(result ?? null),
      ]);
    return result;
  });
}

export async function activity(
  tx: DbExec,
  subjectKind: string,
  subjectId: string,
  entityId: string | null,
  by: string,
  text: string,
  data: Record<string, unknown> = {},
) {
  await q(
    tx,
    "INSERT INTO mkt_activity(subject_kind,subject_id,entity_id,actor_id,text,data,created_at) VALUES(?,?,?,?,?,?::jsonb,?)",
    [subjectKind, subjectId, entityId, by, text, JSON.stringify(data), now()],
  );
}

export async function history(conn: DbExec, subjectKind: string, subjectId: string, limit = 200) {
  return (
    await q(
      conn,
      "SELECT * FROM mkt_activity WHERE subject_kind=? AND subject_id=? ORDER BY id DESC LIMIT ?",
      [subjectKind, subjectId, limit],
    )
  ).map((r) => ({
    id: Number(r.id),
    actorId: r.actor_id,
    text: r.text,
    data: r.data,
    createdAt: r.created_at,
  }));
}

export const json = (v: unknown) => JSON.stringify(v);
export const clean = (s: string | undefined | null) => (s ?? "").trim();
export const uniq = <T>(xs: T[]) => Array.from(new Set(xs));

const SECRET_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|cookie|credential)/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SECRET_KEY.test(k) ? "[redacted]" : redact(v),
      ]),
    );
  return value;
}

export const activeScopeSql = (accountCol: string) =>
  `NOT coalesce((SELECT (xa.data->>'archived')::boolean FROM mkt_accounts xa WHERE xa.id=${accountCol}),false)` +
  ` AND NOT coalesce((SELECT (xe.data->>'archived')::boolean FROM mkt_entities xe JOIN mkt_accounts xa2 ON xa2.entity_id=xe.id WHERE xa2.id=${accountCol}),false)`;
