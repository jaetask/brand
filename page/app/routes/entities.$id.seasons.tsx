import { useParams } from "@shims/react-router";

import { EntityPage } from "@/components/marketing/EntityPage";
import { SeasonEditor } from "@/components/marketing/plan/season-editor";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: APP_TITLE }];
}

export default function SeasonsRoute() {
  const { id = "" } = useParams();
  return (
    <EntityPage key={`${id}-seasons`} id={id} page="Seasons">
      {(d) => <SeasonEditor detail={d} />}
    </EntityPage>
  );
}
