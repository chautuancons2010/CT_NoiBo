import { routeMetaByPath } from "@/config/routeRegistry";
import { SettingsPlaceholderPage } from "@/features/settings";

const meta = routeMetaByPath["/settings/integrations"];

export default function Page() {
  return (
    <SettingsPlaceholderPage
      activePath="/settings/integrations"
      description={meta.description}
      listPattern
      title={meta.title}
    />
  );
}
