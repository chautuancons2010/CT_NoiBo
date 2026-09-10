import { routeMetaByPath } from "@/config/routeRegistry";
import { SettingsPlaceholderPage } from "@/features/settings";

const meta = routeMetaByPath["/settings/organization"];

export default function Page() {
  return (
    <SettingsPlaceholderPage activePath="/settings/organization" description={meta.description} title={meta.title} />
  );
}
