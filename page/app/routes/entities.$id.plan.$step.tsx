import { PLAN_LEVELS, PLAN_LEVEL_TITLES, type PlanLevel } from "@shared/marketing";
import { Navigate, useParams } from "@shims/react-router";

import { EntityPage } from "@/components/marketing/EntityPage";
import { PlanStep } from "@/components/marketing/PlanBoard";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: APP_TITLE }];
}

export default function PlanStepRoute() {
  const { id = "", step = "" } = useParams();
  if (!(PLAN_LEVELS as readonly string[]).includes(step))
    return <Navigate to={`/entities/${id}/plan`} replace />;
  const level = step as PlanLevel;
  return (
    <EntityPage key={`${id}-plan-${level}`} id={id} page={`Plan · ${PLAN_LEVEL_TITLES[level]}`}>
      {(d) => <PlanStep detail={d} level={level} />}
    </EntityPage>
  );
}
