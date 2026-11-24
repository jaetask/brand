import { EditFrame, ProjectIconPicker, Row, useBackTo } from "@jaetask/toolkit/suite";
import { Input } from "@jaetask/toolkit/ui/input";
import { type ReactNode, useState } from "react";
import {
  type Account,
  type BeltApp,
  type Channel,
  type Detail,
  type FreeProduct,
  type Guidance,
  type Identity,
  PERSON_TEST_TITLES,
  PERSON_TESTS,
  type Persona,
  type Plan,
  type Proof,
  succeeded,
} from "./api.js";
import { addDays } from "./season.js";
import { act, brandIcon, Choose, Field, Lines, lines, Pick, Rows, Tick, useDraft } from "./look.js";

type Props = { detail: Detail; part: string; arg: string | undefined };

function Frame({
  title,
  line,
  back,
  save,
  children,
  saveLabel,
}: {
  title: string;
  line?: string;
  back: string;
  save: () => Promise<boolean>;
  children: ReactNode;
  saveLabel?: string;
}) {
  const backTo = useBackTo(back);
  const [busy, setBusy] = useState(false);
  return (
    <EditFrame
      title={title}
      line={line}
      backTo={backTo}
      busy={busy}
      {...(saveLabel ? { saveLabel } : {})}
      onSave={async () => {
        setBusy(true);
        const ok = await save();
        setBusy(false);
        if (ok) window.location.hash = backTo;
      }}
    >
      {children}
    </EditFrame>
  );
}

const ok = async (action: string, input: unknown, done = "Saved") =>
  succeeded(await act(action, input, done));

function saveGuidance(
  d: Detail,
  patch: Partial<Omit<Guidance, "plan">> & { plan?: Partial<Plan> },
  note: string,
) {
  return ok("guidance-save", { brand: d.brand.id, note, ...patch });
}

export function EditPage({ detail, part, arg }: Props) {
  const [name = "", query = ""] = part.split("?");
  const [argument] = (arg ?? "").split("?");
  const params = new URLSearchParams(query);
  const d = detail;
  const base = `/b/${d.brand.id}`;
  switch (name) {
    case "profile":
      return <ProfileEdit d={d} back={`${base}/profile`} />;
    case "voice":
      return <VoiceEdit d={d} back={`${base}/voice`} />;
    case "promise":
      return <PromiseEdit d={d} back={`${base}/voice`} />;
    case "principles":
      return <PrinciplesEdit d={d} back={`${base}/voice`} />;
    case "look":
      return <LookEdit d={d} back={`${base}/voice`} />;
    case "path":
      return <PathEdit d={d} back={`${base}/plan/proof`} />;
    case "person":
      return <PersonEdit d={d} back={`${base}/plan/person`} />;
    case "tests":
      return <TestsEdit d={d} back={`${base}/plan/person`} />;
    case "amplify":
      return <AmplifyEdit d={d} back={`${base}/plan/association`} />;
    case "antibrand":
      return <AntiBrandEdit d={d} back={`${base}/plan/association`} />;
    case "constants":
      return <ConstantsEdit d={d} back={`${base}/plan/association`} />;
    case "product":
      return <ProductEdit d={d} back={`${base}/plan/product`} />;
    case "belt":
      return <BeltEdit d={d} back={`${base}/plan/belt`} />;
    case "apps":
      return <AppsEdit d={d} back={`${base}/plan/belt`} />;
    case "season":
      return <SeasonEdit d={d} n={Number(argument) || 1} back={`${base}/seasons`} />;
    case "idea":
      return <IdeaEdit d={d} n={Number(argument) || 1} back={`${base}/seasons`} />;
    case "identity":
      return <IdentityEdit d={d} id={argument} back={`${base}/beliefs`} />;
    case "proof":
      return <ProofEdit d={d} id={argument} back={`${base}/plan/proof`} />;
    case "channel":
      return <ChannelEdit d={d} id={argument} back={`${base}/profile`} />;
    case "account":
      return (
        <AccountEdit
          d={d}
          id={argument}
          channel={params.get("channel") ?? ""}
          back={`${base}/profile`}
        />
      );
    case "peer":
      return <PeerEdit d={d} account={argument ?? ""} back={`${base}/profile`} />;
    default:
      return <ProfileEdit d={d} back={`${base}/profile`} />;
  }
}

async function readImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function ProfileEdit({ d, back }: { d: Detail; back: string }) {
  const b = d.brand;
  const [f, set] = useDraft({
    name: b.name,
    purpose: b.purpose,
    goals: b.goals,
    audiences: b.audiences,
    icon: brandIcon(b.icon),
    colour: b.colour,
    image: b.image ?? "",
  });
  return (
    <Frame
      title="Edit profile"
      line="Who the brand is and who it's for."
      back={back}
      save={() =>
        ok("brand-edit", {
          brand: b.id,
          name: f.name.trim(),
          purpose: f.purpose,
          goals: lines(f.goals),
          audiences: lines(f.audiences),
          icon: f.icon,
          colour: f.colour,
          image: f.image,
        })
      }
    >
      <Row title="Name" htmlFor="name">
        <Field id="name" value={f.name} onChange={(v) => set({ name: v })} />
      </Row>
      <Row title="Sidebar icon and colour" line="Shown when there is no picture.">
        <ProjectIconPicker
          icon={f.icon}
          colour={f.colour}
          onIcon={(v) => set({ icon: v })}
          onColour={(v) => set({ colour: v })}
          title="Icon"
        />
      </Row>
      <Row
        title="Picture"
        line="The same picture as the brand's public profiles."
        htmlFor="picture"
      >
        <div className="flex items-center gap-3">
          {f.image && <img src={f.image} alt="" className="h-12 w-12 rounded-full object-cover" />}
          <Input
            id="picture"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) set({ image: await readImage(file) });
            }}
          />
        </div>
      </Row>
      <Row title="Purpose" line="What the brand is for, in a sentence or two." htmlFor="purpose">
        <Field id="purpose" long value={f.purpose} onChange={(v) => set({ purpose: v })} />
      </Row>
      <Row title="Goals" htmlFor="goals">
        <Lines
          id="goals"
          value={f.goals}
          onChange={(v) => set({ goals: v })}
          placeholder="Goal"
          add="Add goal"
        />
      </Row>
      <Row title="Intended audiences" htmlFor="audiences">
        <Lines
          id="audiences"
          value={f.audiences}
          onChange={(v) => set({ audiences: v })}
          placeholder="Audience"
          add="Add audience"
        />
      </Row>
    </Frame>
  );
}

function VoiceEdit({ d, back }: { d: Detail; back: string }) {
  const g = d.guidance;
  const v = g.voice ?? { keyPhrases: [], borrowedPhrases: [], toneRules: "", example: "" };
  const [f, set] = useDraft({ ...v, verbalStyle: g.verbalStyle });
  return (
    <Frame
      title="Edit how you sound"
      back={back}
      save={() =>
        saveGuidance(
          d,
          {
            verbalStyle: f.verbalStyle,
            voice: {
              keyPhrases: lines(f.keyPhrases),
              borrowedPhrases: f.borrowedPhrases.filter((b) => b.phrase.trim()),
              toneRules: f.toneRules,
              example: f.example,
            },
          },
          "Voice",
        )
      }
    >
      <Row title="Key phrases" line="Phrases you use and want to be known for." htmlFor="key">
        <Lines
          id="key"
          value={f.keyPhrases}
          onChange={(x) => set({ keyPhrases: x })}
          placeholder="Phrase"
          add="Add phrase"
        />
      </Row>
      <Row
        title="Borrowed phrases"
        line="Someone else's words. Always credit them."
        htmlFor="borrowed"
      >
        <Rows
          id="borrowed"
          value={f.borrowedPhrases}
          onChange={(x) => set({ borrowedPhrases: x })}
          blank={() => ({ phrase: "", from: "" })}
          add="Add borrowed phrase"
          render={(row, setRow, i) => (
            <>
              <Field
                id={`phrase-${i}`}
                value={row.phrase}
                placeholder="Phrase"
                onChange={(x) => setRow({ phrase: x })}
              />
              <Field
                id={`from-${i}`}
                value={row.from}
                placeholder="From"
                onChange={(x) => setRow({ from: x })}
              />
            </>
          )}
        />
      </Row>
      <Row title="Tone" htmlFor="tone">
        <Field id="tone" long value={f.toneRules} onChange={(x) => set({ toneRules: x })} />
      </Row>
      <Row title="Example in your words" htmlFor="example">
        <Field id="example" long value={f.example} onChange={(x) => set({ example: x })} />
      </Row>
      <Row title="Verbal style" line="The original description of your style." htmlFor="verbal">
        <Field id="verbal" long value={f.verbalStyle} onChange={(x) => set({ verbalStyle: x })} />
      </Row>
    </Frame>
  );
}

function PromiseEdit({ d, back }: { d: Detail; back: string }) {
  const [text, setText] = useState(d.guidance.audiencePromise);
  return (
    <Frame
      title="Edit audience promise"
      back={back}
      save={() => saveGuidance(d, { audiencePromise: text }, "Audience promise")}
    >
      <Row
        title="Audience promise"
        line="What your audience can count on from you."
        htmlFor="promise"
      >
        <Field id="promise" long value={text} onChange={setText} />
      </Row>
    </Frame>
  );
}

function PrinciplesEdit({ d, back }: { d: Detail; back: string }) {
  const [f, set] = useDraft({ principles: d.guidance.principles, conduct: d.guidance.conduct });
  return (
    <Frame
      title="Edit principles and conduct"
      back={back}
      save={() =>
        saveGuidance(d, { principles: lines(f.principles), conduct: f.conduct }, "Principles")
      }
    >
      <Row title="Principles" htmlFor="principles">
        <Lines
          id="principles"
          value={f.principles}
          onChange={(x) => set({ principles: x })}
          placeholder="Principle"
          add="Add principle"
        />
      </Row>
      <Row title="Conduct" htmlFor="conduct">
        <Field id="conduct" long value={f.conduct} onChange={(x) => set({ conduct: x })} />
      </Row>
    </Frame>
  );
}

function LookEdit({ d, back }: { d: Detail; back: string }) {
  const [f, set] = useDraft(d.guidance.visual);
  return (
    <Frame
      title="Edit how you look"
      back={back}
      save={() =>
        saveGuidance(
          d,
          {
            visual: { colours: lines(f.colours), typography: f.typography, logos: lines(f.logos) },
          },
          "Look",
        )
      }
    >
      <Row title="Colours" line="A hex value or a colour name." htmlFor="colours">
        <Lines
          id="colours"
          value={f.colours}
          onChange={(x) => set({ colours: x })}
          placeholder="Colour"
          add="Add colour"
        />
      </Row>
      <Row title="Typography" htmlFor="type">
        <Field id="type" long value={f.typography} onChange={(x) => set({ typography: x })} />
      </Row>
      <Row title="Logos" line="Where each logo lives, such as a link." htmlFor="logos">
        <Lines
          id="logos"
          value={f.logos}
          onChange={(x) => set({ logos: x })}
          placeholder="Logo"
          add="Add logo"
        />
      </Row>
    </Frame>
  );
}

function PathEdit({ d, back }: { d: Detail; back: string }) {
  const [path, setPath] = useState(d.guidance.plan.proof.path);
  return (
    <Frame
      title="Choose your path"
      line="Chosen once per season."
      back={back}
      save={() => saveGuidance(d, { plan: { proof: { path } } }, "Proof path")}
    >
      <Row title="Path">
        <Pick
          label="Path"
          value={path}
          onChange={setPath}
          options={[
            { id: "A", name: "A · Outcome flex: results you already have" },
            { id: "B", name: "B · Volume sprint: earn results in 30 days" },
          ]}
        />
      </Row>
    </Frame>
  );
}

function PersonEdit({ d, back }: { d: Detail; back: string }) {
  const p = d.guidance.plan.person;
  const [f, set] = useDraft({ who: p.who, pain: p.pain, pays: p.pays });
  return (
    <Frame
      title="Edit your person"
      back={back}
      save={() => saveGuidance(d, { plan: { person: { ...p, ...f } } }, "Your person")}
    >
      <Row title="Who" line="One sentence about who it's for." htmlFor="who">
        <Field id="who" long value={f.who} onChange={(x) => set({ who: x })} />
      </Row>
      <Row title="Their pain" htmlFor="pain">
        <Field id="pain" long value={f.pain} onChange={(x) => set({ pain: x })} />
      </Row>
      <Row title="What they already pay for" htmlFor="pays">
        <Field id="pays" long value={f.pays} onChange={(x) => set({ pays: x })} />
      </Row>
    </Frame>
  );
}

function TestsEdit({ d, back }: { d: Detail; back: string }) {
  const p = d.guidance.plan.person;
  const [tests, setTests] = useState(p.tests);
  return (
    <Frame
      title="Score the four tests"
      line="1 to 10, with a note on why."
      back={back}
      save={() => saveGuidance(d, { plan: { person: { ...p, tests } } }, "Person tests")}
    >
      {PERSON_TESTS.map((t) => (
        <Row key={t} title={PERSON_TEST_TITLES[t]} htmlFor={`score-${t}`}>
          <div className="grid gap-2">
            <Input
              id={`score-${t}`}
              type="number"
              min={1}
              max={10}
              value={tests[t]?.score ?? ""}
              onChange={(e) =>
                setTests({
                  ...tests,
                  [t]: {
                    ...tests[t],
                    score: e.target.value === "" ? null : Number(e.target.value),
                  },
                })
              }
            />
            <Field
              id={`note-${t}`}
              value={tests[t]?.note ?? ""}
              placeholder="Why"
              onChange={(x) => setTests({ ...tests, [t]: { ...tests[t], note: x } })}
            />
          </div>
        </Row>
      ))}
    </Frame>
  );
}

function AmplifyEdit({ d, back }: { d: Detail; back: string }) {
  const a = d.guidance.plan.association;
  const [rows, setRows] = useState(
    a.amplify.map((x) => ({ title: x.title ?? "", item: x.item, postIdea: x.postIdea })),
  );
  return (
    <Frame
      title="Edit your themes"
      line="Align & Amplify: what your person loves, each with a post idea."
      back={back}
      save={() =>
        saveGuidance(
          d,
          {
            plan: {
              association: { ...a, amplify: rows.filter((r) => r.title.trim() || r.item.trim()) },
            },
          },
          "Themes",
        )
      }
    >
      <Row title="Themes" htmlFor="themes">
        <Rows
          id="themes"
          value={rows}
          onChange={setRows}
          blank={() => ({ title: "", item: "", postIdea: "" })}
          add="Add theme"
          render={(r, setRow, i) => (
            <>
              <Field
                id={`title-${i}`}
                value={r.title}
                placeholder="Short title"
                onChange={(x) => setRow({ title: x })}
              />
              <Field
                id={`item-${i}`}
                value={r.item}
                placeholder="What it is"
                onChange={(x) => setRow({ item: x })}
              />
              <Field
                id={`idea-${i}`}
                long
                value={r.postIdea}
                placeholder="Post idea"
                onChange={(x) => setRow({ postIdea: x })}
              />
            </>
          )}
        />
      </Row>
    </Frame>
  );
}

function AntiBrandEdit({ d, back }: { d: Detail; back: string }) {
  const a = d.guidance.plan.association;
  const [rows, setRows] = useState(a.antiBrand.map((x) => ({ ...x })));
  return (
    <Frame
      title="Edit what you stand against"
      line="Anti-Brand: each with the standard you hold instead."
      back={back}
      save={() =>
        saveGuidance(
          d,
          { plan: { association: { ...a, antiBrand: rows.filter((r) => r.item.trim()) } } },
          "Anti-Brand",
        )
      }
    >
      <Row title="Against" htmlFor="against">
        <Rows
          id="against"
          value={rows}
          onChange={setRows}
          blank={() => ({ item: "", standard: "" })}
          add="Add item"
          render={(r, setRow, i) => (
            <>
              <Field
                id={`against-${i}`}
                value={r.item}
                placeholder="What you stand against"
                onChange={(x) => setRow({ item: x })}
              />
              <Field
                id={`standard-${i}`}
                long
                value={r.standard}
                placeholder="Our standard"
                onChange={(x) => setRow({ standard: x })}
              />
            </>
          )}
        />
      </Row>
    </Frame>
  );
}

function ConstantsEdit({ d, back }: { d: Detail; back: string }) {
  const a = d.guidance.plan.association;
  const [f, set] = useDraft({ visualConstants: a.visualConstants, keep: a.keep ?? [] });
  return (
    <Frame
      title="Edit visual constants"
      back={back}
      save={() =>
        saveGuidance(
          d,
          {
            plan: {
              association: { ...a, visualConstants: lines(f.visualConstants), keep: lines(f.keep) },
            },
          },
          "Visual constants",
        )
      }
    >
      <Row
        title="Visual constants"
        line="Two or three things people see every time."
        htmlFor="constants"
      >
        <Lines
          id="constants"
          value={f.visualConstants}
          onChange={(x) => set({ visualConstants: x })}
          placeholder="Constant"
          add="Add constant"
        />
      </Row>
      <Row title="Keep" htmlFor="keep">
        <Lines
          id="keep"
          value={f.keep}
          onChange={(x) => set({ keep: x })}
          placeholder="Keep"
          add="Add"
        />
      </Row>
    </Frame>
  );
}

const blankProduct = (): FreeProduct => ({
  name: "",
  hook: "",
  url: "",
  delivers: "unknown",
  fixes: "",
  gates: [],
  later: [],
});

function ProductEdit({ d, back }: { d: Detail; back: string }) {
  const [rows, setRows] = useState<FreeProduct[]>(
    d.guidance.plan.product.freeProducts.map((p) => ({ ...p })),
  );
  return (
    <Frame
      title="Edit your free product"
      back={back}
      save={() =>
        saveGuidance(
          d,
          {
            plan: {
              product: {
                freeProducts: rows
                  .filter((r) => r.name.trim())
                  .map((r) => ({
                    ...r,
                    later: lines(r.later ?? []),
                    gates: (r.gates ?? []).filter((g) => g.label.trim()),
                  })),
              },
            },
          },
          "Free product",
        )
      }
    >
      <Row title="Free products" htmlFor="products">
        <Rows
          id="products"
          value={rows}
          onChange={setRows}
          blank={blankProduct}
          add="Add free product"
          render={(r, setRow, i) => (
            <>
              <Field
                id={`pname-${i}`}
                value={r.name}
                placeholder="Name"
                onChange={(x) => setRow({ name: x })}
              />
              <Field
                id={`hook-${i}`}
                long
                value={r.hook}
                placeholder="Hook: what it does for them"
                onChange={(x) => setRow({ hook: x })}
              />
              <Field
                id={`url-${i}`}
                value={r.url}
                placeholder="Link"
                onChange={(x) => setRow({ url: x })}
              />
              <Field
                id={`fixes-${i}`}
                long
                value={r.fixes}
                placeholder="What it fixes"
                onChange={(x) => setRow({ fixes: x })}
              />
              <Pick
                label="Delivers on its hook"
                value={r.delivers}
                onChange={(x) => setRow({ delivers: x })}
                options={[
                  { id: "unknown", name: "Not checked" },
                  { id: "yes", name: "Delivers" },
                  { id: "no", name: "Doesn't yet" },
                ]}
              />
              <Rows
                id={`gates-${i}`}
                value={r.gates ?? []}
                onChange={(x) => setRow({ gates: x })}
                blank={() => ({ label: "", done: false })}
                add="Add release gate"
                render={(g, setGate, j) => (
                  <div className="flex items-center gap-3">
                    <Tick
                      id={`gate-${i}-${j}`}
                      label="Done"
                      checked={g.done}
                      onChange={(x) => setGate({ done: x })}
                    />
                    <Field
                      id={`gate-label-${i}-${j}`}
                      value={g.label}
                      placeholder="Release gate"
                      onChange={(x) => setGate({ label: x })}
                    />
                  </div>
                )}
              />
              <Lines
                id={`later-${i}`}
                value={r.later ?? []}
                onChange={(x) => setRow({ later: x })}
                placeholder="Later"
                add="Add idea for later"
              />
              <Tick
                id={`shelved-${i}`}
                label="On the shelf: kept, not worked on"
                checked={!!r.shelved}
                onChange={(x) => setRow({ shelved: x })}
              />
            </>
          )}
        />
      </Row>
    </Frame>
  );
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function BeltEdit({ d, back }: { d: Detail; back: string }) {
  const b = d.guidance.plan.belt;
  const [f, set] = useDraft({ ...b });
  return (
    <Frame
      title="Edit your belt"
      back={back}
      save={() => saveGuidance(d, { plan: { belt: f } }, "Belt")}
    >
      <Row title="Project" htmlFor="project">
        <Field id="project" value={f.project} onChange={(x) => set({ project: x })} />
      </Row>
      <Row title="Exact promise" htmlFor="bpromise">
        <Field id="bpromise" long value={f.promise} onChange={(x) => set({ promise: x })} />
      </Row>
      <Row title="Target number" line="Such as 8 apps." htmlFor="target">
        <Field id="target" value={f.target} onChange={(x) => set({ target: x })} />
      </Row>
      <Row title="Launch date" htmlFor="launch">
        <Input
          id="launch"
          type="date"
          value={f.launchDate}
          onChange={(e) => set({ launchDate: e.target.value })}
        />
      </Row>
      <Row title="Where the deadline shows" htmlFor="shown">
        <Field
          id="shown"
          long
          value={f.deadlineShown}
          onChange={(x) => set({ deadlineShown: x })}
        />
      </Row>
      <Row title="If it slips" htmlFor="delay">
        <Field id="delay" long value={f.delayPlan} onChange={(x) => set({ delayPlan: x })} />
      </Row>
      <Row title="Weekly check-in day" htmlFor="checkin">
        <Choose
          id="checkin"
          label="Weekly check-in day"
          value={
            WEEKDAYS.find((w) => w.toLowerCase() === f.checkInDay.trim().toLowerCase()) ??
            f.checkInDay
          }
          options={[{ id: "", name: "Not set" }, ...WEEKDAYS.map((w) => ({ id: w, name: w }))]}
          onChange={(x) => set({ checkInDay: x })}
        />
      </Row>
    </Frame>
  );
}

function AppsEdit({ d, back }: { d: Detail; back: string }) {
  const b = d.guidance.plan.belt;
  const [rows, setRows] = useState<BeltApp[]>((b.apps ?? []).map((a) => ({ ...a })));
  return (
    <Frame
      title="Edit what's public"
      line="Each square on the belt."
      back={back}
      save={() =>
        saveGuidance(
          d,
          { plan: { belt: { ...b, apps: rows.filter((r) => r.name.trim()) } } },
          "Belt apps",
        )
      }
    >
      <Row title="Apps" htmlFor="apps">
        <Rows
          id="apps"
          value={rows}
          onChange={setRows}
          blank={(): BeltApp => ({ name: "", status: "planned" })}
          add="Add app"
          render={(r, setRow, i) => (
            <>
              <Field
                id={`app-${i}`}
                value={r.name}
                placeholder="Name"
                onChange={(x) => setRow({ name: x })}
              />
              <Pick
                label="Status"
                value={r.status}
                onChange={(x) => setRow({ status: x })}
                options={[
                  { id: "public", name: "Public" },
                  { id: "private", name: "Private" },
                  { id: "planned", name: "Not built" },
                ]}
              />
              <Field
                id={`app-url-${i}`}
                value={r.url ?? ""}
                placeholder="Link"
                onChange={(x) => setRow({ url: x })}
              />
            </>
          )}
        />
      </Row>
    </Frame>
  );
}

function SeasonEdit({ d, n, back }: { d: Detail; n: number; back: string }) {
  const found = d.seasons.find((s) => s.n === n);
  const prev = d.seasons.find((s) => s.n === n - 1);
  const start = found?.start ?? (prev ? addDays(prev.end, 1) : "2026-11-18");
  const [f, set] = useDraft({
    start,
    end: found?.end ?? addDays(start, 89),
    goal: found?.goal ?? "",
    path: found?.path ?? "",
    target: found?.target == null ? "" : String(found.target),
    proofNeeded: String(found?.proofNeeded ?? 3),
    notes: found?.notes ?? "",
  });
  return (
    <Frame
      title={found ? `Season ${n}` : `New season ${n}`}
      line="hoeem's seasons are 90 days."
      back={back}
      save={() =>
        ok("season-save", {
          brand: d.brand.id,
          n,
          start: f.start,
          end: f.end,
          goal: f.goal,
          path: f.path,
          target: f.target === "" ? null : Number(f.target),
          proofNeeded: Number(f.proofNeeded) || 3,
          notes: f.notes,
        })
      }
    >
      <Row title="Goal" line="What this season is for, in one line." htmlFor="sgoal">
        <Field id="sgoal" value={f.goal} onChange={(x) => set({ goal: x })} />
      </Row>
      <Row title="Starts" htmlFor="sstart">
        <Input
          id="sstart"
          type="date"
          value={f.start}
          onChange={(e) => set({ start: e.target.value, end: addDays(e.target.value, 89) })}
        />
      </Row>
      <Row title="Ends" htmlFor="send">
        <Input id="send" type="date" value={f.end} onChange={(e) => set({ end: e.target.value })} />
      </Row>
      <Row title="Path" line="Chosen once per season.">
        <Pick
          label="Path"
          value={f.path}
          onChange={(x) => set({ path: x })}
          options={[
            { id: "A", name: "A · Outcome flex" },
            { id: "B", name: "B · Volume sprint" },
          ]}
        />
      </Row>
      <Row title="Target by the end" line="The number you're aiming for." htmlFor="starget">
        <Input
          id="starget"
          type="number"
          min={0}
          value={f.target}
          onChange={(e) => set({ target: e.target.value })}
        />
      </Row>
      <Row title="Proof links to finish step 1" htmlFor="sproof">
        <Input
          id="sproof"
          type="number"
          min={1}
          value={f.proofNeeded}
          onChange={(e) => set({ proofNeeded: e.target.value })}
        />
      </Row>
      <Row title="Notes" line="For you only. Not shown on the plan." htmlFor="snotes">
        <Field id="snotes" long value={f.notes} onChange={(x) => set({ notes: x })} />
      </Row>
    </Frame>
  );
}

function IdeaEdit({ d, n, back }: { d: Detail; n: number; back: string }) {
  const [idea, setIdea] = useState(d.ideas.find((i) => i.n === n)?.idea ?? "");
  return (
    <Frame
      title={`Idea for season ${n}`}
      back={back}
      save={() => ok("season-idea-save", { brand: d.brand.id, n, idea })}
    >
      <Row title="Idea" htmlFor="idea">
        <Field id="idea" long value={idea} onChange={setIdea} />
      </Row>
    </Frame>
  );
}

function IdentityEdit({ d, id, back }: { d: Detail; id: string | undefined; back: string }) {
  const found: Identity | undefined = d.identity.find((i) => i.id === id);
  const [f, set] = useDraft({
    line: found?.line ?? "",
    credit: found?.credit ?? "own",
    creditUrl: found?.creditUrl ?? "",
    thought: found?.thought ?? "",
    themes: found?.themes ?? [],
  });
  const themes = d.guidance.plan.association.amplify.map((a) =>
    a.title ? `${a.title}: ${a.item}` : a.item,
  );
  return (
    <Frame
      title={found ? "Edit line" : "New line"}
      line="Short and quotable, with credit where it's someone else's idea."
      back={back}
      save={() =>
        found
          ? ok("identity-edit", { identity: found.id, ...f, themes: lines(f.themes) })
          : ok("identity-add", { brand: d.brand.id, ...f, themes: lines(f.themes) })
      }
    >
      <Row title="Line" htmlFor="line">
        <Field id="line" long value={f.line} onChange={(x) => set({ line: x })} />
      </Row>
      <Row
        title="Credit"
        line="own for yours, or the person or book it comes from."
        htmlFor="credit"
      >
        <Field id="credit" value={f.credit} onChange={(x) => set({ credit: x })} />
      </Row>
      <Row title="Credit link" htmlFor="crediturl">
        <Field id="crediturl" value={f.creditUrl} onChange={(x) => set({ creditUrl: x })} />
      </Row>
      <Row title="The thought behind it" htmlFor="thought">
        <Field id="thought" long value={f.thought} onChange={(x) => set({ thought: x })} />
      </Row>
      <Row
        title="Themes it supports"
        line={themes.length ? `Your themes: ${themes.join(" · ")}` : ""}
        htmlFor="ithemes"
      >
        <Lines
          id="ithemes"
          value={f.themes}
          onChange={(x) => set({ themes: x })}
          placeholder="Theme"
          add="Add theme"
        />
      </Row>
    </Frame>
  );
}

function ProofEdit({ d, id, back }: { d: Detail; id: string | undefined; back: string }) {
  const found: Proof | undefined = d.proof.find((p) => p.id === id);
  const [f, set] = useDraft({
    title: found?.title ?? "",
    body: found?.body ?? "",
    kind: found?.kind ?? ("fact" as Proof["kind"]),
    provenance: found?.provenance ?? ("firsthand" as Proof["provenance"]),
    status: found?.status ?? ("active" as Proof["status"]),
    proofUrl: found?.proofUrl ?? "",
    source: found?.source ?? "",
    sourceUrl: found?.sourceUrl ?? "",
    speaker: found?.speaker ?? "",
    subject: found?.subject ?? "",
    occurredOn: found?.occurredOn ?? "",
    topics: found?.topics ?? [],
    uncertainty: found?.uncertainty ?? "",
  });
  const save = async () => {
    const { status, ...data } = f;
    const input = { ...data, topics: lines(f.topics) };
    if (!found) return ok("proof-add", { brand: d.brand.id, ...input });
    if (!(await ok("proof-edit", { proof: found.id, ...input }))) return false;
    return status === found.status ? true : ok("proof-status-set", { proof: found.id, status });
  };
  return (
    <Frame
      title={found ? "Edit proof" : "New proof"}
      line="Never invent a result: if there's no proof yet, say so."
      back={back}
      save={save}
    >
      <Row title="Title" htmlFor="ptitle">
        <Field id="ptitle" value={f.title} onChange={(x) => set({ title: x })} />
      </Row>
      <Row title="In your words" htmlFor="pbody">
        <Field id="pbody" long value={f.body} onChange={(x) => set({ body: x })} />
      </Row>
      <Row title="Proof link" line="A public repo, demo or post anyone can open." htmlFor="purl">
        <Field id="purl" value={f.proofUrl} onChange={(x) => set({ proofUrl: x })} />
      </Row>
      <Row title="Kind">
        <Pick
          label="Kind"
          value={f.kind}
          onChange={(x) => set({ kind: x })}
          options={[
            { id: "fact", name: "Something I built or did" },
            { id: "story", name: "A story" },
            { id: "opinion", name: "An opinion" },
            { id: "reference", name: "Someone else's source" },
          ]}
        />
      </Row>
      <Row title="Where it comes from">
        <Pick
          label="Provenance"
          value={f.provenance}
          onChange={(x) => set({ provenance: x })}
          options={[
            { id: "firsthand", name: "Firsthand" },
            { id: "third_party", name: "Someone else" },
            { id: "unverified", name: "Not checked" },
          ]}
        />
      </Row>
      <Row title="Source" htmlFor="psource">
        <Field id="psource" value={f.source} onChange={(x) => set({ source: x })} />
      </Row>
      <Row title="Source link" htmlFor="psourceurl">
        <Field id="psourceurl" value={f.sourceUrl} onChange={(x) => set({ sourceUrl: x })} />
      </Row>
      <Row title="Speaker" htmlFor="pspeaker">
        <Field id="pspeaker" value={f.speaker} onChange={(x) => set({ speaker: x })} />
      </Row>
      <Row title="When it happened" htmlFor="pwhen">
        <Input
          id="pwhen"
          type="date"
          value={f.occurredOn}
          onChange={(e) => set({ occurredOn: e.target.value })}
        />
      </Row>
      <Row title="Topics" htmlFor="ptopics">
        <Lines
          id="ptopics"
          value={f.topics}
          onChange={(x) => set({ topics: x })}
          placeholder="Topic"
          add="Add topic"
        />
      </Row>
      <Row title="What's uncertain" htmlFor="punsure">
        <Field id="punsure" long value={f.uncertainty} onChange={(x) => set({ uncertainty: x })} />
      </Row>
      {found && (
        <Row title="Status">
          <Pick
            label="Status"
            value={f.status}
            onChange={(x) => set({ status: x })}
            options={[
              { id: "active", name: "Active" },
              { id: "archived", name: "Archived" },
              { id: "withdrawn", name: "Withdrawn" },
            ]}
          />
        </Row>
      )}
    </Frame>
  );
}

const KINDS: { id: Channel["kind"]; name: string }[] = [
  { id: "x", name: "X" },
  { id: "blog", name: "Blog" },
  { id: "newsletter", name: "Newsletter" },
  { id: "website", name: "Website" },
  { id: "other", name: "Other" },
];

function ChannelEdit({ d, id, back }: { d: Detail; id: string | undefined; back: string }) {
  const found = d.channels.find((c) => c.id === id);
  const [f, set] = useDraft({
    kind: found?.kind ?? ("x" as Channel["kind"]),
    name: found?.name ?? "",
    description: found?.description ?? "",
    url: found?.url ?? "",
  });
  return (
    <Frame
      title={found ? "Edit channel" : "Add channel"}
      back={back}
      save={() =>
        ok("channel-save", { brand: d.brand.id, ...(found ? { channel: found.id } : {}), ...f })
      }
    >
      <Row title="Kind">
        <Pick label="Kind" value={f.kind} onChange={(x) => set({ kind: x })} options={KINDS} />
      </Row>
      <Row title="Name" htmlFor="cname">
        <Field id="cname" value={f.name} onChange={(x) => set({ name: x })} />
      </Row>
      <Row title="Link" htmlFor="curl">
        <Field id="curl" value={f.url} onChange={(x) => set({ url: x })} />
      </Row>
      <Row title="Description" htmlFor="cdesc">
        <Field id="cdesc" long value={f.description} onChange={(x) => set({ description: x })} />
      </Row>
    </Frame>
  );
}

function AccountEdit({
  d,
  id,
  channel,
  back,
}: {
  d: Detail;
  id: string | undefined;
  channel: string;
  back: string;
}) {
  const found: Account | undefined = d.accounts.find((a) => a.id === id);
  const [f, set] = useDraft({
    channel: found?.channelId ?? channel ?? d.channels[0]?.id ?? "",
    name: found?.name ?? "",
    handle: found?.handle ?? "",
    url: found?.url ?? "",
    role: found?.role ?? "",
    instructions: found?.instructions ?? "",
  });
  const [persona, setPersona] = useDraft<Persona>(
    found?.persona ?? {
      tone: "",
      traits: [],
      audience: "",
      topics: [],
      boundaries: [],
      examples: [],
    },
  );
  return (
    <Frame
      title={found ? "Edit account" : "Add account"}
      back={back}
      save={() =>
        ok("account-save", {
          brand: d.brand.id,
          ...(found ? { account: found.id } : {}),
          ...f,
          persona: {
            tone: persona.tone,
            audience: persona.audience,
            traits: lines(persona.traits),
            topics: lines(persona.topics),
            boundaries: lines(persona.boundaries),
            examples: lines(persona.examples),
          },
        })
      }
    >
      <Row title="Channel" htmlFor="achannel">
        <Choose
          id="achannel"
          label="Channel"
          value={f.channel}
          options={d.channels.map((c) => ({ id: c.id, name: c.name }))}
          onChange={(x) => set({ channel: x })}
        />
      </Row>
      <Row title="Name" htmlFor="aname">
        <Field id="aname" value={f.name} onChange={(x) => set({ name: x })} />
      </Row>
      <Row title="Handle" htmlFor="ahandle">
        <Field id="ahandle" value={f.handle} onChange={(x) => set({ handle: x })} />
      </Row>
      <Row title="Link" htmlFor="aurl">
        <Field id="aurl" value={f.url} onChange={(x) => set({ url: x })} />
      </Row>
      <Row title="Role" line="Such as Primary." htmlFor="arole">
        <Field id="arole" value={f.role} onChange={(x) => set({ role: x })} />
      </Row>
      <Row title="Instructions" htmlFor="ainstr">
        <Field id="ainstr" long value={f.instructions} onChange={(x) => set({ instructions: x })} />
      </Row>
      <Row title="Persona tone" htmlFor="ptone">
        <Field id="ptone" long value={persona.tone} onChange={(x) => setPersona({ tone: x })} />
      </Row>
      <Row title="Persona audience" htmlFor="paud">
        <Field
          id="paud"
          long
          value={persona.audience}
          onChange={(x) => setPersona({ audience: x })}
        />
      </Row>
      <Row title="Traits" htmlFor="ptraits">
        <Lines
          id="ptraits"
          value={persona.traits}
          onChange={(x) => setPersona({ traits: x })}
          placeholder="Trait"
          add="Add trait"
        />
      </Row>
      <Row title="Topics" htmlFor="ptops">
        <Lines
          id="ptops"
          value={persona.topics}
          onChange={(x) => setPersona({ topics: x })}
          placeholder="Topic"
          add="Add topic"
        />
      </Row>
      <Row title="Boundaries" htmlFor="pbounds">
        <Lines
          id="pbounds"
          value={persona.boundaries}
          onChange={(x) => setPersona({ boundaries: x })}
          placeholder="Boundary"
          add="Add boundary"
        />
      </Row>
      <Row title="Examples" htmlFor="pex">
        <Lines
          id="pex"
          value={persona.examples}
          onChange={(x) => setPersona({ examples: x })}
          placeholder="Example"
          add="Add example"
        />
      </Row>
    </Frame>
  );
}

function PeerEdit({ d, account, back }: { d: Detail; account: string; back: string }) {
  const acc = d.accounts.find((a) => a.id === account);
  const [f, set] = useDraft({ handle: "", name: "", url: "", sector: "", reason: "" });
  return (
    <Frame
      title={`Add a peer${acc ? ` for ${acc.name}` : ""}`}
      line="Someone this account learns from."
      back={back}
      saveLabel="Add"
      save={() => ok("peer-add", { account, ...f, handle: f.handle.replace(/^@/, "") })}
    >
      <Row title="Handle" htmlFor="phandle">
        <Field id="phandle" value={f.handle} onChange={(x) => set({ handle: x })} />
      </Row>
      <Row title="Name" htmlFor="pname">
        <Field id="pname" value={f.name} onChange={(x) => set({ name: x })} />
      </Row>
      <Row title="Link" htmlFor="purl2">
        <Field id="purl2" value={f.url} onChange={(x) => set({ url: x })} />
      </Row>
      <Row title="Sector" htmlFor="psector">
        <Field id="psector" value={f.sector} onChange={(x) => set({ sector: x })} />
      </Row>
      <Row title="Why they matter" htmlFor="preason">
        <Field id="preason" long value={f.reason} onChange={(x) => set({ reason: x })} />
      </Row>
    </Frame>
  );
}
