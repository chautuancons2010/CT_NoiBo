import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { hasReleaseAvailabilityAccess } from "@/config/featureRelease";

export default async function Page() {
  const user = await getRequestUser();
  return <div className="page-stack project-portfolio-page"><PageHeader title="Gói / Công trường" /><ProjectList canCreate={Boolean(user && hasReleaseAvailabilityAccess(user.roleCodes) && can(user.permissions,"project.create"))} canEdit={Boolean(user && hasReleaseAvailabilityAccess(user.roleCodes) && can(user.permissions,"project.edit"))} /></div>;
}
