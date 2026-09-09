import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/settings/approval-workflows"];

export default function Page() {
  return <PlaceholderPage description={meta.description} moduleName="Quy trình duyệt" title={meta.title} />;
}
