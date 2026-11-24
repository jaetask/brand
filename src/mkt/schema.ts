export const BRAND_SCHEMA = `
CREATE TABLE IF NOT EXISTS mkt_actors (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('human','harness')),
 archived BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO mkt_actors(id,name,kind)
SELECT v.id, v.name, v.kind FROM (VALUES ('owner','You','human'),('codex','Codex','harness'),('claude','Claude Code','harness'),('cursor','Cursor','harness')) AS v(id,name,kind)
WHERE NOT EXISTS (SELECT 1 FROM mkt_actors)
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS mkt_requests (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS mkt_write_lock (id INTEGER PRIMARY KEY);
INSERT INTO mkt_write_lock VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS mkt_activity (
 id BIGSERIAL PRIMARY KEY, subject_kind TEXT NOT NULL, subject_id TEXT NOT NULL,
 entity_id TEXT, actor_id TEXT NOT NULL REFERENCES mkt_actors(id), text TEXT NOT NULL,
 data JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mkt_activity_subject ON mkt_activity(subject_kind,subject_id,id);
CREATE INDEX IF NOT EXISTS mkt_activity_entity ON mkt_activity(entity_id,id);

CREATE TABLE IF NOT EXISTS mkt_entities (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, data JSONB NOT NULL,
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS mkt_entity_names ON mkt_entities(lower(name));
CREATE TABLE IF NOT EXISTS mkt_channels (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES mkt_entities(id),
 kind TEXT NOT NULL CHECK(kind IN ('x','blog','newsletter','website','other')),
 name TEXT NOT NULL, data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS mkt_channel_names ON mkt_channels(entity_id,lower(name));
CREATE TABLE IF NOT EXISTS mkt_accounts (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES mkt_entities(id),
 channel_id TEXT NOT NULL REFERENCES mkt_channels(id), name TEXT NOT NULL,
 data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS mkt_account_names ON mkt_accounts(entity_id,lower(name));
CREATE INDEX IF NOT EXISTS mkt_account_entity ON mkt_accounts(entity_id);
CREATE TABLE IF NOT EXISTS mkt_guidance (
 subject_kind TEXT NOT NULL CHECK(subject_kind IN ('entity','account')), subject_id TEXT NOT NULL,
 n INTEGER NOT NULL CHECK(n > 0), data JSONB NOT NULL, note TEXT NOT NULL DEFAULT '',
 created_by TEXT NOT NULL REFERENCES mkt_actors(id), created_at TEXT NOT NULL,
 PRIMARY KEY(subject_kind,subject_id,n)
);

CREATE TABLE IF NOT EXISTS mkt_knowledge (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES mkt_entities(id),
 account_id TEXT REFERENCES mkt_accounts(id),
 kind TEXT NOT NULL CHECK(kind IN ('story','opinion','fact','reference')),
 provenance TEXT NOT NULL CHECK(provenance IN ('firsthand','third_party','unverified')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived','withdrawn')),
 data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 created_by TEXT NOT NULL REFERENCES mkt_actors(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mkt_knowledge_entity ON mkt_knowledge(entity_id,status);
CREATE TABLE IF NOT EXISTS mkt_knowledge_versions (
 knowledge_id TEXT NOT NULL REFERENCES mkt_knowledge(id), version INTEGER NOT NULL,
 kind TEXT NOT NULL, provenance TEXT NOT NULL, status TEXT NOT NULL, data JSONB NOT NULL,
 note TEXT NOT NULL DEFAULT '', changed_by TEXT NOT NULL REFERENCES mkt_actors(id), changed_at TEXT NOT NULL,
 PRIMARY KEY(knowledge_id,version)
);
CREATE TABLE IF NOT EXISTS mkt_imports (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES mkt_entities(id),
 transcript TEXT NOT NULL, data JSONB NOT NULL,
 created_by TEXT NOT NULL REFERENCES mkt_actors(id), created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mkt_import_entity ON mkt_imports(entity_id,created_at);
CREATE TABLE IF NOT EXISTS mkt_import_proposals (
 id TEXT PRIMARY KEY, import_id TEXT NOT NULL REFERENCES mkt_imports(id), position INTEGER NOT NULL,
 state TEXT NOT NULL DEFAULT 'proposed' CHECK(state IN ('proposed','accepted','rejected','duplicate')),
 fingerprint TEXT NOT NULL, data JSONB NOT NULL, knowledge_id TEXT REFERENCES mkt_knowledge(id),
 decided_by TEXT REFERENCES mkt_actors(id), decided_at TEXT, version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS mkt_proposal_import ON mkt_import_proposals(import_id,position);
CREATE TABLE IF NOT EXISTS mkt_gaps (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES mkt_entities(id),
 account_id TEXT REFERENCES mkt_accounts(id), question TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','answered','dismissed')),
 data JSONB NOT NULL, knowledge_id TEXT REFERENCES mkt_knowledge(id),
 created_by TEXT NOT NULL REFERENCES mkt_actors(id), created_at TEXT NOT NULL, resolved_at TEXT,
 version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS mkt_gap_open ON mkt_gaps(entity_id,lower(question)) WHERE status='open';

CREATE TABLE IF NOT EXISTS mkt_peers (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES mkt_accounts(id), handle TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','removed')),
 data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 created_by TEXT NOT NULL REFERENCES mkt_actors(id), created_at TEXT NOT NULL, removed_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS mkt_peer_active ON mkt_peers(account_id,lower(handle)) WHERE status='active';
CREATE TABLE IF NOT EXISTS mkt_lessons (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES mkt_entities(id), account_id TEXT REFERENCES mkt_accounts(id),
 status TEXT NOT NULL CHECK(status IN ('proposed','approved','withdrawn','rejected')), data JSONB NOT NULL,
 version INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL REFERENCES mkt_actors(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mkt_limits (
 scope TEXT PRIMARY KEY, data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 updated_by TEXT NOT NULL REFERENCES mkt_actors(id), updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mkt_identity (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES mkt_entities(id),
 status TEXT NOT NULL CHECK(status IN ('suggested','accepted','rejected','retired')),
 data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 suggested_by TEXT NOT NULL REFERENCES mkt_actors(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mkt_identity_entity ON mkt_identity(entity_id, status, updated_at);
CREATE TABLE IF NOT EXISTS mkt_identity_versions (
 identity_id TEXT NOT NULL REFERENCES mkt_identity(id), version INTEGER NOT NULL, status TEXT NOT NULL, data JSONB NOT NULL,
 note TEXT NOT NULL DEFAULT '', changed_by TEXT NOT NULL REFERENCES mkt_actors(id), changed_at TEXT NOT NULL,
 PRIMARY KEY(identity_id, version)
);

INSERT INTO mkt_actors(id,name,kind) VALUES ('seasons','Seasons','harness') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS mkt_seasons (
 entity_id TEXT NOT NULL REFERENCES mkt_entities(id), n INTEGER NOT NULL, data JSONB NOT NULL,
 version INTEGER NOT NULL DEFAULT 1, updated_by TEXT NOT NULL REFERENCES mkt_actors(id),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(entity_id, n)
);

CREATE TABLE IF NOT EXISTS mkt_season_ideas (
 entity_id TEXT NOT NULL REFERENCES mkt_entities(id), n INTEGER NOT NULL, idea TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1, updated_by TEXT NOT NULL REFERENCES mkt_actors(id), updated_at TEXT NOT NULL,
 PRIMARY KEY(entity_id, n)
);
`;

export const BRAND_TABLES = [
  "mkt_accounts",
  "mkt_activity",
  "mkt_actors",
  "mkt_channels",
  "mkt_entities",
  "mkt_gaps",
  "mkt_guidance",
  "mkt_identity",
  "mkt_identity_versions",
  "mkt_import_proposals",
  "mkt_imports",
  "mkt_knowledge",
  "mkt_knowledge_versions",
  "mkt_lessons",
  "mkt_limits",
  "mkt_peers",
  "mkt_requests",
  "mkt_season_ideas",
  "mkt_seasons",
  "mkt_write_lock",
];
