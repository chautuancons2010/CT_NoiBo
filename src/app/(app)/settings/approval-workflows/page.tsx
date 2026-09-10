import { routeMetaByPath } from "@/config/routeRegistry";
import { SettingsPlaceholderPage } from "@/features/settings";

const meta = routeMetaByPath["/settings/approval-workflows"];

export default function Page() {
  return (
    <SettingsPlaceholderPage
      activePath="/settings/approval-workflows"
      description={meta.description}
      title={meta.title}
    />
  );
}
