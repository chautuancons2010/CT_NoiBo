import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/attendance"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Chấm công" title={meta.title} />;
}
