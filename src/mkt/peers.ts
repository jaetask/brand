import type { z } from "zod";

import type { Peer } from "../shared/marketing.js";
import {
  activity,
  bad,
  checkVersion,
  db,
  json,
  newId,
  notFound,
  now,
  one,
  q,
  write,
} from "./core.js";
import { getAccount } from "./entities.js";
import type * as S from "./schemas.js";

export const PEER_GUIDANCE = { recommendedMin: 5, recommendedMax: 10 };

function toPeer(r: any): Peer {
  return {
    name: "",
    url: "",
    sector: "",
    reason: "",
    ...r.data,
    id: r.id,
    accountId: r.account_id,
    handle: r.handle,
    status: r.status,
    version: r.version,
    createdBy: r.created_by,
    createdAt: r.created_at,
    removedAt: r.removed_at,
  };
}

export const cleanHandle = (h: string) =>
  h
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .split(/[/?#]/)[0];

export async function savePeer(input: z.infer<typeof S.savePeer>) {
  const a = {
    ...input,
    ...(input.handle ? { handle: cleanHandle(input.handle) } : {}),
  };
  return write(a.by, a.requestId, ["save-peer", a], async (tx) => {
    if (!a.id) {
      if (!a.accountId || !a.handle) bad("A peer needs an account and a handle.");
      const account = await getAccount(tx, a.accountId, true);
      if (
        await one(
          tx,
          "SELECT id FROM mkt_peers WHERE account_id=? AND lower(handle)=lower(?) AND status='active'",
          [account.id, a.handle],
        )
      )
        bad("This account already follows that peer.", "duplicate_peer", 409);
      const owned = await one(
        tx,
        "SELECT id FROM mkt_accounts WHERE lower(data->>'handle')=lower(?)",
        [a.handle],
      );
      if (owned) bad("That handle is one of your own accounts; peers are external people.");
      const id = newId();
      await q(
        tx,
        "INSERT INTO mkt_peers(id,account_id,handle,data,created_by,created_at) VALUES(?,?,?,?::jsonb,?,?)",
        [
          id,
          account.id,
          a.handle,
          json({
            name: a.name ?? "",
            url: a.url || `https://x.com/${a.handle}`,
            sector: a.sector ?? "",
            reason: a.reason ?? "",
          }),
          a.by,
          now(),
        ],
      );
      await activity(tx, "account", account.id, account.entityId, a.by, `Added peer @${a.handle}`, {
        peerId: id,
      });
      return toPeer(await one(tx, "SELECT * FROM mkt_peers WHERE id=?", [id]));
    }
    const r = await one(tx, "SELECT * FROM mkt_peers WHERE id=?", [a.id]);
    if (!r) notFound("peer");
    checkVersion(r.version, a.expectedVersion);
    const old = toPeer(r);
    if (a.accountId && a.accountId !== old.accountId)
      bad("Peers belong to one account; add them to the other account instead.");
    const account = await getAccount(tx, old.accountId);
    const status = a.status ?? old.status;
    if (status === "active" && old.status === "removed") {
      if (
        await one(
          tx,
          "SELECT id FROM mkt_peers WHERE account_id=? AND lower(handle)=lower(?) AND status='active' AND id<>?",
          [old.accountId, old.handle, old.id],
        )
      )
        bad("This account already follows that peer again.", "duplicate_peer", 409);
    }
    const data = {
      name: a.name ?? old.name,
      url: a.url ?? old.url,
      sector: a.sector ?? old.sector,
      reason: a.reason ?? old.reason,
    };
    await q(
      tx,
      "UPDATE mkt_peers SET status=?, data=?::jsonb, removed_at=?, version=version+1 WHERE id=?",
      [status, json(data), status === "removed" ? (old.removedAt ?? now()) : null, old.id],
    );
    const text =
      status !== old.status
        ? `${status === "removed" ? "Removed" : "Restored"} peer @${old.handle}`
        : `Edited peer @${old.handle}`;
    await activity(tx, "account", account.id, account.entityId, a.by, text, {
      peerId: old.id,
    });
    return toPeer(await one(tx, "SELECT * FROM mkt_peers WHERE id=?", [old.id]));
  });
}

export async function listPeers(a: z.infer<typeof S.listPeers>) {
  const args: unknown[] = [];
  let sql = "SELECT p.* FROM mkt_peers p JOIN mkt_accounts a ON a.id=p.account_id WHERE 1=1";
  if (a.accountId) {
    sql += " AND p.account_id=?";
    args.push(a.accountId);
  }
  if (a.entityId) {
    sql += " AND a.entity_id=?";
    args.push(a.entityId);
  }
  if (a.status !== "all") {
    sql += " AND p.status=?";
    args.push(a.status);
  }
  sql += " ORDER BY lower(p.handle)";
  return {
    peers: (await q(db(), sql, args)).map(toPeer),
    guidance: PEER_GUIDANCE,
  };
}
