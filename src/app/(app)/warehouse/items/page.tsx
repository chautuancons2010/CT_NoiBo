import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/warehouse/items"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Hàng hóa" title={meta.title} />;
}
