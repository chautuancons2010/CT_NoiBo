import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/settings/users"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Người dùng" title={meta.title} />;
}
