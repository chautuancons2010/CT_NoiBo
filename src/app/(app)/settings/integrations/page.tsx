import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/settings/integrations"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Tích hợp" title={meta.title} />;
}
