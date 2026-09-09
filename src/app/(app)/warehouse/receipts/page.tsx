import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/warehouse/receipts"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Nhập kho" title={meta.title} />;
}
