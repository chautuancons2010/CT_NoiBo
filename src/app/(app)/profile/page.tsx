import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/profile"];

export default function Page() {
  return <PlaceholderPage description={meta.description} moduleName="Cá nhân" title={meta.title} />;
}
