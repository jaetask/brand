import type { EntityDetail } from "@shared/marketing";

import { BeliefsPage } from "@/components/marketing/BeliefsPage";

export function BrandBeliefs({ detail }: { detail: EntityDetail }) {
  return <BeliefsPage detail={detail} />;
}
