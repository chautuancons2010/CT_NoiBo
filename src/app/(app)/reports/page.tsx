import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/reports"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Báo cáo" title={meta.title} />;
}
