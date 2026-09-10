import { routeMetaByPath } from "@/config/routeRegistry";
import { SettingsPlaceholderPage } from "@/features/settings";

const meta = routeMetaByPath["/settings/permissions"];

export default function Page() {
  return (
    <SettingsPlaceholderPage
      activePath="/settings/permissions"
      description={meta.description}
      listPattern
      title={meta.title}
    />
  );
}
