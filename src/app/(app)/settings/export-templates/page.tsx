import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/settings/export-templates"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Mẫu xuất dữ liệu" title={meta.title} />;
}
