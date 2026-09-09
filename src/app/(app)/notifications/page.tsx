import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/notifications"];

export default function Page() {
  return <PlaceholderPage description={meta.description} moduleName="Thông báo" title={meta.title} />;
}
