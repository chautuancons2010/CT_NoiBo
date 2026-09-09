import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/settings/roles"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Vai trò" title={meta.title} />;
}
