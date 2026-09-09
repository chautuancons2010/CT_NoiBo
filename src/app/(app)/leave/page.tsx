import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/leave"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Nghỉ phép" title={meta.title} />;
}
