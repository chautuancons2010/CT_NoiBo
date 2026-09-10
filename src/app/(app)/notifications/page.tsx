import { PageHeader } from "@/components/shared/PageHeader";
import { routeMetaByPath } from "@/config/routeRegistry";
import { NotificationPanel } from "@/features/foundation";

const meta = routeMetaByPath["/notifications"];

export default function Page() {
  return (
    <div className="page-stack">
      <PageHeader description={meta.description} title={meta.title} />
      <NotificationPanel />
    </div>
  );
}
