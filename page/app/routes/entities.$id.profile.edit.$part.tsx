import { Navigate, useParams } from "@shims/react-router";

import { EntityPage } from "@/components/marketing/EntityPage";
import { PROFILE_PARTS, ProfileEdit, type ProfilePart } from "@/components/marketing/ProfilePage";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [{ title: APP_TITLE }];
}

export default function ProfileEditRoute() {
  const { id = "", part = "" } = useParams();
  if (!(part in PROFILE_PARTS)) return <Navigate to={`/entities/${id}/profile`} replace />;
  return (
    <EntityPage key={`${id}-edit-${part}`} id={id} page="Profile">
      {(d) => <ProfileEdit detail={d} part={part as ProfilePart} />}
    </EntityPage>
  );
}
