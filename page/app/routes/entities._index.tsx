import { useSetPageTitle } from "@shims/app-shell";

import { EntitiesEditor } from "@/components/marketing/EntitiesEditor";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: APP_TITLE }];
}

export default function EntitiesRoute() {
  useSetPageTitle("Entities");
  return <EntitiesEditor />;
}
