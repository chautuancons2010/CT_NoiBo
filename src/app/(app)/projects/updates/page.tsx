import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/projects/updates"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Cập nhật dự án" title={meta.title} />;
}
