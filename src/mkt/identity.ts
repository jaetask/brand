import type { DbExec } from "./host.js";
import type { z } from "zod";

import type {
  IdentityData,
  IdentityStatement,
  IdentityStatus,
  IdentityVersion,
} from "../shared/marketing.js";
import {
  activity,
  bad,
  checkVersion,
  clean,
  db,
  getActor,
  json,
  newId,
  notFound,
  now,
  one,
  q,
  requireHuman,
  write,
} from "./core.js";
import { getEntity, resolveEntity } from "./entities.js";
import type * as S from "./schemas.js";

const toStatement = (r: any): IdentityStatement => ({
  line: "",
  credit: "own",
  creditUrl: "",
  thought: "",
  themes: [],
  ...r.data,
  id: r.id,
  entityId: r.entity_id,
  status: r.status,
  version: Number(r.version),
  suggestedBy: r.suggested_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const pick = (s: IdentityData): IdentityData => ({
  line: s.line,
  credit: s.credit,
  creditUrl: s.creditUrl,
  thought: s.thought,
  themes: s.themes,
});

async function row(conn: DbExec, id: string) {
  const r = await one(conn, "SELECT * FROM mkt_identity WHERE id=?", [id]);
  if (!r) notFound("identity statement");
  return toStatement(r);
}
async function recordVersion(tx: DbExec, s: IdentityStatement, by: string, note: string) {
  await q(
    tx,
    "INSERT INTO mkt_identity_versions(identity_id,version,status,data,note,changed_by,changed_at) VALUES(?,?,?,?::jsonb,?,?,?)",
    [s.id, s.version, s.status, json(pick(s)), note, by, now()],
  );
}

function data(a: Partial<IdentityData>, base?: IdentityData): IdentityData {
  return {
    line: clean(a.line ?? base?.line ?? ""),
    credit: clean(a.credit ?? base?.credit ?? "") || "own",
    creditUrl: a.creditUrl ?? base?.creditUrl ?? "",
    thought: a.thought ?? base?.thought ?? "",
    themes: a.themes ?? base?.themes ?? [],
  };
}

async function insert(
  tx: DbExec,
  entityId: string,
  d: IdentityData,
  status: IdentityStatus,
  by: string,
  note: string,
) {
  if (!d.line) bad("Write the statement (line).");
  const dup = await one(
    tx,
    "SELECT id, status FROM mkt_identity WHERE entity_id=? AND lower(data->>'line')=lower(?) AND status <> 'rejected'",
    [entityId, d.line],
  );
  if (dup) bad(`That statement is already here (${dup.status}).`, "duplicate", 409);
  const id = newId();
  const t = now();
  await q(
    tx,
    "INSERT INTO mkt_identity(id,entity_id,status,data,suggested_by,created_at,updated_at) VALUES(?,?,?,?::jsonb,?,?,?)",
    [id, entityId, status, json(d), by, t, t],
  );
  const s = await row(tx, id);
  await recordVersion(tx, s, by, note || (status === "suggested" ? "Suggested" : "Added"));
  await activity(
    tx,
    "identity",
    id,
    entityId,
    by,
    `${status === "suggested" ? "Suggested" : "Added"} identity statement: ${d.line.slice(0, 120)}`,
  );
  return s;
}

export async function listIdentity(a: z.infer<typeof S.listIdentity>) {
  const conn = db();
  const entity = await resolveEntity(conn, a.entityId);
  const args: unknown[] = [entity.id];
  let sql = "SELECT * FROM mkt_identity WHERE entity_id=?";
  if (a.status !== "all") {
    sql += " AND status=?";
    args.push(a.status);
  }
  if (a.theme) {
    sql += " AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(data->'themes') t WHERE t=?)";
    args.push(a.theme);
  }
  const rows = (
    await q(
      conn,
      `${sql} ORDER BY CASE status WHEN 'accepted' THEN 0 WHEN 'suggested' THEN 1 ELSE 2 END, updated_at DESC`,
      args,
    )
  ).map(toStatement);
  const counts = await q(
    conn,
    "SELECT status, count(*)::int AS n FROM mkt_identity WHERE entity_id=? GROUP BY status",
    [entity.id],
  );
  return {
    entity: { id: entity.id, name: entity.name },
    statements: rows,
    counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])) as Record<
      string,
      number
    >,
  };
}

export async function saveIdentity(a: z.infer<typeof S.saveIdentity>) {
  return write(a.by, a.requestId, ["save-identity-statement", a], async (tx) => {
    const actor = await getActor(tx, a.by);
    if ((a.status === "accepted" || a.status === "rejected") && actor.kind !== "human")
      bad(
        "Accepting or rejecting an identity statement is a person's decision. Suggest it instead (suggest-identity-statement).",
        "human_required",
        403,
      );
    if (!a.id) {
      if (!a.entityId) bad("Choose the brand (entityId).");
      const entity = await resolveEntity(tx, a.entityId);
      await getEntity(tx, entity.id, true);
      const status: IdentityStatus =
        a.status ?? (actor.kind === "human" ? "accepted" : "suggested");
      return insert(tx, entity.id, data(a), status, a.by, a.note);
    }
    const old = await row(tx, a.id);
    if (a.expectedVersion !== undefined) checkVersion(old.version, a.expectedVersion);
    const next = data(a, old);
    if (!next.line) bad("A statement needs its line.");
    const status = a.status ?? old.status;
    await q(
      tx,
      "UPDATE mkt_identity SET status=?, data=?::jsonb, version=version+1, updated_at=? WHERE id=?",
      [status, json(next), now(), old.id],
    );
    const saved = await row(tx, old.id);
    await recordVersion(tx, saved, a.by, a.note || "Edited");
    await activity(
      tx,
      "identity",
      saved.id,
      saved.entityId,
      a.by,
      `${status !== old.status ? `Marked ${status}` : "Edited"} identity statement: ${next.line.slice(0, 120)}`,
    );
    return saved;
  });
}

export async function suggestIdentity(a: z.infer<typeof S.suggestIdentity>) {
  return write(a.by, a.requestId, ["suggest-identity-statement", a], async (tx) => {
    const entity = await resolveEntity(tx, a.entityId);
    await getEntity(tx, entity.id, true);
    return insert(tx, entity.id, data(a), "suggested", a.by, a.note);
  });
}

async function decide(a: z.infer<typeof S.decideIdentity>, status: "accepted" | "rejected") {
  return write(a.by, a.requestId, [`${status}-identity-statement`, a], async (tx) => {
    await requireHuman(
      tx,
      a.by,
      status === "accepted" ? "Accepting an identity statement" : "Rejecting an identity statement",
    );
    const old = await row(tx, a.id);
    checkVersion(old.version, a.expectedVersion);
    if (old.status === status) return old;
    await q(tx, "UPDATE mkt_identity SET status=?, version=version+1, updated_at=? WHERE id=?", [
      status,
      now(),
      old.id,
    ]);
    const saved = await row(tx, old.id);
    await recordVersion(
      tx,
      saved,
      a.by,
      a.note || (status === "accepted" ? "Accepted" : "Rejected"),
    );
    await activity(
      tx,
      "identity",
      saved.id,
      saved.entityId,
      a.by,
      `${status === "accepted" ? "Accepted" : "Rejected"} identity statement: ${saved.line.slice(0, 120)}${a.note ? ` (${a.note})` : ""}`,
    );
    return saved;
  });
}
export const acceptIdentity = (a: z.infer<typeof S.decideIdentity>) => decide(a, "accepted");
export const rejectIdentity = (a: z.infer<typeof S.decideIdentity>) => decide(a, "rejected");

export async function getIdentity(
  id: string,
): Promise<{ statement: IdentityStatement; versions: IdentityVersion[] }> {
  const conn = db();
  const statement = await row(conn, id);
  const rows = await q(
    conn,
    "SELECT * FROM mkt_identity_versions WHERE identity_id=? ORDER BY version DESC",
    [id],
  );
  return {
    statement,
    versions: rows.map((r) => ({
      version: Number(r.version),
      status: r.status,
      data: r.data,
      note: r.note,
      changedBy: r.changed_by,
      changedAt: r.changed_at,
    })),
  };
}

export async function identityForPlan(conn: DbExec, entityId: string) {
  const rows = (
    await q(
      conn,
      "SELECT * FROM mkt_identity WHERE entity_id=? AND status IN ('accepted','suggested') ORDER BY created_at",
      [entityId],
    )
  ).map(toStatement);
  return {
    accepted: rows
      .filter((r) => r.status === "accepted")
      .map((r) => ({ line: r.line, credit: r.credit, themes: r.themes })),
    suggested: rows.filter((r) => r.status === "suggested").length,
  };
}
