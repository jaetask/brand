import { useParams } from "@shims/react-router";

import { AccountCard, ChannelRow } from "@/components/marketing/EntityForms";
import { EntityPage } from "@/components/marketing/EntityPage";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: APP_TITLE }];
}

export default function ChannelRoute() {
  const { id = "", channelId = "" } = useParams();
  return (
    <EntityPage key={`${id}-${channelId}`} id={id} page="Channel">
      {(d) => {
        const channel = d.channels.find((c) => c.id === channelId);
        if (!channel)
          return (
            <p className="text-sm text-muted-foreground">
              That channel doesn't belong to this entity.
            </p>
          );
        const accounts = d.accounts.filter((a) => a.channelId === channel.id);
        return (
          <div className="grid gap-4">
            <ul>
              <ChannelRow key={channel.version} channel={channel} />
            </ul>
            <section className="grid gap-3">
              <h2 className="text-sm font-semibold">Accounts on this channel</h2>
              {accounts.length ? (
                accounts.map((a) => <AccountCard key={a.id} account={a} channel={channel} />)
              ) : (
                <p className="text-sm text-muted-foreground">
                  No accounts yet. Add one from Channels &amp; accounts.
                </p>
              )}
            </section>
          </div>
        );
      }}
    </EntityPage>
  );
}
