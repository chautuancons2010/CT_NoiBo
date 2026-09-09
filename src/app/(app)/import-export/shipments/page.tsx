import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/import-export/shipments"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Lô hàng" title={meta.title} />;
}
