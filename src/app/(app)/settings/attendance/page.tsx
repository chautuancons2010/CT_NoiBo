import { routeMetaByPath } from "@/config/routeRegistry";
import { SettingsPlaceholderPage } from "@/features/settings";

const meta = routeMetaByPath["/settings/attendance"];

export default function Page() {
  return <SettingsPlaceholderPage activePath="/settings/attendance" description={meta.description} title={meta.title} />;
}
