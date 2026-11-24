import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Refusal } from "@jaetask/open-agent-kit";
import {
  type Account,
  type Brand,
  type BrandDetail,
  type Channel,
  type ChannelKind,
  countsAsProof,
  currentSeason,
  DEFAULT_PRINCIPLES,
  DEFAULT_PROOF_NEEDED,
  DEFAULT_SEASON,
  EMPTY_PERSONA,
  emptyPlan,
  type Guidance,
  type HistoryItem,
  type Identity,
  type IdentityData,
  normalizeGuidance,
  OWNER,
  type Peer,
  type Persona,
  planStatus,
  type Proof,
  type ProofData,
  type Season,
  type SeasonIdea,
  ukToday,
} from "./model.js";

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS brand_actors (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS brand_guidance (
  subject_kind TEXT NOT NULL CHECK(subject_kind IN ('brand','account')), subject_id TEXT NOT NULL,
  n INTEGER NOT NULL CHECK(n > 0), data TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(subject_kind, subject_id, n)
);
CREATE TABLE IF NOT EXISTS brand_channels (
  id TEXT PRIMARY KEY, brand_id TEXT NOT NULL REFERENCES brands(id),
  kind TEXT NOT NULL CHECK(kind IN ('x','blog','newsletter','website','other')),
  name TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS brand_accounts (
  id TEXT PRIMARY KEY, brand_id TEXT NOT NULL REFERENCES brands(id),
  channel_id TEXT NOT NULL REFERENCES brand_channels(id), name TEXT NOT NULL,
  data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS brand_peers (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES brand_accounts(id), handle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','removed')),
  data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, removed_at TEXT
);
CREATE TABLE IF NOT EXISTS brand_identity (
  id TEXT PRIMARY KEY, brand_id TEXT NOT NULL REFERENCES brands(id),
  status TEXT NOT NULL CHECK(status IN ('suggested','accepted','rejected','retired')),
  data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
  suggested_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS brand_identity_versions (
  identity_id TEXT NOT NULL REFERENCES brand_identity(id), version INTEGER NOT NULL,
  status TEXT NOT NULL, data TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
  changed_by TEXT NOT NULL, changed_at TEXT NOT NULL, PRIMARY KEY(identity_id, version)
);
CREATE TABLE IF NOT EXISTS brand_proof (
  id TEXT PRIMARY KEY, brand_id TEXT NOT NULL REFERENCES brands(id), account_id TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('story','opinion','fact','reference')),
  provenance TEXT NOT NULL CHECK(provenance IN ('firsthand','third_party','unverified')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived','withdrawn')),
  data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS brand_proof_versions (
  proof_id TEXT NOT NULL REFERENCES brand_proof(id), version INTEGER NOT NULL,
  kind TEXT NOT NULL, provenance TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '', changed_by TEXT NOT NULL, changed_at TEXT NOT NULL,
  PRIMARY KEY(proof_id, version)
);
CREATE TABLE IF NOT EXISTS brand_seasons (
  brand_id TEXT NOT NULL REFERENCES brands(id), n INTEGER NOT NULL, data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(brand_id, n)
);
CREATE TABLE IF NOT EXISTS brand_season_ideas (
  brand_id TEXT NOT NULL REFERENCES brands(id), n INTEGER NOT NULL, idea TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(brand_id, n)
);
CREATE TABLE IF NOT EXISTS brand_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT, subject_kind TEXT NOT NULL, subject_id TEXT NOT NULL,
  brand_id TEXT, actor_id TEXT NOT NULL, text TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
`;

const migrated = new WeakSet<DatabaseSync>();
export function migrateBrand(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  db.exec(SCHEMA);
  db.prepare("INSERT OR IGNORE INTO brand_actors (id, name, kind) VALUES (?, ?, 'human')").run(
    OWNER,
    "You",
  );
  migrated.add(db);
}

type Row = Record<string, unknown>;
type Json = Record<string, unknown>;
const json = (v: unknown): Json => JSON.parse(String(v ?? "{}")) as Json;
const str = (v: unknown) => String(v ?? "");

export type BrandPatch = Partial<
  Pick<Brand, "name" | "icon" | "colour" | "image" | "images" | "purpose" | "audiences" | "goals">
>;
export type GuidancePatch = Partial<Omit<Guidance, "plan">> & { plan?: Partial<Guidance["plan"]> };
export type SeasonPatch = Partial<
  Pick<Season, "start" | "end" | "goal" | "path" | "target" | "proofNeeded" | "notes">
>;

export type Store = ReturnType<typeof sqliteBrands>;

export function sqliteBrands(db: DatabaseSync, now: () => number = Date.now) {
  migrateBrand(db);
  const at = () => new Date(now()).toISOString();
  const all = (sql: string, ...args: (string | number | null)[]) =>
    db.prepare(sql).all(...args) as Row[];
  const one = (sql: string, ...args: (string | number | null)[]) =>
    db.prepare(sql).get(...args) as Row | undefined;
  const run = (sql: string, ...args: (string | number | null)[]) => db.prepare(sql).run(...args);

  const tx = <T>(work: () => T): T => {
    db.exec("SAVEPOINT brand_write");
    try {
      const out = work();
      db.exec("RELEASE brand_write");
      return out;
    } catch (error) {
      db.exec("ROLLBACK TO brand_write");
      db.exec("RELEASE brand_write");
      throw error;
    }
  };

  const log = (
    subjectKind: string,
    subjectId: string,
    brandId: string | null,
    by: string,
    text: string,
    data: Json = {},
  ) =>
    run(
      "INSERT INTO brand_history (subject_kind, subject_id, brand_id, actor_id, text, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      subjectKind,
      subjectId,
      brandId,
      by,
      text,
      JSON.stringify(data),
      at(),
    );

  const toBrand = (r: Row, withImages: boolean): Brand => {
    const d = json(r.data);
    const brand: Brand = {
      id: str(r.id),
      name: str(r.name),
      icon: str(d.icon),
      colour: str(d.colour),
      navOrder: Number(d.navOrder ?? 0),
      purpose: str(d.purpose),
      audiences: (d.audiences as string[] | undefined) ?? [],
      goals: (d.goals as string[] | undefined) ?? [],
      archived: Boolean(d.archived),
      guidanceVersion: Number(d.guidanceVersion ?? 1),
      version: Number(r.version),
      createdAt: str(r.created_at),
      updatedAt: str(r.updated_at),
    };
    if (typeof d.image === "string") brand.image = d.image;
    if (withImages && Array.isArray(d.images)) brand.images = d.images as string[];
    return brand;
  };

  const brandRow = (id: string) => {
    const r = one("SELECT * FROM brands WHERE id = ?", id);
    if (!r) throw new Refusal("not-found", `No brand has the id ${id}.`);
    return r;
  };

  const writeBrandData = (id: string, change: (d: Json) => Json, name?: string) => {
    const r = brandRow(id);
    const d = change(json(r.data));
    run(
      "UPDATE brands SET name = ?, data = ?, version = version + 1, updated_at = ? WHERE id = ?",
      name ?? str(r.name),
      JSON.stringify(d),
      at(),
      id,
    );
  };

  const guidanceOf = (kind: "brand" | "account", id: string) =>
    one(
      "SELECT * FROM brand_guidance WHERE subject_kind = ? AND subject_id = ? ORDER BY n DESC LIMIT 1",
      kind,
      id,
    );

  const toIdentity = (r: Row): Identity => {
    const d = json(r.data);
    return {
      id: str(r.id),
      brandId: str(r.brand_id),
      status: str(r.status) as Identity["status"],
      version: Number(r.version),
      suggestedBy: str(r.suggested_by),
      createdAt: str(r.created_at),
      updatedAt: str(r.updated_at),
      line: str(d.line),
      credit: str(d.credit),
      creditUrl: str(d.creditUrl),
      thought: str(d.thought),
      themes: (d.themes as string[] | undefined) ?? [],
    };
  };

  const proofData = (d: Json): ProofData => {
    const out: ProofData = {
      title: str(d.title),
      body: str(d.body),
      source: str(d.source),
      sourceUrl: str(d.sourceUrl),
      proofUrl: str(d.proofUrl),
      speaker: str(d.speaker),
      subject: str(d.subject),
      occurredOn: str(d.occurredOn),
      topics: (d.topics as string[] | undefined) ?? [],
      uncertainty: str(d.uncertainty),
    };
    if (d.linkOk !== undefined) out.linkOk = d.linkOk as boolean | null;
    if (typeof d.linkCheckedAt === "string") out.linkCheckedAt = d.linkCheckedAt;
    return out;
  };

  const toProof = (r: Row): Proof => ({
    ...proofData(json(r.data)),
    id: str(r.id),
    brandId: str(r.brand_id),
    accountId: r.account_id == null ? null : str(r.account_id),
    kind: str(r.kind) as Proof["kind"],
    provenance: str(r.provenance) as Proof["provenance"],
    status: str(r.status) as Proof["status"],
    version: Number(r.version),
    createdBy: str(r.created_by),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  });

  const toChannel = (r: Row): Channel => {
    const d = json(r.data);
    return {
      id: str(r.id),
      brandId: str(r.brand_id),
      kind: str(r.kind) as ChannelKind,
      name: str(r.name),
      description: str(d.description),
      url: str(d.url),
      archived: Boolean(d.archived),
      version: Number(r.version),
    };
  };

  const toPeer = (r: Row): Peer => {
    const d = json(r.data);
    return {
      id: str(r.id),
      accountId: str(r.account_id),
      handle: str(r.handle),
      name: str(d.name),
      url: str(d.url),
      sector: str(d.sector),
      reason: str(d.reason),
      status: str(r.status) as Peer["status"],
      version: Number(r.version),
      createdBy: str(r.created_by),
      createdAt: str(r.created_at),
      removedAt: r.removed_at == null ? null : str(r.removed_at),
    };
  };

  const toPersona = (d: Json | undefined): Persona => ({
    ...EMPTY_PERSONA,
    ...(d ?? {}),
  });

  const toAccount = (r: Row, channels: Channel[]): Account => {
    const d = json(r.data);
    const persona = guidanceOf("account", str(r.id));
    return {
      id: str(r.id),
      brandId: str(r.brand_id),
      channelId: str(r.channel_id),
      channelKind: channels.find((c) => c.id === str(r.channel_id))?.kind ?? "other",
      name: str(r.name),
      handle: str(d.handle),
      url: str(d.url),
      role: str(d.role),
      instructions: str(d.instructions),
      archived: Boolean(d.archived),
      personaVersion: Number(d.personaVersion ?? 1),
      version: Number(r.version),
      persona: toPersona(persona ? json(persona.data) : undefined),
      peers: all(
        "SELECT * FROM brand_peers WHERE account_id = ? ORDER BY created_at",
        str(r.id),
      ).map(toPeer),
    };
  };

  const toSeason = (r: Row, ideas: SeasonIdea[]): Season => {
    const d = json(r.data);
    const n = Number(r.n);
    const season: Season = {
      n,
      start: str(d.start),
      end: str(d.end),
      goal: str(d.goal),
      path: (str(d.path) || "") as Season["path"],
      target: d.target == null ? null : Number(d.target),
      proofNeeded: Number(d.proofNeeded ?? DEFAULT_PROOF_NEEDED),
      version: Number(r.version),
      idea: ideas.find((i) => i.n === n)?.idea ?? "",
    };
    if (typeof d.notes === "string") season.notes = d.notes;
    return season;
  };

  const ideasOf = (id: string): SeasonIdea[] =>
    all("SELECT * FROM brand_season_ideas WHERE brand_id = ? ORDER BY n", id).map((r) => ({
      n: Number(r.n),
      idea: str(r.idea),
      version: Number(r.version),
    }));

  const seasonsOf = (id: string) => {
    const ideas = ideasOf(id);
    return all("SELECT * FROM brand_seasons WHERE brand_id = ? ORDER BY n", id).map((r) =>
      toSeason(r, ideas),
    );
  };

  const historyOf = (id: string): HistoryItem[] =>
    all("SELECT * FROM brand_history WHERE brand_id = ? ORDER BY id DESC LIMIT 200", id).map(
      (r) => ({
        id: Number(r.id),
        subjectKind: str(r.subject_kind),
        subjectId: str(r.subject_id),
        actorId: str(r.actor_id),
        text: str(r.text),
        createdAt: str(r.created_at),
      }),
    );

  const ensureSeason = (id: string, by: string) => {
    if (one("SELECT 1 FROM brand_seasons WHERE brand_id = ?", id)) return;
    const stamp = at();
    run(
      "INSERT INTO brand_seasons (brand_id, n, data, version, updated_by, created_at, updated_at) VALUES (?, 1, ?, 1, ?, ?, ?)",
      id,
      JSON.stringify({
        start: DEFAULT_SEASON.start,
        end: DEFAULT_SEASON.end,
        goal: "",
        path: "",
        target: null,
        proofNeeded: DEFAULT_PROOF_NEEDED,
      }),
      by,
      stamp,
      stamp,
    );
  };

  const store = {
    actors: () =>
      all("SELECT id, name, kind FROM brand_actors ORDER BY name").map((r) => ({
        id: str(r.id),
        name: str(r.name),
        kind: str(r.kind),
      })),

    list: (archived = false): Brand[] =>
      all("SELECT * FROM brands")
        .map((r) => toBrand(r, false))
        .filter((b) => b.archived === archived)
        .sort((a, b) => a.navOrder - b.navOrder || a.name.localeCompare(b.name)),

    detail: (id: string): BrandDetail => {
      const brand = toBrand(brandRow(id), true);
      const g = guidanceOf("brand", id);
      const guidance = normalizeGuidance(g ? json(g.data) : {});
      const channels = all("SELECT * FROM brand_channels WHERE brand_id = ? ORDER BY name", id).map(
        toChannel,
      );
      const accounts = all("SELECT * FROM brand_accounts WHERE brand_id = ? ORDER BY name", id).map(
        (r) => toAccount(r, channels),
      );
      const identity = all(
        "SELECT * FROM brand_identity WHERE brand_id = ? ORDER BY created_at",
        id,
      ).map(toIdentity);
      const proof = all(
        "SELECT * FROM brand_proof WHERE brand_id = ? ORDER BY created_at DESC",
        id,
      ).map(toProof);
      const seasons = seasonsOf(id);
      const season = currentSeason(seasons, ukToday(new Date(now())));
      const own = proof.filter((p) => p.status === "active" && p.provenance === "firsthand");
      const proofLinked = own.filter((p) => countsAsProof(p.proofUrl, p.linkOk)).length;
      const seasonFacts = {
        proofNeeded: season?.proofNeeded ?? DEFAULT_PROOF_NEEDED,
        target: season?.target ?? null,
      };
      return {
        brand,
        guidance,
        plan: {
          levels: planStatus(guidance, brand, proofLinked, seasonFacts),
          proofLinked,
          proofEntries: own.length,
          identityAccepted: identity.filter((i) => i.status === "accepted").length,
          identitySuggested: identity.filter((i) => i.status === "suggested").length,
          proofNeeded: seasonFacts.proofNeeded,
          seasonTarget: seasonFacts.target,
        },
        channels,
        accounts,
        identity,
        proof,
        seasons,
        ideas: ideasOf(id),
        guidanceVersions: all(
          "SELECT n, note, created_by, created_at FROM brand_guidance WHERE subject_kind = 'brand' AND subject_id = ? ORDER BY n DESC",
          id,
        ).map((r) => ({
          n: Number(r.n),
          note: str(r.note),
          createdBy: str(r.created_by),
          createdAt: str(r.created_at),
        })),
        history: historyOf(id),
      };
    },

    create: (name: string, by: string): Brand =>
      tx(() => {
        const id = randomUUID();
        const stamp = at();
        const last = Math.max(0, ...store.list().map((b) => b.navOrder));
        run(
          "INSERT INTO brands (id, name, data, version, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
          id,
          name,
          JSON.stringify({
            icon: "folder",
            colour: "#64748b",
            navOrder: last + 1,
            purpose: "",
            audiences: [],
            goals: [],
            archived: false,
            guidanceVersion: 1,
          }),
          stamp,
          stamp,
        );
        const guidance: Guidance = {
          principles: [...DEFAULT_PRINCIPLES],
          conduct: "",
          audiencePromise: "",
          verbalStyle: "",
          visual: { colours: [], typography: "", logos: [] },
          plan: emptyPlan(),
        };
        run(
          "INSERT INTO brand_guidance (subject_kind, subject_id, n, data, note, created_by, created_at) VALUES ('brand', ?, 1, ?, 'Created', ?, ?)",
          id,
          JSON.stringify(guidance),
          by,
          stamp,
        );
        ensureSeason(id, by);
        log("brand", id, id, by, `Created brand ${name}`);
        return toBrand(brandRow(id), true);
      }),

    edit: (id: string, patch: BrandPatch, by: string): Brand =>
      tx(() => {
        const { name, ...rest } = patch;
        writeBrandData(id, (d) => ({ ...d, ...rest }), name);
        const what = Object.keys(patch).join(", ");
        log("brand", id, id, by, `Changed ${what}`);
        return toBrand(brandRow(id), true);
      }),

    order: (ids: string[], by: string) =>
      tx(() => {
        ids.forEach((id, i) => {
          writeBrandData(id, (d) => ({ ...d, navOrder: i + 1 }));
        });
        log("system", "order", null, by, "Reordered brands");
        return store.list();
      }),

    setArchived: (id: string, archived: boolean, by: string): Brand =>
      tx(() => {
        writeBrandData(id, (d) => ({ ...d, archived }));
        log("brand", id, id, by, archived ? "Archived the brand" : "Restored the brand");
        return toBrand(brandRow(id), true);
      }),

    saveGuidance: (id: string, patch: GuidancePatch, note: string, by: string) =>
      tx(() => {
        brandRow(id);
        const last = guidanceOf("brand", id);
        const current = normalizeGuidance(last ? json(last.data) : {});
        const next: Guidance = {
          ...current,
          ...patch,
          plan: { ...current.plan, ...(patch.plan ?? {}) },
        } as Guidance;
        const n = Number(last?.n ?? 0) + 1;
        run(
          "INSERT INTO brand_guidance (subject_kind, subject_id, n, data, note, created_by, created_at) VALUES ('brand', ?, ?, ?, ?, ?, ?)",
          id,
          n,
          JSON.stringify(next),
          note,
          by,
          at(),
        );
        writeBrandData(id, (d) => ({ ...d, guidanceVersion: n }));
        log("brand", id, id, by, `Saved guidance v${n}${note ? `: ${note}` : ""}`, {
          guidanceVersion: n,
        });
        return { n, guidance: next };
      }),

    addIdentity: (brandId: string, data: IdentityData, status: Identity["status"], by: string) =>
      tx(() => {
        brandRow(brandId);
        const id = randomUUID();
        const stamp = at();
        run(
          "INSERT INTO brand_identity (id, brand_id, status, data, version, suggested_by, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)",
          id,
          brandId,
          status,
          JSON.stringify(data),
          by,
          stamp,
          stamp,
        );
        run(
          "INSERT INTO brand_identity_versions (identity_id, version, status, data, note, changed_by, changed_at) VALUES (?, 1, ?, ?, 'Added', ?, ?)",
          id,
          status,
          JSON.stringify(data),
          by,
          stamp,
        );
        log("identity", id, brandId, by, `Added identity statement: ${data.line}`);
        return toIdentity(one("SELECT * FROM brand_identity WHERE id = ?", id) as Row);
      }),

    changeIdentity: (
      id: string,
      change: { data?: IdentityData; status?: Identity["status"] },
      note: string,
      by: string,
    ) =>
      tx(() => {
        const r = one("SELECT * FROM brand_identity WHERE id = ?", id);
        if (!r) throw new Refusal("not-found", `No identity statement has the id ${id}.`);
        const data = change.data ?? (json(r.data) as IdentityData);
        const status = change.status ?? (str(r.status) as Identity["status"]);
        const version = Number(r.version) + 1;
        const stamp = at();
        run(
          "UPDATE brand_identity SET status = ?, data = ?, version = ?, updated_at = ? WHERE id = ?",
          status,
          JSON.stringify(data),
          version,
          stamp,
          id,
        );
        run(
          "INSERT INTO brand_identity_versions (identity_id, version, status, data, note, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          id,
          version,
          status,
          JSON.stringify(data),
          note,
          by,
          stamp,
        );
        log(
          "identity",
          id,
          str(r.brand_id),
          by,
          change.status && change.status !== str(r.status)
            ? `Marked identity statement ${status}: ${data.line}`
            : `Edited identity statement: ${data.line}`,
        );
        return toIdentity(one("SELECT * FROM brand_identity WHERE id = ?", id) as Row);
      }),

    addProof: (
      brandId: string,
      p: { kind: Proof["kind"]; provenance: Proof["provenance"]; data: ProofData },
      by: string,
    ) =>
      tx(() => {
        brandRow(brandId);
        const id = randomUUID();
        const stamp = at();
        run(
          "INSERT INTO brand_proof (id, brand_id, account_id, kind, provenance, status, data, version, created_by, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, 'active', ?, 1, ?, ?, ?)",
          id,
          brandId,
          p.kind,
          p.provenance,
          JSON.stringify(p.data),
          by,
          stamp,
          stamp,
        );
        run(
          "INSERT INTO brand_proof_versions (proof_id, version, kind, provenance, status, data, note, changed_by, changed_at) VALUES (?, 1, ?, ?, 'active', ?, 'Added', ?, ?)",
          id,
          p.kind,
          p.provenance,
          JSON.stringify(p.data),
          by,
          stamp,
        );
        log("proof", id, brandId, by, `Added proof: ${p.data.title}`);
        return toProof(one("SELECT * FROM brand_proof WHERE id = ?", id) as Row);
      }),

    changeProof: (
      id: string,
      change: {
        kind?: Proof["kind"];
        provenance?: Proof["provenance"];
        status?: Proof["status"];
        data?: ProofData;
      },
      note: string,
      by: string,
    ) =>
      tx(() => {
        const r = one("SELECT * FROM brand_proof WHERE id = ?", id);
        if (!r) throw new Refusal("not-found", `No proof has the id ${id}.`);
        const kind = change.kind ?? str(r.kind);
        const provenance = change.provenance ?? str(r.provenance);
        const status = change.status ?? str(r.status);
        const data = change.data ?? proofData(json(r.data));
        const version = Number(r.version) + 1;
        const stamp = at();
        run(
          "UPDATE brand_proof SET kind = ?, provenance = ?, status = ?, data = ?, version = ?, updated_at = ? WHERE id = ?",
          kind,
          provenance,
          status,
          JSON.stringify(data),
          version,
          stamp,
          id,
        );
        run(
          "INSERT INTO brand_proof_versions (proof_id, version, kind, provenance, status, data, note, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          id,
          version,
          kind,
          provenance,
          status,
          JSON.stringify(data),
          note,
          by,
          stamp,
        );
        log("proof", id, str(r.brand_id), by, `Edited proof: ${data.title}`);
        return toProof(one("SELECT * FROM brand_proof WHERE id = ?", id) as Row);
      }),

    saveChannel: (
      brandId: string,
      c: { id?: string; kind: ChannelKind; name: string; description: string; url: string },
      by: string,
    ) =>
      tx(() => {
        brandRow(brandId);
        const data = JSON.stringify({ description: c.description, url: c.url, archived: false });
        const id = c.id ?? randomUUID();
        if (c.id) {
          run(
            "UPDATE brand_channels SET kind = ?, name = ?, data = ?, version = version + 1 WHERE id = ? AND brand_id = ?",
            c.kind,
            c.name,
            data,
            id,
            brandId,
          );
        } else {
          run(
            "INSERT INTO brand_channels (id, brand_id, kind, name, data, version) VALUES (?, ?, ?, ?, ?, 1)",
            id,
            brandId,
            c.kind,
            c.name,
            data,
          );
        }
        log("channel", id, brandId, by, `${c.id ? "Edited" : "Added"} channel ${c.name}`);
        return toChannel(one("SELECT * FROM brand_channels WHERE id = ?", id) as Row);
      }),

    saveAccount: (
      brandId: string,
      a: {
        id?: string;
        channelId: string;
        name: string;
        handle: string;
        url: string;
        role: string;
        instructions: string;
        persona?: Persona;
      },
      by: string,
    ) =>
      tx(() => {
        brandRow(brandId);
        const id = a.id ?? randomUUID();
        const old = one("SELECT * FROM brand_accounts WHERE id = ?", id);
        const oldData = old ? json(old.data) : {};
        const last = guidanceOf("account", id);
        let personaVersion = Number(oldData.personaVersion ?? (last ? last.n : 0));
        if (a.persona) {
          personaVersion = Number(last?.n ?? 0) + 1;
          run(
            "INSERT INTO brand_guidance (subject_kind, subject_id, n, data, note, created_by, created_at) VALUES ('account', ?, ?, ?, '', ?, ?)",
            id,
            personaVersion,
            JSON.stringify(a.persona),
            by,
            at(),
          );
        }
        const data = JSON.stringify({
          ...oldData,
          handle: a.handle,
          url: a.url,
          role: a.role,
          instructions: a.instructions,
          archived: Boolean(oldData.archived),
          personaVersion: Math.max(1, personaVersion),
        });
        if (old) {
          run(
            "UPDATE brand_accounts SET channel_id = ?, name = ?, data = ?, version = version + 1 WHERE id = ?",
            a.channelId,
            a.name,
            data,
            id,
          );
        } else {
          run(
            "INSERT INTO brand_accounts (id, brand_id, channel_id, name, data, version) VALUES (?, ?, ?, ?, ?, 1)",
            id,
            brandId,
            a.channelId,
            a.name,
            data,
          );
        }
        log("account", id, brandId, by, `${old ? "Edited" : "Added"} account ${a.name}`);
        return id;
      }),

    addPeer: (
      accountId: string,
      p: { handle: string; name: string; url: string; sector: string; reason: string },
      by: string,
    ) =>
      tx(() => {
        const acc = one("SELECT brand_id FROM brand_accounts WHERE id = ?", accountId);
        if (!acc) throw new Refusal("not-found", `No account has the id ${accountId}.`);
        const id = randomUUID();
        run(
          "INSERT INTO brand_peers (id, account_id, handle, status, data, version, created_by, created_at) VALUES (?, ?, ?, 'active', ?, 1, ?, ?)",
          id,
          accountId,
          p.handle,
          JSON.stringify({ name: p.name, url: p.url, sector: p.sector, reason: p.reason }),
          by,
          at(),
        );
        log("account", accountId, str(acc.brand_id), by, `Added peer @${p.handle}`);
        return toPeer(one("SELECT * FROM brand_peers WHERE id = ?", id) as Row);
      }),

    removePeer: (id: string, by: string) =>
      tx(() => {
        const r = one(
          "SELECT p.*, a.brand_id FROM brand_peers p JOIN brand_accounts a ON a.id = p.account_id WHERE p.id = ?",
          id,
        );
        if (!r) throw new Refusal("not-found", `No peer has the id ${id}.`);
        run(
          "UPDATE brand_peers SET status = 'removed', removed_at = ?, version = version + 1 WHERE id = ?",
          at(),
          id,
        );
        log("account", str(r.account_id), str(r.brand_id), by, `Removed peer @${str(r.handle)}`);
        return toPeer(one("SELECT * FROM brand_peers WHERE id = ?", id) as Row);
      }),

    saveSeason: (brandId: string, n: number, patch: SeasonPatch, by: string) =>
      tx(() => {
        brandRow(brandId);
        const r = one("SELECT * FROM brand_seasons WHERE brand_id = ? AND n = ?", brandId, n);
        const stamp = at();
        const base = r
          ? json(r.data)
          : {
              start: DEFAULT_SEASON.start,
              end: DEFAULT_SEASON.end,
              goal: "",
              path: "",
              target: null,
              proofNeeded: DEFAULT_PROOF_NEEDED,
            };
        const data = JSON.stringify({ ...base, ...patch });
        if (r) {
          run(
            "UPDATE brand_seasons SET data = ?, version = version + 1, updated_by = ?, updated_at = ? WHERE brand_id = ? AND n = ?",
            data,
            by,
            stamp,
            brandId,
            n,
          );
        } else {
          run(
            "INSERT INTO brand_seasons (brand_id, n, data, version, updated_by, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)",
            brandId,
            n,
            data,
            by,
            stamp,
            stamp,
          );
        }
        log("season", `${brandId}:${n}`, brandId, by, `Saved season ${n}`);
        return seasonsOf(brandId);
      }),

    saveIdea: (brandId: string, n: number, idea: string, by: string) =>
      tx(() => {
        brandRow(brandId);
        const stamp = at();
        run(
          "INSERT INTO brand_season_ideas (brand_id, n, idea, version, updated_by, updated_at) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(brand_id, n) DO UPDATE SET idea = excluded.idea, version = version + 1, updated_by = excluded.updated_by, updated_at = excluded.updated_at",
          brandId,
          n,
          idea,
          by,
          stamp,
        );
        log("season", `${brandId}:${n}`, brandId, by, `Saved the idea for season ${n}`);
        return ideasOf(brandId);
      }),
  };
  return store;
}
