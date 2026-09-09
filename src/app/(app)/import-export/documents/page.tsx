import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/import-export/documents"];

export default function Page() {
  return <PlaceholderPage description={meta.description} listPattern moduleName="Chứng từ XNK" title={meta.title} />;
}
