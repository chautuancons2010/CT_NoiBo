import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/settings/permissions"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Quyền" title={meta.title} />;
}
