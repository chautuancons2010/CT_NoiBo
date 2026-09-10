import { routeMetaByPath } from "@/config/routeRegistry";
import { SettingsPlaceholderPage } from "@/features/settings";

const meta = routeMetaByPath["/settings/users"];

export default function Page() {
  return (
    <SettingsPlaceholderPage
      activePath="/settings/users"
      description={meta.description}
      listPattern
      title={meta.title}
    />
  );
}
