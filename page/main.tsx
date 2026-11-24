import {
  AppShell,
  CenteredPage,
  type Group,
  type LinkComponent,
  LinkProvider,
  type Progress,
  SideLink,
  SideSection,
} from "@jaetask/toolkit/suite";
import { Toaster } from "@jaetask/toolkit/ui/toaster";
import { IconArchive, IconLayoutGrid, IconPlug } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { type Brand, type Detail, type LevelStatus, useRead } from "./api.js";
import { brandIcon } from "./look.js";
import { ArchivePage, BrandsPage, NewBrandPage } from "./brands.js";
import { BrandPage } from "./brand.js";
import { ConnectionsPage } from "./connections.js";

const hashPath = () => window.location.hash.replace(/^#/, "") || "/";
function useHashPath() {
  const [path, setPath] = useState(hashPath);
  useEffect(() => {
    const on = () => setPath(hashPath());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return path;
}

const HashLink: LinkComponent = ({ href, children, ...rest }) => (
  <a href={href.startsWith("/") ? `#${href}` : href} {...rest}>
    {children}
  </a>
);

const progress = (state: LevelStatus["state"] | undefined): Progress =>
  state === "done" ? "done" : state === "partial" ? "in-progress" : "not-started";

function BrandSections({ brand, path }: { brand: Brand; path: string }) {
  const detail = useRead<Detail>("brand-read", { brand: brand.id });
  const base = `/b/${brand.id}`;
  const at = (to: string) => path === `${base}/${to}` || path.startsWith(`${base}/${to}/`);
  const levels = detail?.plan.levels ?? [];
  return (
    <>
      <SideLink
        href={`${base}/profile`}
        label="Profile"
        line="Who you are · where you post"
        current={at("profile")}
      />
      <SideLink
        href={`${base}/beliefs`}
        label="What you believe"
        line="Lines that define your character"
        current={at("beliefs")}
      />
      <SideLink
        href={`${base}/voice`}
        label="Voice and look"
        line="How you sound and look"
        current={at("voice")}
      />
      <SideSection label="Plan">
        <SideLink href={`${base}/plan`} label="Overview" current={path === `${base}/plan`} />
        {levels.map((l) => (
          <SideLink
            key={l.level}
            href={`${base}/plan/${l.level}`}
            label={`${l.n}  ${l.title}`}
            status={progress(l.state)}
            current={at(`plan/${l.level}`)}
          />
        ))}
      </SideSection>
    </>
  );
}

function App() {
  const path = useHashPath();
  const brands = useRead<Brand[]>("brand-list", { archived: false });
  const parts = path.split("/").filter(Boolean);
  const selected = parts[0] === "b" ? parts[1] : undefined;

  const groups: Group[] = [
    {
      label: "Brands",
      href: "/brands",
      items: (brands ?? []).map((b) => ({
        id: b.id,
        href: `/b/${b.id}/plan`,
        label: b.name,
        ...(b.image
          ? { image: b.image }
          : { projectIcon: brandIcon(b.icon), iconColour: b.colour }),
        current: selected === b.id,
        ...(selected === b.id ? { open: <BrandSections brand={b} path={path} /> } : {}),
      })),
      empty: "No brands yet.",
    },
  ];

  let page = <BrandsPage brands={brands} />;
  if (parts[0] === "brands" && parts[1] === "new") page = <NewBrandPage />;
  else if (parts[0] === "archive") page = <ArchivePage />;
  else if (parts[0] === "connections") page = <ConnectionsPage />;
  else if (selected) page = <BrandPage key={selected} id={selected} parts={parts.slice(2)} />;

  return (
    <LinkProvider link={HashLink} location={() => window.location.hash.replace(/^#/, "") || "/"}>
      <AppShell
        app={{ name: "Brand", href: "/brands" }}
        nav={[
          {
            href: "/brands",
            label: "All brands",
            icon: <IconLayoutGrid size={16} aria-hidden />,
            current: parts[0] === "brands" || path === "/",
          },
        ]}
        groups={groups}
        bottom={[
          {
            href: "/archive",
            label: "Archive",
            icon: <IconArchive size={16} aria-hidden />,
            current: parts[0] === "archive",
          },
          {
            href: "/connections",
            label: "Connections",
            icon: <IconPlug size={16} aria-hidden />,
            current: parts[0] === "connections",
          },
        ]}
      >
        {brands === undefined ? <CenteredPage title="Loading brands">{null}</CenteredPage> : page}
      </AppShell>
      <Toaster />
    </LinkProvider>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
