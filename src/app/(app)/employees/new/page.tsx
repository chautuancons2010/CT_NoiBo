import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/employees/new"];

export default function Page() {
  return <PlaceholderPage description={meta.description} moduleName="Tạo hồ sơ nhân viên" title={meta.title} />;
}
