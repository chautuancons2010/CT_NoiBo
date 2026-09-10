import { PageHeader } from "@/components/shared/PageHeader";
import { routeMetaByPath } from "@/config/routeRegistry";
import { ProjectUpdateTimeline } from "@/features/projects";

const meta = routeMetaByPath["/projects/updates"];

export default function Page() {
  return (
    <div className="page-stack">
      <PageHeader description={meta.description} title={meta.title} />
      <ProjectUpdateTimeline />
    </div>
  );
}
