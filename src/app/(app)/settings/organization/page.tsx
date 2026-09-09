import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/settings/organization"];

export default function Page() {
  return <PlaceholderPage description={meta.description} moduleName="Cấu hình tổ chức" title={meta.title} />;
}
