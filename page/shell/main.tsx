import { AppShell, type LinkComponent, LinkProvider } from "@jaetask/toolkit/suite";
import { Toaster } from "@jaetask/toolkit/ui/sonner";
import { TooltipProvider } from "@jaetask/toolkit/ui/tooltip";
import { IconPlug } from "@tabler/icons-react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { type ComponentType, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import EntitiesRoute from "@/routes/entities._index";
import SectionRoute from "@/routes/entities.$id.$section";
import EntityRoute from "@/routes/entities.$id._index";
import LineRoute from "@/routes/entities.$id.beliefs.line.$lineId";
import ChannelRoute from "@/routes/entities.$id.channels.$channelId";
import StepRoute from "@/routes/entities.$id.plan.$step";
import StepEditRoute from "@/routes/entities.$id.plan.$step_.edit.$part";
import ProfileEditRoute from "@/routes/entities.$id.profile.edit.$part";
import SeasonsRoute from "@/routes/entities.$id.seasons";
import { PageTitleProvider, usePageTitle } from "@shims/app-shell";
import { Navigate, ParamsProvider, useLocation } from "@shims/react-router";
import { ConnectionsPage } from "./connections.js";

const ROUTES: [string, ComponentType][] = [
  ["/entities", EntitiesRoute],
  ["/entities/:id", EntityRoute],
  ["/entities/:id/plan/:step/edit/:part", StepEditRoute],
  ["/entities/:id/plan/:step", StepRoute],
  ["/entities/:id/profile/edit/:part", ProfileEditRoute],
  ["/entities/:id/seasons", SeasonsRoute],
  ["/entities/:id/beliefs/line/:lineId", LineRoute],
  ["/entities/:id/channels/:channelId", ChannelRoute],
  ["/entities/:id/:section", SectionRoute],
  ["/connections", ConnectionsPage],
];

function match(pathname: string): { Page: ComponentType; params: Record<string, string> } | null {
  const parts = pathname.split("/").filter(Boolean);
  for (const [pattern, Page] of ROUTES) {
    const want = pattern.split("/").filter(Boolean);
    if (want.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const ok = want.every((w, i) => {
      const got = decodeURIComponent(parts[i] ?? "");
      if (w.startsWith(":")) {
        params[w.slice(1)] = got;
        return true;
      }
      return w === got;
    });
    if (ok) return { Page, params };
  }
  return null;
}

const HashLink: LinkComponent = ({ href, children, ...rest }) => (
  <a href={href.startsWith("/") ? `#${href}` : href} {...rest}>
    {children}
  </a>
);

function LiveData() {
  const qc = useQueryClient();
  useEffect(() => {
    const source = new EventSource("/events");
    source.addEventListener("change", () => void qc.invalidateQueries({ queryKey: ["action"] }));
    return () => source.close();
  }, [qc]);
  return null;
}

function Shell() {
  const { pathname } = useLocation();
  const title = usePageTitle();
  const found = match(pathname);
  return (
    <AppShell
      app={{ name: "Brand", href: "/entities" }}
      nav={[]}
      side={(collapsed) => <MarketingNav collapsed={collapsed} />}
      bottom={[
        {
          href: "/connections",
          label: "Connections",
          icon: <IconPlug size={16} aria-hidden />,
          current: pathname === "/connections",
        },
      ]}
      title={title}
    >
      {found ? (
        <ParamsProvider params={found.params}>
          <found.Page key={pathname} />
        </ParamsProvider>
      ) : (
        <Navigate to="/entities" replace />
      )}
    </AppShell>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PageTitleProvider>
          <LinkProvider
            link={HashLink}
            location={() => window.location.hash.replace(/^#/, "") || "/"}
          >
            <LiveData />
            <Shell />
            <Toaster />
          </LinkProvider>
        </PageTitleProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
