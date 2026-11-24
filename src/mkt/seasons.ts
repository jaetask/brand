import type { DbExec } from "./host.js";
import type { z } from "zod";

import {
  currentSeason,
  normalizePlan,
  seasonStatus,
  ukToday,
  type Season,
} from "../shared/marketing.js";
import { activity, bad, checkVersion, db, json, nowDate, now, q, write } from "./core.js";
import { addGuidance, currentGuidance, getEntity, resolveEntity, seasonsOf } from "./entities.js";
import type * as S from "./schemas.js";

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const validDay = (d: string) =>
  !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) &&
  new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

const firstClause = (t: string) =>
  t
    .trim()
    .split(/\s\(|\.\s|;\s/)[0]
    .replace(/\.$/, "");

async function view(conn: DbExec, entityId: string) {
  const entity = await getEntity(conn, entityId);
  const g = await currentGuidance(conn, entity);
  const plan = normalizePlan(g.plan);
  const day = ukToday(nowDate());
  const seasons = await seasonsOf(conn, entityId, plan.proof.path);
  const cur = currentSeason(seasons, day)!;
  const next = seasons.find((s) => s.n === cur.n + 1) ?? null;
  const status = seasonStatus(cur, day);
  return {
    entity: { id: entity.id, name: entity.name },
    today: day,
    seasons: seasons.map((s) => ({ ...s, ...seasonStatus(s, day) })),
    current: {
      ...cur,
      ...status,
      headline:
        cur.goal || [plan.belt.project, firstClause(plan.belt.target)].filter(Boolean).join(": "),
    },
    next,

    nextOpensOn: cur.end,
    canCreateNext: !next && (status.ended || status.day === status.length),

    ideas: (
      await q(conn, "SELECT n, idea FROM mkt_season_ideas WHERE entity_id=? ORDER BY n", [entityId])
    ).map((r) => ({ n: Number(r.n), idea: String(r.idea) })),
  };
}

export async function listSeasons(a: z.infer<typeof S.listSeasons>) {
  const conn = db();
  const e = await resolveEntity(conn, a.entityId);
  return view(conn, e.id);
}

function checkDates(start: string, end: string, others: Season[]) {
  if (!validDay(start) || !validDay(end)) bad("Use real dates, YYYY-MM-DD.", "bad_date");
  if (end < start) bad("A season ends after it starts.", "bad_dates");
  const clash = others.find((o) => !(end < o.start || start > o.end));
  if (clash)
    bad(`Season ${clash.n} runs ${clash.start} to ${clash.end}; seasons can't overlap.`, "overlap");
}

async function syncProofPath(tx: DbExec, entityId: string, path: string, by: string) {
  const e = await getEntity(tx, entityId);
  const g = await currentGuidance(tx, e);
  if ((g.plan?.proof?.path ?? "") === path) return;
  const n = e.guidanceVersion + 1;
  await addGuidance(
    tx,
    "entity",
    e.id,
    n,
    { ...g, plan: { ...g.plan, proof: { ...g.plan.proof, path } } },
    `Season path ${path || "cleared"}`,
    by,
  );
  await q(
    tx,
    "UPDATE mkt_entities SET data=jsonb_set(data,'{guidanceVersion}',to_jsonb(?::int)), version=version+1, updated_at=? WHERE id=?",
    [n, now(), e.id],
  );
}

async function store(
  tx: DbExec,
  entityId: string,
  s: Omit<Season, "version">,
  by: string,
  exists: boolean,
) {
  const data = json({
    start: s.start,
    end: s.end,
    goal: s.goal,
    path: s.path,
    target: s.target,
    proofNeeded: s.proofNeeded,
    notes: s.notes ?? "",
  });
  if (exists)
    await q(
      tx,
      "UPDATE mkt_seasons SET data=?::jsonb, version=version+1, updated_by=?, updated_at=? WHERE entity_id=? AND n=?",
      [data, by, now(), entityId, s.n],
    );
  else
    await q(
      tx,
      "INSERT INTO mkt_seasons(entity_id,n,data,updated_by,created_at,updated_at) VALUES(?,?,?::jsonb,?,?,?)",
      [entityId, s.n, data, by, now(), now()],
    );
}

export async function saveSeason(a: z.infer<typeof S.saveSeason>) {
  return write(a.by, a.requestId, ["save-season", a], async (tx) => {
    const e = await resolveEntity(tx, a.entityId);
    const day = ukToday(nowDate());
    const plan = normalizePlan((await currentGuidance(tx, e)).plan);
    const all = await seasonsOf(tx, e.id, plan.proof.path);
    const cur = currentSeason(all, day)!;
    const old = all.find((s) => s.n === (a.n ?? cur.n));
    if (!old) bad(`${e.name} has no season ${a.n}.`, "not_found", 404);
    if (a.expectedVersion !== undefined && old.version)
      checkVersion(old.version, a.expectedVersion);
    const next = {
      n: old.n,
      start: a.start ?? old.start,
      end: a.end ?? old.end,
      goal: a.goal ?? old.goal,
      path: a.path ?? old.path,
      target: a.target === undefined ? old.target : a.target,
      proofNeeded: a.proofNeeded ?? old.proofNeeded,
      notes: a.notes ?? old.notes ?? "",
    };
    checkDates(
      next.start,
      next.end,
      all.filter((s) => s.n !== old.n),
    );
    await store(tx, e.id, next, a.by, old.version > 0);
    if (
      a.path !== undefined &&
      old.n ===
        currentSeason(
          all.map((s) => (s.n === old.n ? { ...s, ...next } : s)),
          day,
        )!.n
    )
      await syncProofPath(tx, e.id, next.path, a.by);
    const changed = (
      ["start", "end", "goal", "path", "target", "proofNeeded", "notes"] as const
    ).filter((k) => next[k] !== old[k]);
    await activity(
      tx,
      "entity",
      e.id,
      e.id,
      a.by,
      `Season ${old.n}: ${changed.length ? changed.map((k) => (k === "notes" ? "notes" : `${k} ${next[k] ?? "cleared"}`)).join(", ") : "no change"}`,
      { season: old.n },
    );
    return view(tx, e.id);
  });
}

export async function createSeason(a: z.infer<typeof S.createSeason>) {
  return write(a.by, a.requestId, ["create-season", a], async (tx) => {
    const e = await resolveEntity(tx, a.entityId);
    const plan = normalizePlan((await currentGuidance(tx, e)).plan);
    const all = await seasonsOf(tx, e.id, plan.proof.path);
    const last = all[all.length - 1];

    if (last.version === 0) await store(tx, e.id, last, a.by, false);
    const start = a.start ?? addDays(last.end, 1);
    const s = {
      n: last.n + 1,
      start,
      end: addDays(start, a.days - 1),
      goal: a.goal,
      path: a.path ?? last.path,
      target: a.target === undefined ? last.target : a.target,
      proofNeeded: a.proofNeeded ?? last.proofNeeded,
    };
    checkDates(s.start, s.end, all);
    if (s.start < last.start) bad("A new season starts after the last one.", "bad_dates");
    await store(tx, e.id, s, a.by, false);
    await activity(
      tx,
      "entity",
      e.id,
      e.id,
      a.by,
      `Planned season ${s.n}: ${s.start} to ${s.end}`,
      { season: s.n },
    );
    return view(tx, e.id);
  });
}

export async function saveSeasonIdea(a: z.infer<typeof S.saveSeasonIdea>) {
  return write(a.by, a.requestId, ["save-season-idea", a], async (tx) => {
    const e = await resolveEntity(tx, a.entityId);
    if (a.idea)
      await q(
        tx,
        "INSERT INTO mkt_season_ideas(entity_id,n,idea,updated_by,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(entity_id,n) DO UPDATE SET idea=EXCLUDED.idea, version=mkt_season_ideas.version+1, updated_by=EXCLUDED.updated_by, updated_at=EXCLUDED.updated_at",
        [e.id, a.n, a.idea, a.by, now()],
      );
    else await q(tx, "DELETE FROM mkt_season_ideas WHERE entity_id=? AND n=?", [e.id, a.n]);
    await activity(
      tx,
      "entity",
      e.id,
      e.id,
      a.by,
      a.idea ? `Season ${a.n} idea: ${a.idea}` : `Cleared the season ${a.n} idea`,
      { season: a.n },
    );
    return view(tx, e.id);
  });
}
