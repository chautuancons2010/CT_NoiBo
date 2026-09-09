import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/timesheets"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Bảng công" title={meta.title} />;
}
