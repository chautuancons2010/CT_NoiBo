import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/settings/audit-log"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Audit log" title={meta.title} />;
}
