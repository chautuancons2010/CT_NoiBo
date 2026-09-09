import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/warehouse/inventory"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Kiểm kê" title={meta.title} />;
}
