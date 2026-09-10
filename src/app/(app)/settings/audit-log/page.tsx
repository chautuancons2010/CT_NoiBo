import { routeMetaByPath } from "@/config/routeRegistry";
import { SettingsPlaceholderPage } from "@/features/settings";

const meta = routeMetaByPath["/settings/audit-log"];

export default function Page() {
  return (
    <SettingsPlaceholderPage
      activePath="/settings/audit-log"
      description={meta.description}
      listPattern
      title={meta.title}
    />
  );
}
