import { routeMetaByPath } from "@/config/routeRegistry";
import { SettingsPlaceholderPage } from "@/features/settings";

const meta = routeMetaByPath["/settings/export-templates"];

export default function Page() {
  return (
    <SettingsPlaceholderPage
      activePath="/settings/export-templates"
      description={meta.description}
      listPattern
      title={meta.title}
    />
  );
}
