import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/warehouse/transfers"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Chuyển kho" title={meta.title} />;
}
