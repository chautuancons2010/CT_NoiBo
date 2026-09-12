import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectList } from "@/features/projects";

export default function Page() {
  return <div className="page-stack"><PageHeader title="Dự án / Công trường" /><ProjectList /></div>;
}
