import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectCreateForm } from "@/features/projects/components/ProjectCreateForm";
export default function Page() { return <div className="page-stack project-create-page"><div className="project-create-heading"><PageHeader title="Tạo gói" /></div><ProjectCreateForm /></div>; }
