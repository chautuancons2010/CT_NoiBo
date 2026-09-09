import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/shifts"];

export default function Page() {
  return <PlaceholderPage description={meta.description} moduleName="Ca làm" title={meta.title} />;
}
