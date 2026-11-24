import { Navigate, useParams } from "@shims/react-router";

import {
  ACTION_SECTIONS,
  SECTION_ALIASES,
  sectionById,
} from "@/components/marketing/entity-sections";
import { EntityPage } from "@/components/marketing/EntityPage";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: APP_TITLE }];
}

export default function EntitySectionRoute() {
  const { id = "", section } = useParams();

  if (section === "history") return <Navigate to={`/entities?entity=${id}`} replace />;
  if (section && SECTION_ALIASES[section])
    return <Navigate to={`/entities/${id}/${SECTION_ALIASES[section]}`} replace />;
  const s = sectionById(section);
  if (!s) return <Navigate to={`/entities/${id}/plan`} replace />;
  return (
    <EntityPage key={`${id}-${s.id}`} id={id} page={s.label} upload={s.id === "profile"}>
      {(d) =>
        ACTION_SECTIONS.some((a) => a.id === s.id) ? (
          <div className="w-full min-w-0 max-w-[75rem]">{s.render(d)}</div>
        ) : (
          s.render(d)
        )
      }
    </EntityPage>
  );
}
