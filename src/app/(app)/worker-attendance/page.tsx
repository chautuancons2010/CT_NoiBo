import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/worker-attendance"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Điểm danh công nhân" title={meta.title} />;
}
