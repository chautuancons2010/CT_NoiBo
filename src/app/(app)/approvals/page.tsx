import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/approvals"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Phê duyệt" title={meta.title} />;
}
