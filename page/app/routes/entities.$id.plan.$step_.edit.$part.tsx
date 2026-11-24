import { PLAN_LEVELS, PLAN_LEVEL_TITLES, type PlanLevel } from "@shared/marketing";
import { Navigate, useParams } from "@shims/react-router";

import { EntityPage } from "@/components/marketing/EntityPage";
import { StepEdit } from "@/components/marketing/plan/step-edit";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: APP_TITLE }];
}

export default function PlanStepEditRoute() {
  const { id = "", step = "", part = "" } = useParams();
  if (!(PLAN_LEVELS as readonly string[]).includes(step))
    return <Navigate to={`/entities/${id}/plan`} replace />;
  const level = step as PlanLevel;
  return (
    <EntityPage
      key={`${id}-plan-${level}-edit-${part}`}
      id={id}
      page={`Plan · ${PLAN_LEVEL_TITLES[level]}`}
    >
      {(d) => <StepEdit detail={d} level={level} part={part} />}
    </EntityPage>
  );
}
