import type { EntityDetail, PlanLevel } from "@shared/marketing";

import { AssociationEdit } from "@/components/marketing/plan/association";
import { BeltEdit } from "@/components/marketing/plan/belt";
import { useBackTo, planPath } from "@/components/marketing/plan/kit";
import { PersonEdit } from "@/components/marketing/plan/person";
import { ProductEdit } from "@/components/marketing/plan/product";
import { ProofEdit } from "@/components/marketing/plan/steps";

export type StepEditProps = {
  detail: EntityDetail;
  part: string;
  backTo: string;
};

export function StepEdit({
  detail,
  level,
  part,
}: {
  detail: EntityDetail;
  level: PlanLevel;
  part: string;
}) {
  const backTo = useBackTo(planPath(detail.entity.id, level));
  const Edit = {
    proof: ProofEdit,
    person: PersonEdit,
    association: AssociationEdit,
    product: ProductEdit,
    belt: BeltEdit,
  }[level];
  return <Edit detail={detail} part={part} backTo={backTo} />;
}

export const stepEditPath = (entityId: string, level: PlanLevel, part: string) =>
  `${planPath(entityId, level)}/edit/${part}`;
