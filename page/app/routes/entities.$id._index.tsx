import type { EntityDetail } from "@shared/marketing";
import { useActionQuery } from "@shims/use-action";
import { Navigate, useParams, useSearchParams } from "@shims/react-router";

import { SECTION_ALIASES, brandLanding, sectionById } from "@/components/marketing/entity-sections";
import { Status } from "@/components/marketing/ui";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: APP_TITLE }];
}

export default function EntityIndexRoute() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const tab = params.get("tab") ?? undefined;
  const query = useActionQuery<EntityDetail>("get-entity", { id }, { enabled: !tab });
  if (tab === "history") return <Navigate to={`/entities?entity=${id}`} replace />;
  if (tab)
    return (
      <Navigate
        to={`/entities/${id}/${sectionById(tab)?.id ?? SECTION_ALIASES[tab] ?? "plan"}`}
        replace
      />
    );
  if (query.error) return <Navigate to={`/entities/${id}/plan`} replace />;
  return (
    <div className="p-6">
      <Status loading={query.isLoading} error={null}>
        {query.data && <Navigate to={`/entities/${id}/${brandLanding(query.data)}`} replace />}
      </Status>
    </div>
  );
}
