import type { z } from "zod";

import { db, now, q, write } from "./core.js";
import type * as S from "./schemas.js";

export type LinkCheck = {
  url: string;
  ok: boolean | null;
  status: number | null;
  reason: string;
};

let testChecker: ((url: string) => Promise<LinkCheck>) | undefined;

export function useTestLinkChecker(fn?: (url: string) => Promise<LinkCheck>) {
  testChecker = fn;
}

export async function checkLink(url: string): Promise<LinkCheck> {
  const u = url.trim();
  if (!/^https?:\/\/\S+$/i.test(u))
    return { url: u, ok: false, status: null, reason: "Not a web link." };
  if (testChecker) return testChecker(u);
  if (process.env.VITEST)
    return { url: u, ok: null, status: null, reason: "Not checked in tests." };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(u, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (link check)" },
    });
    void res.body?.cancel();
    if (res.ok)
      return {
        url: u,
        ok: true,
        status: res.status,
        reason: "Anyone can open this link.",
      };
    if ([401, 403, 404, 410].includes(res.status))
      return {
        url: u,
        ok: false,
        status: res.status,
        reason: `It doesn't open for everyone (${res.status}). A private repo or a page behind a login won't count.`,
      };
    return {
      url: u,
      ok: null,
      status: res.status,
      reason: `Couldn't tell: the site answered ${res.status}.`,
    };
  } catch (err) {
    const why =
      err instanceof Error && err.name === "AbortError"
        ? "it took too long"
        : "the site couldn't be reached";
    return {
      url: u,
      ok: null,
      status: null,
      reason: `Couldn't check: ${why}.`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runLinkChecks(a: z.infer<typeof S.runLinkChecks>) {
  const rows = await q(
    db(),
    "SELECT id, data->>'proofUrl' AS url FROM mkt_knowledge WHERE entity_id=? AND status='active' AND coalesce(data->>'proofUrl','') <> ''",
    [a.entityId],
  );
  const results: (LinkCheck & { id: string })[] = [];
  for (const r of rows) results.push({ id: String(r.id), ...(await checkLink(String(r.url))) });
  await write(a.by, a.requestId, ["run-link-checks", a], async (tx) => {
    for (const r of results)
      await q(
        tx,
        "UPDATE mkt_knowledge SET data = data || ?::jsonb WHERE id=? AND data->>'proofUrl' = ?",
        [JSON.stringify({ linkOk: r.ok, linkCheckedAt: now() }), r.id, r.url],
      );
  });
  return {
    checked: results.length,
    open: results.filter((r) => r.ok === true).length,
    closed: results.filter((r) => r.ok === false).length,
    unknown: results.filter((r) => r.ok === null).length,
    results,
  };
}
