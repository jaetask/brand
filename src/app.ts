import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { DatabaseSync } from "node:sqlite";
import { provide } from "@jaetask/open-agent-kit";
import { type App, createApp } from "@jaetask/open-agent-kit/app";
import { nodeListener } from "@jaetask/open-agent-kit/mcp";
import { brandDomain } from "./brand/domain.js";
import { OWNER } from "./brand/model.js";
import { sqliteBrands } from "./brand/store.js";
import { VERSION } from "./version.js";

export type BrandOptions = {
  file: string;
  page?: string;
  connect?: string[];
  log?: (line: string) => void;
  now?: () => number;
  sweepEvery?: number;
  syncEvery?: number;
};

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const PAGE_ROUTES = /^\/(api\/|events$)/;

const isLocal = (request: Request) => {
  const host = request.headers.get("host");
  return !host || LOCAL_HOSTS.has(new URL(`http://${host}`).hostname);
};

const withCookie = (request: Request, cookie: string) => {
  const headers = new Headers(request.headers);
  headers.set("cookie", cookie);
  return new Request(request, { headers });
};

async function ownerCookie(
  fetch: (request: Request) => Promise<Response>,
  secret: string,
): Promise<string> {
  const answer = await fetch(
    new Request("http://127.0.0.1/api/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-kit-request": "1" },
      body: JSON.stringify({ secret }),
    }),
  );
  return (answer.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

export const domains = (now: () => number = Date.now) => [
  provide(brandDomain, (db: DatabaseSync) => ({ brands: sqliteBrands(db, now) })),
];

export type BrandApp = App;

export async function createBrand(options: BrandOptions): Promise<BrandApp> {
  const now = options.now ?? Date.now;
  const setupSecret = randomBytes(24).toString("base64url");
  const app = await createApp({
    name: "brand",
    version: VERSION,
    file: options.file,
    domains: domains(now),
    owner: { id: OWNER },
    now,
    setupSecret,
    ...(options.connect ? { connect: options.connect } : {}),
    ...(options.page ? { page: options.page } : {}),
    ...(options.log ? { log: options.log } : {}),
    ...(options.sweepEvery === undefined ? {} : { sweepEvery: options.sweepEvery }),
    ...(options.syncEvery === undefined ? {} : { syncEvery: options.syncEvery }),
  });
  const cookie = await ownerCookie(app.fetch, setupSecret);
  const fetch = async (request: Request) => {
    const { pathname } = new URL(request.url);
    if (!isLocal(request)) {
      return new Response("Brand answers on this computer only.", { status: 403 });
    }
    if (pathname === "/api/session" || pathname === "/api/sessions") {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    return app.fetch(PAGE_ROUTES.test(pathname) ? withCookie(request, cookie) : request);
  };
  let http: Server | undefined;
  return {
    ...app,
    fetch,
    listen: async (port, host = "127.0.0.1") => {
      http = createServer(nodeListener(fetch));
      await new Promise<void>((resolve) => http?.listen(port, host, resolve));
      return `http://${host}:${(http.address() as AddressInfo).port}`;
    },
    close: async () => {
      if (http) {
        http.closeAllConnections();
        await new Promise((resolve) => http?.close(resolve));
      }
      await app.close();
    },
  };
}
