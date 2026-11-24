import type { DbExec } from "./host.js";
import type { z } from "zod";

import { defaultAppearance } from "../shared/entity-appearance.js";
import {
  DEFAULT_PRINCIPLES,
  EMPTY_PERSONA,
  type Account,
  type AccountDetail,
  type Channel,
  type Entity,
  type EntityDetail,
  type EntityGuidance,
  type GuidanceVersion,
  normalizePlan,
  type PlanLevel,
  planStatus,
  DEFAULT_PROOF_NEEDED,
  DEFAULT_SEASON,
  currentSeason,
  seasonStatus,
  type Season,
  ukToday,
  type Persona,
  type PersonaConflict,
} from "../shared/marketing.js";
import {
  activity,
  bad,
  checkVersion,
  clean,
  db,
  history,
  json,
  newId,
  notFound,
  now,
  nowDate,
  one,
  q,
  write,
} from "./core.js";
import { identityForPlan } from "./identity.js";
import type * as S from "./schemas.js";
import * as S_ from "./schemas.js";

export function toEntity(r: any): Entity {
  return {
    purpose: "",
    audiences: [],
    goals: [],
    archived: false,
    guidanceVersion: 1,
    ...defaultAppearance(r.id),

    navOrder: Date.parse(r.created_at) || 0,
    ...r.data,
    id: r.id,
    name: r.name,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
export function toChannel(r: any): Channel {
  return {
    description: "",
    url: "",
    archived: false,
    ...r.data,
    id: r.id,
    entityId: r.entity_id,
    kind: r.kind,
    name: r.name,
    version: r.version,
  };
}
export function toAccount(r: any): Account {
  return {
    handle: "",
    url: "",
    role: "",
    instructions: "",
    archived: false,
    personaVersion: 1,
    ...r.data,
    id: r.id,
    entityId: r.entity_id,
    channelId: r.channel_id,
    channelKind: r.channel_kind ?? r.data.channelKind,
    name: r.name,
    version: r.version,
  };
}

const ACCOUNT_SQL =
  "SELECT a.*, c.kind AS channel_kind FROM mkt_accounts a JOIN mkt_channels c ON c.id=a.channel_id";

export async function getEntity(conn: DbExec, id: string, active = false) {
  const r = await one(conn, "SELECT * FROM mkt_entities WHERE id=?", [id]);
  if (!r) notFound("entity");
  const e = toEntity(r);
  if (active && e.archived)
    bad(`${e.name} is archived; restore it before adding new work.`, "archived");
  return e;
}
export async function getChannel(conn: DbExec, id: string, active = false) {
  const r = await one(conn, "SELECT * FROM mkt_channels WHERE id=?", [id]);
  if (!r) notFound("channel");
  const c = toChannel(r);
  if (active && c.archived) bad(`${c.name} is archived.`, "archived");
  return c;
}

export async function getAccount(conn: DbExec, id: string, active = false) {
  const r = await one(conn, `${ACCOUNT_SQL} WHERE a.id=?`, [id]);
  if (!r) notFound("account");
  const a = toAccount(r);
  if (active) {
    if (a.archived)
      bad(`${a.name} is archived; no new work goes to inactive destinations.`, "archived");
    await getChannel(conn, a.channelId, true);
    await getEntity(conn, a.entityId, true);
  }
  return a;
}

export async function guidanceVersion<T>(
  conn: DbExec,
  kind: "entity" | "account",
  subjectId: string,
  n: number,
): Promise<GuidanceVersion<T>> {
  const r = await one(
    conn,
    "SELECT * FROM mkt_guidance WHERE subject_kind=? AND subject_id=? AND n=?",
    [kind, subjectId, n],
  );
  if (!r) notFound("guidance version");
  return {
    subjectKind: r.subject_kind,
    subjectId: r.subject_id,
    n: r.n,
    data: r.data,
    note: r.note,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}
export async function addGuidance(
  tx: DbExec,
  kind: "entity" | "account",
  subjectId: string,
  n: number,
  data: unknown,
  note: string,
  by: string,
) {
  await q(
    tx,
    "INSERT INTO mkt_guidance(subject_kind,subject_id,n,data,note,created_by,created_at) VALUES(?,?,?,?::jsonb,?,?,?)",
    [kind, subjectId, n, json(data), note, by, now()],
  );
}

export async function listEntities(includeArchived = true) {
  const rows = await q(
    db(),
    "SELECT e.*, (SELECT count(*) FROM mkt_accounts a WHERE a.entity_id=e.id AND NOT coalesce((a.data->>'archived')::boolean,false)) AS accounts FROM mkt_entities e ORDER BY lower(e.name)",
  );
  return {
    entities: rows
      .map((r) => ({
        ...toEntity(r),
        images: undefined,
        activeAccounts: Number(r.accounts),
      }))
      .filter((e) => includeArchived || !e.archived),
  };
}

export async function saveEntity(a: z.infer<typeof S.saveEntity>) {
  return write(a.by, a.requestId, ["save-entity", a], async (tx) => {
    const old = a.id ? await getEntity(tx, a.id) : null;
    if (old) checkVersion(old.version, a.expectedVersion);
    const name = clean(a.name ?? old?.name);
    if (!name) bad("Name is required.");
    const id = old?.id ?? newId();
    const dup = await one(tx, "SELECT id FROM mkt_entities WHERE lower(name)=lower(?) AND id<>?", [
      name,
      id,
    ]);
    if (dup) bad("An entity with that name already exists.", "duplicate_name", 409);
    const fallback = defaultAppearance(id);
    const data = {
      purpose: a.purpose ?? old?.purpose ?? "",
      audiences: a.audiences ?? old?.audiences ?? [],
      goals: a.goals ?? old?.goals ?? [],
      archived: a.archived ?? old?.archived ?? false,
      guidanceVersion: old?.guidanceVersion ?? 1,
      navOrder: old?.navOrder ?? Date.now(),
      icon: a.icon ?? old?.icon ?? fallback.icon,
      colour: (a.colour ?? old?.colour ?? fallback.colour).toLowerCase(),
      image: a.image ?? old?.image ?? "",
      images: a.images ?? old?.images ?? [],
    };
    if (old) {
      await q(
        tx,
        "UPDATE mkt_entities SET name=?, data=?::jsonb, version=version+1, updated_at=? WHERE id=?",
        [name, json(data), now(), id],
      );
      const changes = describeChanges(old, { ...data, name });
      await activity(tx, "entity", id, id, a.by, changes || "Saved entity");
    } else {
      await q(
        tx,
        "INSERT INTO mkt_entities(id,name,data,created_at,updated_at) VALUES(?,?,?::jsonb,?,?)",
        [id, name, json(data), now(), now()],
      );
      const initial: EntityGuidance = {
        principles: [...DEFAULT_PRINCIPLES],
        conduct: "",
        audiencePromise: "",
        verbalStyle: "",
        visual: { colours: [], typography: "", logos: [] },
        plan: normalizePlan(null),
      };
      await addGuidance(tx, "entity", id, 1, initial, "Agreed initial principles", a.by);
      await activity(tx, "entity", id, id, a.by, "Created entity");
    }
    return getEntity(tx, id);
  });
}

function describeChanges(old: Record<string, any>, next: Record<string, any>) {
  const fields = [
    "name",
    "purpose",
    "audiences",
    "goals",
    "archived",
    "icon",
    "colour",
    "image",
    "images",
  ];
  const changed = fields.filter((f) => json(old[f]) !== json(next[f]));
  if (changed.includes("archived")) return next.archived ? "Archived" : "Restored";
  return changed.length ? `Edited ${changed.join(", ")}` : "";
}

export async function currentGuidance(conn: DbExec, entity: Entity): Promise<EntityGuidance> {
  const g = (
    await guidanceVersion<EntityGuidance>(conn, "entity", entity.id, entity.guidanceVersion)
  ).data;
  return {
    principles: g.principles ?? [],
    conduct: g.conduct ?? "",
    audiencePromise: g.audiencePromise ?? "",
    verbalStyle: g.verbalStyle ?? "",
    ...(g.voice ? { voice: g.voice } : {}),
    visual: {
      ...{ colours: [] as string[], typography: "", logos: [] as string[] },
      ...(g.visual ?? {}),
    },
    plan: normalizePlan(g.plan),
  };
}

async function proofCounts(conn: DbExec, entityId: string) {
  const r = await one(
    conn,
    "SELECT count(*)::int AS entries, count(*) FILTER (WHERE coalesce(data->>'proofUrl','') ~* '^\\s*https{0,1}://\\S+' AND coalesce(data->>'linkOk','true') <> 'false')::int AS linked FROM mkt_knowledge WHERE entity_id=? AND status='active'",
    [entityId],
  );
  return {
    proofEntries: Number(r?.entries ?? 0),
    proofLinked: Number(r?.linked ?? 0),
  };
}

export async function getEntityDetail(id: string): Promise<EntityDetail> {
  const conn = db();
  const entity = await getEntity(conn, id);
  const guidance = await currentGuidance(conn, entity);
  const counts = await proofCounts(conn, id);
  const identity = await identityForPlan(conn, id);
  const season = await currentSeasonOf(conn, id, guidance.plan?.proof?.path ?? "");
  const plan = {
    levels: planStatus(guidance, entity, counts.proofLinked, season),
    ...counts,
    proofNeeded: season.proofNeeded,
    seasonTarget: season.target,
    identityAccepted: identity.accepted.length,
    identitySuggested: identity.suggested,
  };
  const channels = (
    await q(conn, "SELECT * FROM mkt_channels WHERE entity_id=? ORDER BY lower(name)", [id])
  ).map(toChannel);
  const accounts: AccountDetail[] = [];
  for (const r of await q(conn, `${ACCOUNT_SQL} WHERE a.entity_id=? ORDER BY lower(a.name)`, [
    id,
  ])) {
    const account = toAccount(r);
    const persona = (
      await guidanceVersion<Persona>(conn, "account", account.id, account.personaVersion)
    ).data;
    accounts.push({
      ...account,
      persona,
      conflicts: personaConflicts(persona, account.instructions, guidance),
    });
  }
  return {
    entity,
    guidance,
    plan,
    channels,
    accounts,
    history: await history(conn, "entity", id, 50),
  };
}

export async function saveChannel(a: z.infer<typeof S.saveChannel>) {
  return write(a.by, a.requestId, ["save-channel", a], async (tx) => {
    const old = a.id ? await getChannel(tx, a.id) : null;
    if (old) {
      checkVersion(old.version, a.expectedVersion);
      if (a.entityId && a.entityId !== old.entityId) bad("Channels cannot move between entities.");
      if (a.kind && a.kind !== old.kind)
        bad("A channel's kind is fixed; create a new channel instead.");
    }
    const entityId = old?.entityId ?? a.entityId;
    if (!entityId) bad("Choose the owning entity.");
    const kind = old?.kind ?? a.kind;
    if (!kind) bad("Choose a channel kind.");
    await getEntity(tx, entityId, !old || a.archived === false);
    const name = clean(a.name ?? old?.name);
    if (!name) bad("Name is required.");
    const id = old?.id ?? newId();
    if (
      await one(
        tx,
        "SELECT id FROM mkt_channels WHERE entity_id=? AND lower(name)=lower(?) AND id<>?",
        [entityId, name, id],
      )
    )
      bad("This entity already has a channel with that name.", "duplicate_name", 409);
    const data = {
      description: a.description ?? old?.description ?? "",
      url: a.url ?? old?.url ?? "",
      archived: a.archived ?? old?.archived ?? false,
    };
    if (old)
      await q(tx, "UPDATE mkt_channels SET name=?, data=?::jsonb, version=version+1 WHERE id=?", [
        name,
        json(data),
        id,
      ]);
    else
      await q(
        tx,
        "INSERT INTO mkt_channels(id,entity_id,kind,name,data) VALUES(?,?,?,?,?::jsonb)",
        [id, entityId, kind, name, json(data)],
      );
    await activity(
      tx,
      "entity",
      entityId,
      entityId,
      a.by,
      old
        ? old.archived !== data.archived
          ? `${data.archived ? "Archived" : "Restored"} channel ${name}`
          : `Edited channel ${name}`
        : `Added ${kind} channel ${name}`,
      { channelId: id },
    );
    return getChannel(tx, id);
  });
}

export async function saveAccount(a: z.infer<typeof S.saveAccount>) {
  return write(a.by, a.requestId, ["save-account", a], async (tx) => {
    const old = a.id ? await getAccount(tx, a.id) : null;
    if (old) {
      checkVersion(old.version, a.expectedVersion);
      if (
        (a.entityId && a.entityId !== old.entityId) ||
        (a.channelId && a.channelId !== old.channelId)
      )
        bad("An account's entity and channel are fixed; create a new account instead.");
    }
    const entityId = old?.entityId ?? a.entityId;
    const channelId = old?.channelId ?? a.channelId;
    if (!entityId || !channelId) bad("Choose the owning entity and channel.");
    const restoring = !old || (old.archived && a.archived === false);
    await getEntity(tx, entityId, restoring);
    const channel = await getChannel(tx, channelId, restoring);
    if (channel.entityId !== entityId) bad("The channel must belong to the same entity.");
    const name = clean(a.name ?? old?.name);
    if (!name) bad("Name is required.");
    const id = old?.id ?? newId();
    if (
      await one(
        tx,
        "SELECT id FROM mkt_accounts WHERE entity_id=? AND lower(name)=lower(?) AND id<>?",
        [entityId, name, id],
      )
    )
      bad("This entity already has an account with that name.", "duplicate_name", 409);
    const handle = clean(a.handle ?? old?.handle).replace(/^@/, "");
    const data = {
      handle,
      url: a.url ?? old?.url ?? (channel.kind === "x" && handle ? `https://x.com/${handle}` : ""),
      role: a.role ?? old?.role ?? "",
      instructions: a.instructions ?? old?.instructions ?? "",
      archived: a.archived ?? old?.archived ?? false,
      personaVersion: old?.personaVersion ?? 1,
    };
    if (old)
      await q(tx, "UPDATE mkt_accounts SET name=?, data=?::jsonb, version=version+1 WHERE id=?", [
        name,
        json(data),
        id,
      ]);
    else {
      await q(
        tx,
        "INSERT INTO mkt_accounts(id,entity_id,channel_id,name,data) VALUES(?,?,?,?,?::jsonb)",
        [id, entityId, channelId, name, json(data)],
      );
      await addGuidance(tx, "account", id, 1, EMPTY_PERSONA, "Initial persona", a.by);
    }
    const text = old
      ? old.archived !== data.archived
        ? `${data.archived ? "Archived" : "Restored"} account ${name}`
        : `Edited account ${name}`
      : `Added account ${name} on ${channel.name}`;
    await activity(tx, "entity", entityId, entityId, a.by, text, {
      accountId: id,
    });
    await activity(tx, "account", id, entityId, a.by, text);
    return getAccount(tx, id);
  });
}

export async function updateGuidance(a: z.infer<typeof S.updateGuidance>) {
  return write(a.by, a.requestId, ["update-guidance", a], async (tx) => {
    const e = await getEntity(tx, a.entityId);
    checkVersion(e.version, a.expectedVersion);
    const n = e.guidanceVersion + 1;
    const plan = a.guidance.plan ?? (await currentGuidance(tx, e)).plan;
    await addGuidance(tx, "entity", e.id, n, { ...a.guidance, plan }, a.note, a.by);
    await q(
      tx,
      "UPDATE mkt_entities SET data=jsonb_set(data,'{guidanceVersion}',to_jsonb(?::int)), version=version+1, updated_at=? WHERE id=?",
      [n, now(), e.id],
    );
    await activity(tx, "entity", e.id, e.id, a.by, `Saved principles and brand guidance v${n}`, {
      guidanceVersion: n,
    });
    return { entity: await getEntity(tx, e.id), guidanceVersion: n };
  });
}

export async function resolveEntity(conn: DbExec, ref: string) {
  const r = await one(
    conn,
    "SELECT id FROM mkt_entities WHERE id=? OR lower(name)=lower(?) ORDER BY id=? DESC LIMIT 1",
    [ref, ref.trim(), ref],
  );
  if (!r) {
    const all = await q(
      conn,
      "SELECT name FROM mkt_entities WHERE coalesce((data->>'archived')::boolean,false)=false ORDER BY lower(name)",
    );
    bad(
      `No brand called "${ref}". Brands: ${all.map((x) => x.name).join(", ") || "none"}.`,
      "not_found",
      404,
    );
  }
  return getEntity(conn, r.id);
}

export async function getPlan(a: z.infer<typeof S.getPlan>) {
  const conn = db();
  const entity = await resolveEntity(conn, a.entityId);
  const g = await currentGuidance(conn, entity);
  const counts = await proofCounts(conn, entity.id);
  const levels = planStatus(
    g,
    entity,
    counts.proofLinked,
    await currentSeasonOf(conn, entity.id, g.plan?.proof?.path ?? ""),
  );
  const identity = await identityForPlan(conn, entity.id);
  const p = g.plan;
  const fields: Record<PlanLevel, Record<string, unknown>> = {
    proof: {
      path: p.proof.path,
      proofEntries: counts.proofEntries,
      proofLinked: counts.proofLinked,
    },
    person: {
      ...p.person,
      purpose: entity.purpose,
      audiences: entity.audiences,
      goals: entity.goals,
      audiencePromise: g.audiencePromise,
    },
    association: {
      ...p.association,
      verbalStyle: g.verbalStyle,
      visual: g.visual,
      principles: g.principles,
      conduct: g.conduct,
      identityAccepted: identity.accepted.length,
      identitySuggested: identity.suggested,
    },
    product: { ...p.product },
    belt: { ...p.belt },
  };
  return {
    entity: {
      id: entity.id,
      name: entity.name,
      version: entity.version,
      guidanceVersion: entity.guidanceVersion,
    },
    levels: levels.map((l) => ({ ...l, fields: fields[l.level] })),
    next: levels.find((l) => l.state !== "done")?.missing[0] ?? null,

    season: await seasonSummary(conn, entity.id, p.proof.path),

    identity: identity.accepted,
  };
}

const LEVEL_TOP: Record<PlanLevel, string[]> = {
  proof: [],
  person: ["audiencePromise"],
  association: ["verbalStyle", "voice", "principles", "conduct", "visual"],
  product: [],
  belt: [],
};
const LEVEL_ENTITY: Record<PlanLevel, string[]> = {
  proof: [],
  person: ["purpose", "audiences", "goals"],
  association: [],
  product: [],
  belt: [],
};

export async function savePlanLevel(a: z.infer<typeof S.savePlanLevel>) {
  return write(a.by, a.requestId, ["save-plan-level", a], async (tx) => {
    const e = await getEntity(tx, a.entityId);
    checkVersion(e.version, a.expectedVersion);
    const g = await currentGuidance(tx, e);
    const v = a.values as Record<string, unknown>;
    const levelSchema = {
      proof: S_.planProof,
      person: S_.planPerson,
      association: S_.planAssociation,
      product: S_.planProduct,
      belt: S_.planBelt,
    }[a.level];
    const levelKeys = Object.keys(levelSchema.shape);
    const unknown = Object.keys(v).filter(
      (k) =>
        !levelKeys.includes(k) &&
        !LEVEL_TOP[a.level].includes(k) &&
        !LEVEL_ENTITY[a.level].includes(k),
    );
    if (unknown.length)
      bad(
        `${a.level} has no field ${unknown.join(", ")}. Fields: ${[...levelKeys, ...LEVEL_TOP[a.level], ...LEVEL_ENTITY[a.level]].join(", ")}.`,
        "bad_field",
      );
    const current = g.plan[a.level] as Record<string, unknown>;
    const merged = levelSchema.parse({
      ...current,
      ...Object.fromEntries(
        levelKeys
          .filter((k) => k in v)
          .map((k) => [
            k,
            k === "tests" ? { ...(current.tests as object), ...(v.tests as object) } : v[k],
          ]),
      ),
    });

    const sent = (keys: string[]) => keys.filter((k) => k in v);
    const only = <T extends Record<string, unknown>>(o: T, keys: string[]) =>
      Object.fromEntries(Object.entries(o).filter(([k]) => keys.includes(k))) as Partial<T>;
    const topKeys = sent(LEVEL_TOP[a.level]);
    const top = only(
      S_.guidance
        .omit({ plan: true })
        .partial()
        .parse(Object.fromEntries(topKeys.map((k) => [k, v[k]]))),
      topKeys,
    );
    const next: EntityGuidance = {
      ...g,
      ...top,
      visual: top.visual ? { ...g.visual, ...top.visual } : g.visual,
      plan: { ...g.plan, [a.level]: merged },
    } as EntityGuidance;
    const n = e.guidanceVersion + 1;
    await addGuidance(tx, "entity", e.id, n, next, a.note || `Plan: ${a.level}`, a.by);
    const entKeys = sent(LEVEL_ENTITY[a.level]);
    const ent = only(
      S_.saveEntity
        .pick({ purpose: true, audiences: true, goals: true })
        .partial()
        .parse(Object.fromEntries(entKeys.map((k) => [k, v[k]]))),
      entKeys,
    );
    await q(
      tx,
      "UPDATE mkt_entities SET data=jsonb_set(data || ?::jsonb,'{guidanceVersion}',to_jsonb(?::int)), version=version+1, updated_at=? WHERE id=?",
      [json(ent), n, now(), e.id],
    );
    await activity(
      tx,
      "entity",
      e.id,
      e.id,
      a.by,
      `Saved plan level ${a.level} (guidance v${n})${a.note ? `: ${a.note}` : ""}`,
      { guidanceVersion: n, level: a.level },
    );

    if (a.level === "proof" && "path" in v)
      await syncCurrentSeasonPath(tx, e.id, (merged as { path: string }).path, a.by);
    return {
      entity: await getEntity(tx, e.id),
      guidanceVersion: n,
      level: a.level,
      values: merged,
    };
  });
}

export async function updatePersona(a: z.infer<typeof S.updatePersona>) {
  return write(a.by, a.requestId, ["update-persona", a], async (tx) => {
    const acc = await getAccount(tx, a.accountId);
    checkVersion(acc.version, a.expectedVersion);
    const n = acc.personaVersion + 1;
    await addGuidance(tx, "account", acc.id, n, a.persona, a.note, a.by);
    await q(
      tx,
      "UPDATE mkt_accounts SET data=jsonb_set(data,'{personaVersion}',to_jsonb(?::int)), version=version+1 WHERE id=?",
      [n, acc.id],
    );
    await activity(tx, "account", acc.id, acc.entityId, a.by, `Saved persona v${n}`, {
      personaVersion: n,
    });
    await activity(
      tx,
      "entity",
      acc.entityId,
      acc.entityId,
      a.by,
      `Saved ${acc.name} persona v${n}`,
      {
        accountId: acc.id,
      },
    );
    const e = await getEntity(tx, acc.entityId);
    const guidance = (await guidanceVersion<EntityGuidance>(tx, "entity", e.id, e.guidanceVersion))
      .data;
    return {
      account: await getAccount(tx, acc.id),
      personaVersion: n,
      conflicts: personaConflicts(a.persona as Persona, acc.instructions, guidance),
    };
  });
}

export async function listGuidanceVersions(kind: "entity" | "account", subjectId: string) {
  return {
    versions: (
      await q(
        db(),
        "SELECT * FROM mkt_guidance WHERE subject_kind=? AND subject_id=? ORDER BY n DESC",
        [kind, subjectId],
      )
    ).map((r) => ({
      subjectKind: r.subject_kind,
      subjectId: r.subject_id,
      n: r.n,
      data: r.data,
      note: r.note,
      createdBy: r.created_by,
      createdAt: r.created_at,
    })),
  };
}

const CONFLICT_RULES: {
  pattern: RegExp;
  topic: RegExp;
  explanation: string;
}[] = [
  {
    pattern:
      /\b(mock|ridicule|roast|dunk(?:s|ing)? on|humiliat\w*|trash[- ]talk\w*|exploit\w*\s+(?:their\s+)?(?:outage|setback|failure)s?)\b/i,
    topic: /competitor|disparag/i,
    explanation: "Ridicule or exploiting setbacks conflicts with respecting competitors.",
  },
  {
    pattern: /\b(make up|invent\w*|fabricat\w*|fake|embellish\w*)\b/i,
    topic: /invent|evidence|honest/i,
    explanation:
      "Inventing or embellishing experience conflicts with grounding claims in real evidence.",
  },
  {
    pattern: /\b(always (?:be )?positive|never admit|hype everything|overpromise)\b/i,
    topic: /honest|constructive/i,
    explanation: "Artificial positivity conflicts with being honest and constructive.",
  },
  {
    pattern:
      /\b(announce|claim)\w*\s+(?:a\s+)?fix\w*\s+(?:before|without)\b|\bpromise\w*\s+(?:a\s+)?fix\b/i,
    topic: /verif|fix/i,
    explanation:
      "Claiming or promising fixes before verification conflicts with the verify-first principle.",
  },
];
export function personaConflicts(
  persona: Persona,
  instructions: string,
  guidance: EntityGuidance,
): PersonaConflict[] {
  const fields: [string, string][] = [
    ["tone", persona.tone],
    ["audience", persona.audience],
    ["instructions", instructions],
    ...persona.traits.map((t, i) => [`traits[${i}]`, t] as [string, string]),
    ...persona.topics.map((t, i) => [`topics[${i}]`, t] as [string, string]),
    ...persona.examples.map((t, i) => [`examples[${i}]`, t] as [string, string]),
  ];
  const out: PersonaConflict[] = [];
  for (const rule of CONFLICT_RULES) {
    const principle = guidance.principles.find((p) => rule.topic.test(p));
    if (!principle) continue;
    for (const [field, value] of fields) {
      const m = rule.pattern.exec(value ?? "");
      if (m)
        out.push({
          field,
          excerpt: value.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30),
          principle,
          explanation: rule.explanation,
        });
    }
  }
  return out;
}

export async function listAccounts(entityId?: string, includeArchived = false) {
  const rows = await q(
    db(),
    `${ACCOUNT_SQL} JOIN mkt_entities e ON e.id=a.entity_id ${entityId ? "WHERE a.entity_id=?" : ""} ORDER BY lower(e.name), lower(a.name)`,
    entityId ? [entityId] : [],
  );
  const entities = new Map(
    (await q(db(), "SELECT id,name,data FROM mkt_entities")).map((r) => [
      r.id,
      { name: r.name, archived: Boolean(r.data.archived) },
    ]),
  );
  return {
    accounts: rows
      .map((r) => {
        const a = toAccount(r);
        const e = entities.get(a.entityId);
        return {
          ...a,
          entityName: e?.name ?? "",
          entityArchived: e?.archived ?? false,
        };
      })
      .filter((a) => includeArchived || (!a.archived && !a.entityArchived)),
  };
}

export async function reorderEntities(a: z.infer<typeof S.reorderEntities>) {
  return write(a.by, a.requestId, ["reorder-entities", a], async (tx) => {
    if (new Set(a.entities.map((e) => e.id)).size !== a.entities.length)
      bad("Duplicate entity IDs.");
    const active = (
      await q(
        tx,
        "SELECT id FROM mkt_entities WHERE NOT coalesce((data->>'archived')::boolean,false)",
      )
    ).map((r) => r.id as string);
    const given = new Set(a.entities.map((e) => e.id));
    if (active.length !== given.size || active.some((id) => !given.has(id)))
      bad("Include every active entity exactly once.", "incomplete_order");
    for (const item of a.entities)
      checkVersion((await getEntity(tx, item.id)).version, item.expectedVersion);
    for (const [index, item] of a.entities.entries())
      await q(
        tx,
        "UPDATE mkt_entities SET data=jsonb_set(data,'{navOrder}',to_jsonb(?::int)), version=version+1, updated_at=? WHERE id=?",
        [index, now(), item.id],
      );
    await activity(
      tx,
      "system",
      "entity-order",
      null,
      a.by,
      `Reordered entities: ${a.entities.map((e) => e.id.slice(0, 8)).join(", ")}`,
    );
    return { reordered: a.entities.map((e) => e.id) };
  });
}

async function syncCurrentSeasonPath(tx: DbExec, entityId: string, path: string, by: string) {
  const day = ukToday(nowDate());
  const rows = await q(tx, "SELECT n, data FROM mkt_seasons WHERE entity_id=? ORDER BY n", [
    entityId,
  ]);
  if (!rows.length) {
    await q(
      tx,
      "INSERT INTO mkt_seasons(entity_id,n,data,updated_by,created_at,updated_at) VALUES(?,1,?::jsonb,?,?,?)",
      [
        entityId,
        json({
          start: DEFAULT_SEASON.start,
          end: DEFAULT_SEASON.end,
          goal: "",
          path,
          target: null,
          proofNeeded: DEFAULT_PROOF_NEEDED,
        }),
        by,
        now(),
        now(),
      ],
    );
    return;
  }
  const cur = currentSeason(
    rows.map((r) => ({ n: r.n as number, start: r.data.start as string })),
    day,
  )!;
  await q(
    tx,
    "UPDATE mkt_seasons SET data=jsonb_set(data,'{path}',to_jsonb(?::text)), version=version+1, updated_by=?, updated_at=? WHERE entity_id=? AND n=? AND coalesce(data->>'path','')<>?",
    [path, by, now(), entityId, cur.n, path],
  );
}

export async function seasonsOf(
  conn: DbExec,
  entityId: string,
  fallbackPath = "",
): Promise<Season[]> {
  const rows = await q(
    conn,
    "SELECT n, data, version FROM mkt_seasons WHERE entity_id=? ORDER BY n",
    [entityId],
  );
  if (!rows.length)
    return [
      {
        n: 1,
        start: DEFAULT_SEASON.start,
        end: DEFAULT_SEASON.end,
        goal: "",
        path: fallbackPath as Season["path"],
        target: null,
        proofNeeded: DEFAULT_PROOF_NEEDED,
        version: 0,
      },
    ];
  return rows.map((r) => ({
    n: Number(r.n),
    start: r.data.start,
    end: r.data.end,
    goal: r.data.goal ?? "",
    path: r.data.path ?? "",
    target: r.data.target == null ? null : Number(r.data.target),
    proofNeeded: Number(r.data.proofNeeded ?? DEFAULT_PROOF_NEEDED),
    notes: String(r.data.notes ?? ""),
    version: Number(r.version),
  }));
}

export async function currentSeasonOf(conn: DbExec, entityId: string, fallbackPath = "") {
  return currentSeason(await seasonsOf(conn, entityId, fallbackPath), ukToday(nowDate()))!;
}

async function seasonSummary(conn: DbExec, entityId: string, fallbackPath: string) {
  const day = ukToday(nowDate());
  const all = await seasonsOf(conn, entityId, fallbackPath);
  const cur = currentSeason(all, day)!;
  return {
    ...seasonStatus(cur, day),
    goal: cur.goal,
    path: cur.path,
    target: cur.target,
    proofNeeded: cur.proofNeeded,
    seasons: all.length,
  };
}
