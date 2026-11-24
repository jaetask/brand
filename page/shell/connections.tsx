import { ListCard, ListRow, PageBody, Panel } from "@jaetask/toolkit/suite";
import { Button } from "@jaetask/toolkit/ui/button";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@jaetask/toolkit/ui/badge";

const Muted = ({ children }: { children: React.ReactNode }) => (
  <p className="m-0 text-sm text-muted-foreground">{children}</p>
);

type Connection = {
  id: string;
  host: string;
  state: "pairing" | "connected" | "revoked";
  principal?: { id: string };
  effects: string[];
};

const send = (path: string, body?: unknown) =>
  fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: { "x-kit-request": "1", "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const actorFor = (host: string) =>
  host
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "agent";

export function ConnectionsPage() {
  const [list, setList] = useState<Connection[]>([]);
  const load = useCallback(async () => {
    setList((await (await send("/api/connections")).json()) as Connection[]);
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [load]);
  const decide = async (c: Connection, what: "approve" | "revoke", change = true) => {
    await send(
      `/api/connections/${encodeURIComponent(c.id)}/${what}`,
      what === "approve"
        ? { principal: actorFor(c.host), effects: change ? ["read", "write"] : ["read"] }
        : {},
    );
    await load();
  };
  const waiting = list.filter((c) => c.state === "pairing");
  const connected = list.filter((c) => c.state === "connected");
  return (
    <PageBody
      title="Connections"
      line="Agents and Apps that use Brand over MCP. Ask from a terminal with npm run connect, then approve it here."
    >
      <Panel id="waiting" title="Waiting for you">
        {waiting.length ? (
          <ListCard>
            {waiting.map((c) => (
              <ListRow
                key={c.id}
                aside={
                  <>
                    <Button onClick={() => void decide(c, "approve")}>Read and change</Button>
                    <Button variant="outline" onClick={() => void decide(c, "approve", false)}>
                      Read only
                    </Button>
                    <Button variant="ghost" onClick={() => void decide(c, "revoke")}>
                      Turn down
                    </Button>
                  </>
                }
              >
                {c.host}
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Muted>Nothing is waiting.</Muted>
        )}
      </Panel>
      <Panel id="connected" title="Connected">
        {connected.length ? (
          <ListCard>
            {connected.map((c) => (
              <ListRow
                key={c.id}
                aside={
                  <Button variant="outline" onClick={() => void decide(c, "revoke")}>
                    Revoke
                  </Button>
                }
              >
                <span className="flex items-center gap-2">
                  {c.host}
                  <Badge variant="outline">
                    {c.effects.includes("write") ? "read and change" : "read"}
                  </Badge>
                </span>
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <Muted>No agent is connected yet.</Muted>
        )}
      </Panel>
    </PageBody>
  );
}
