import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/projects"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Dự án" title={meta.title} />;
}
