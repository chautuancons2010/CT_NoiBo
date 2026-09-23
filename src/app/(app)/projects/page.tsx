import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectList } from "@/features/projects";

export default function Page() {
  return <div className="page-stack project-portfolio-page"><PageHeader title="Gói / Công trường" /><ProjectList /></div>;
}
