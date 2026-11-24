import type { EntityDetail } from "@shared/marketing";
import { useActionQuery } from "@shims/use-action";
import { useSetPageTitle } from "@shims/app-shell";
import { useEffect, type ReactNode } from "react";

import { BrandPicture, BrandPictureUpload } from "@/components/marketing/BrandPicture";
import { EntityIcon } from "@/components/marketing/EntityIcon";
import { StateBadge, Status, useEntityContext } from "@/components/marketing/ui";

export function EntityPage({
  id,
  page,
  upload = false,
  children,
}: {
  id: string;
  page: string;
  upload?: boolean;
  children: (d: EntityDetail) => ReactNode;
}) {
  const query = useActionQuery<EntityDetail>("get-entity", { id });
  const [, setEntity] = useEntityContext();
  const d = query.data;
  useSetPageTitle(d ? `${d.entity.name} · ${page}` : page);

  useEffect(() => {
    if (d && !d.entity.archived) setEntity(d.entity.id);
  }, [d, setEntity]);
  return (
    <div className="grid w-full min-w-0 gap-4 p-6">
      <Status loading={query.isLoading} error={query.error}>
        {d && (
          <>
            <header className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                {upload ? (
                  <BrandPictureUpload
                    entity={d.entity}
                    size={28}
                    fallback={
                      <EntityIcon icon={d.entity.icon} colour={d.entity.colour} size={28} />
                    }
                  />
                ) : (
                  <BrandPicture
                    entity={d.entity}
                    size={28}
                    fallback={
                      <EntityIcon icon={d.entity.icon} colour={d.entity.colour} size={28} />
                    }
                  />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">{d.entity.name}</p>
                  <h1 className="text-lg font-semibold">{page}</h1>
                </div>
                {d.entity.archived && <StateBadge state="archived" />}
              </div>
            </header>
            {children(d)}
          </>
        )}
      </Status>
    </div>
  );
}
