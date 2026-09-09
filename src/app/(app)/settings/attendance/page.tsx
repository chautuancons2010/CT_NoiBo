import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/settings/attendance"];

export default function Page() {
  return <PlaceholderPage description={meta.description} moduleName="Cấu hình chấm công" title={meta.title} />;
}
