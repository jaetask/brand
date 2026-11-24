import { useParams } from "@shims/react-router";

import { BeliefLinePage } from "@/components/marketing/BeliefsPage";
import { EntityPage } from "@/components/marketing/EntityPage";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: APP_TITLE }];
}

export default function BeliefLineRoute() {
  const { id = "", lineId = "new" } = useParams();
  return (
    <EntityPage key={`${id}-line-${lineId}`} id={id} page="What you believe">
      {(d) => <BeliefLinePage detail={d} lineId={lineId} />}
    </EntityPage>
  );
}
