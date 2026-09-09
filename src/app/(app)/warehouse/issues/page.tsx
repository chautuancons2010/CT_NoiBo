import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/warehouse/issues"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Xuất kho" title={meta.title} />;
}
