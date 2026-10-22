import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page() {
  const user = await getRequestUser();
  const canCreate = user ? can(user.permissions, "project.create") : false;
  return <div className="page-stack project-portfolio-page"><PageHeader title="Gói / Công trường" /><ProjectList canCreate={canCreate} /></div>;
}
