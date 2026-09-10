import { routeMetaByPath } from "@/config/routeRegistry";
import { SettingsPlaceholderPage } from "@/features/settings";

const meta = routeMetaByPath["/settings/roles"];

export default function Page() {
  return (
    <SettingsPlaceholderPage
      activePath="/settings/roles"
      description={meta.description}
      listPattern
      title={meta.title}
    />
  );
}
