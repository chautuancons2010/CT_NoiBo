import { routeMetaByPath } from "@/config/routeRegistry";
import { PlaceholderPage } from "@/features/foundation/pages/PlaceholderPage";

const meta = routeMetaByPath["/employees"];

export default function Page() {
  return (
    <PlaceholderPage
      description={meta.description}
      listPattern
      moduleName="Nhân viên"
      primaryActionLabel="Tạo hồ sơ"
      title={meta.title}
    />
  );
}
