import { defineAction, defineCard, defineDomain, type RunContext } from "@jaetask/open-agent-kit";
import { z } from "zod";
import {
  Brand,
  BrandDetail,
  BrandPlan,
  Channel,
  ChannelKind,
  Guidance,
  Identity,
  IdentityData,
  IdentityStatus,
  Peer,
  Persona,
  Proof,
  ProofData,
  ProofKind,
  ProofStatus,
  Provenance,
  Season,
  SeasonIdea,
  Voice,
} from "./model.js";
import type { Store } from "./store.js";

export type BrandDeps = { brands: Store };
type Ctx = RunContext<BrandDeps>;

export const brandsChanged = defineCard({
  name: "brands-changed",
  version: 1,
  about: "What a Call changed in the brands.",
  view: { kind: "change", title: "Brands changed" },
});

const id = z.string().min(1);
const text = z.string().max(20_000);
const line = z.string().trim().min(1).max(500);

const read = <I extends z.ZodType, O extends z.ZodType>(a: {
  name: string;
  description: string;
  input: I;
  output: O;
  run: (input: z.output<I>, ctx: Ctx) => z.output<O>;
}) => defineAction<I, O, BrandDeps>({ effect: "read", ...a });

const write = <I extends z.ZodType, O extends z.ZodType>(a: {
  name: string;
  description: string;
  input: I;
  output: O;
  subject: string;
  run: (input: z.output<I>, ctx: Ctx) => z.output<O>;
}) => {
  const { subject, run, ...rest } = a;
  return defineAction<I, O, BrandDeps>({
    effect: "write",
    card: brandsChanged,
    ...rest,
    run: (input, ctx) => {
      const out = run(input, ctx);
      ctx.change({ kind: "updated", subject, id: subject });
      return out;
    },
  });
};

const brandList = read({
  name: "brand-list",
  description: "List the brands, in sidebar order. With archived, list the archived ones instead.",
  input: z.object({ archived: z.boolean().default(false) }),
  output: z.array(Brand),
  run: ({ archived }, { brands }) => brands.list(archived),
});

const brandRead = read({
  name: "brand-read",
  description:
    "Read one brand in full: profile, guidance (voice, look, principles and the five-step plan), identity lines, proof, channels and accounts with peers, seasons and history.",
  input: z.object({ brand: id }),
  output: BrandDetail,
  run: ({ brand }, { brands }) => brands.detail(brand),
});

const actorList = read({
  name: "actor-list",
  description: "List who has changed brands, with their names.",
  input: z.object({}),
  output: z.array(z.object({ id: z.string(), name: z.string(), kind: z.string() })),
  run: (_input, { brands }) => brands.actors(),
});

const brandCreate = write({
  name: "brand-create",
  description: "Create a brand. It starts with the usual principles and an empty plan.",
  subject: "brand",
  input: z.object({ name: z.string().trim().min(1).max(80) }),
  output: Brand,
  run: ({ name }, { brands, principal }) => brands.create(name, principal.id),
});

const brandEdit = write({
  name: "brand-edit",
  description:
    "Change a brand's name, sidebar icon and colour, picture, images, purpose, intended audiences or goals.",
  subject: "brand",
  input: z.object({
    brand: id,
    name: z.string().trim().min(1).max(80).optional(),
    icon: z.string().max(40).optional(),
    colour: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    image: z.string().max(2_000_000).optional(),
    images: z.array(z.string().max(4_000_000)).max(24).optional(),
    purpose: text.optional(),
    audiences: z.array(z.string().max(500)).optional(),
    goals: z.array(z.string().max(500)).optional(),
  }),
  output: Brand,
  run: ({ brand, ...patch }, { brands, principal }) =>
    brands.edit(
      brand,
      Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      principal.id,
    ),
});

const brandOrderSet = write({
  name: "brand-order-set",
  description: "Put the brands in this order in the sidebar.",
  subject: "brand",
  input: z.object({ brands: z.array(id).min(1) }),
  output: z.array(Brand),
  run: ({ brands: ids }, { brands, principal }) => brands.order(ids, principal.id),
});

const brandArchive = write({
  name: "brand-archive",
  description:
    "Archive a brand. It leaves the sidebar and keeps everything; restore brings it back.",
  subject: "brand",
  input: z.object({ brand: id }),
  output: Brand,
  run: ({ brand }, { brands, principal }) => brands.setArchived(brand, true, principal.id),
});

const brandRestore = write({
  name: "brand-restore",
  description: "Restore an archived brand to the sidebar.",
  subject: "brand",
  input: z.object({ brand: id }),
  output: Brand,
  run: ({ brand }, { brands, principal }) => brands.setArchived(brand, false, principal.id),
});

const guidanceSave = write({
  name: "guidance-save",
  description:
    "Save a new version of a brand's guidance. Give only the parts that change: principles, conduct, audiencePromise, verbalStyle, voice, visual (colours, typography, logos) or plan (any of proof, person, association, product, belt, each given whole). Earlier versions are kept.",
  subject: "guidance",
  input: z.object({
    brand: id,
    note: z.string().max(500).default(""),
    principles: z.array(z.string().max(1000)).optional(),
    conduct: text.optional(),
    audiencePromise: text.optional(),
    verbalStyle: text.optional(),
    voice: Voice.optional(),
    visual: Guidance.shape.visual.optional(),
    plan: BrandPlan.partial().optional(),
  }),
  output: z.object({ n: z.number(), guidance: Guidance }),
  run: ({ brand, note, ...patch }, { brands, principal }) =>
    brands.saveGuidance(
      brand,
      Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      note,
      principal.id,
    ),
});

const identityAdd = write({
  name: "identity-add",
  description:
    "Add an identity line to a brand: a short, quotable line that defines its character, with its credit, the thought behind it and the themes it supports. An agent's line starts as suggested.",
  subject: "identity",
  input: z.object({
    brand: id,
    line,
    credit: z.string().max(200).default("own"),
    creditUrl: z.string().max(1000).default(""),
    thought: text.default(""),
    themes: z.array(z.string().max(1000)).default([]),
    status: IdentityStatus.optional(),
  }),
  output: Identity,
  run: ({ brand, status, ...data }, { brands, principal }) =>
    brands.addIdentity(
      brand,
      data,
      status ?? (principal.id === "owner" ? "accepted" : "suggested"),
      principal.id,
    ),
});

const identityEdit = write({
  name: "identity-edit",
  description: "Change an identity line's words, credit, thought or themes. Every version is kept.",
  subject: "identity",
  input: IdentityData.extend({ identity: id, line, note: z.string().max(500).default("") }),
  output: Identity,
  run: ({ identity, note, ...data }, { brands, principal }) =>
    brands.changeIdentity(identity, { data }, note, principal.id),
});

const identityStatusSet = write({
  name: "identity-status-set",
  description: "Accept, reject or retire an identity line, or set it back to suggested.",
  subject: "identity",
  input: z.object({ identity: id, status: IdentityStatus, note: z.string().max(500).default("") }),
  output: Identity,
  run: ({ identity, status, note }, { brands, principal }) =>
    brands.changeIdentity(identity, { status }, note, principal.id),
});

const proofInput = ProofData.partial().extend({ title: line });
const fullProof = (d: z.output<typeof proofInput>): ProofData => ({
  title: d.title,
  body: d.body ?? "",
  source: d.source ?? "",
  sourceUrl: d.sourceUrl ?? "",
  proofUrl: d.proofUrl ?? "",
  speaker: d.speaker ?? "",
  subject: d.subject ?? "",
  occurredOn: d.occurredOn ?? "",
  topics: d.topics ?? [],
  uncertainty: d.uncertainty ?? "",
  ...(d.linkOk === undefined ? {} : { linkOk: d.linkOk }),
  ...(d.linkCheckedAt === undefined ? {} : { linkCheckedAt: d.linkCheckedAt }),
});

const proofAdd = write({
  name: "proof-add",
  description:
    "Add proof to a brand: a story, opinion, fact or reference, with where it came from. A proof link (proofUrl) a reader can open is what makes it count for step 1.",
  subject: "proof",
  input: proofInput.extend({
    brand: id,
    kind: ProofKind.default("fact"),
    provenance: Provenance.default("firsthand"),
  }),
  output: Proof,
  run: ({ brand, kind, provenance, ...data }, { brands, principal }) =>
    brands.addProof(brand, { kind, provenance, data: fullProof(data) }, principal.id),
});

const proofEdit = write({
  name: "proof-edit",
  description: "Change a proof entry. Every version is kept.",
  subject: "proof",
  input: proofInput.extend({
    proof: id,
    kind: ProofKind,
    provenance: Provenance,
    note: z.string().max(500).default(""),
  }),
  output: Proof,
  run: ({ proof, kind, provenance, note, ...data }, { brands, principal }) =>
    brands.changeProof(proof, { kind, provenance, data: fullProof(data) }, note, principal.id),
});

const proofStatusSet = write({
  name: "proof-status-set",
  description: "Archive or withdraw a proof entry, or make it active again.",
  subject: "proof",
  input: z.object({ proof: id, status: ProofStatus, note: z.string().max(500).default("") }),
  output: Proof,
  run: ({ proof, status, note }, { brands, principal }) =>
    brands.changeProof(proof, { status }, note, principal.id),
});

const channelSave = write({
  name: "channel-save",
  description: "Add a channel where a brand posts, or change one when its id is given.",
  subject: "channel",
  input: z.object({
    brand: id,
    channel: id.optional(),
    kind: ChannelKind,
    name: line,
    description: text.default(""),
    url: z.string().max(1000).default(""),
  }),
  output: Channel,
  run: ({ brand, channel, ...c }, { brands, principal }) =>
    brands.saveChannel(brand, { ...c, ...(channel ? { id: channel } : {}) }, principal.id),
});

const accountSave = write({
  name: "account-save",
  description:
    "Add an account on one of a brand's channels, or change one when its id is given. With persona, save a new persona version for it.",
  subject: "account",
  input: z.object({
    brand: id,
    account: id.optional(),
    channel: id,
    name: line,
    handle: z.string().max(200).default(""),
    url: z.string().max(1000).default(""),
    role: z.string().max(200).default(""),
    instructions: text.default(""),
    persona: Persona.optional(),
  }),
  output: z.object({ account: z.string() }),
  run: ({ brand, account, channel, persona, ...a }, { brands, principal }) => ({
    account: brands.saveAccount(
      brand,
      {
        ...a,
        channelId: channel,
        ...(account ? { id: account } : {}),
        ...(persona ? { persona } : {}),
      },
      principal.id,
    ),
  }),
});

const peerAdd = write({
  name: "peer-add",
  description: "Add a peer an account learns from: who they are and why they matter.",
  subject: "peer",
  input: z.object({
    account: id,
    handle: line,
    name: z.string().max(200).default(""),
    url: z.string().max(1000).default(""),
    sector: z.string().max(200).default(""),
    reason: text.default(""),
  }),
  output: Peer,
  run: ({ account, ...p }, { brands, principal }) => brands.addPeer(account, p, principal.id),
});

const peerRemove = write({
  name: "peer-remove",
  description: "Remove a peer. It is kept as removed.",
  subject: "peer",
  input: z.object({ peer: id }),
  output: Peer,
  run: ({ peer }, { brands, principal }) => brands.removePeer(peer, principal.id),
});

const seasonSave = write({
  name: "season-save",
  description:
    "Save one of a brand's 90-day seasons by number: its dates, goal, path A or B, target number, proof needed and notes. A new number adds a season.",
  subject: "season",
  input: z.object({
    brand: id,
    n: z.number().int().min(1).max(99),
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    goal: text.optional(),
    path: z.enum(["", "A", "B"]).optional(),
    target: z.number().int().min(0).nullable().optional(),
    proofNeeded: z.number().int().min(1).max(50).optional(),
    notes: text.optional(),
  }),
  output: z.array(Season),
  run: ({ brand, n, ...patch }, { brands, principal }) =>
    brands.saveSeason(
      brand,
      n,
      Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      principal.id,
    ),
});

const seasonIdeaSave = write({
  name: "season-idea-save",
  description: "Keep an idea for a season by number, for this season or one not planned yet.",
  subject: "season",
  input: z.object({ brand: id, n: z.number().int().min(1).max(99), idea: text }),
  output: z.array(SeasonIdea),
  run: ({ brand, n, idea }, { brands, principal }) => brands.saveIdea(brand, n, idea, principal.id),
});

export const brandDomain = defineDomain({
  name: "brand",
  version: "0.1.0",
  about:
    "Brands: who each one is, what it believes, how it sounds and looks, and hoeem's five-step plan it runs by (proof, person, association, product, belt), with seasons.",
  actions: [
    brandList,
    brandRead,
    actorList,
    brandCreate,
    brandEdit,
    brandOrderSet,
    brandArchive,
    brandRestore,
    guidanceSave,
    identityAdd,
    identityEdit,
    identityStatusSet,
    proofAdd,
    proofEdit,
    proofStatusSet,
    channelSave,
    accountSave,
    peerAdd,
    peerRemove,
    seasonSave,
    seasonIdeaSave,
  ],
  cards: [brandsChanged],
});
