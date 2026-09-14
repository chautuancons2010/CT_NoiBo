import { WorkspaceView } from "@/features/workspace/WorkspaceView";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";
import { readSystemSettings } from "@/services/system-settings/systemSettingsService";

export default async function WorkspacePage() {
  const [user, settings] = await Promise.all([getRequestUser(), readSystemSettings()]);
  const authenticatedUser = requireAuthenticatedUser(user);
  const today = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeZone: settings.localization.timezone
  }).format(new Date());

  return (
    <WorkspaceView
      modules={settings.modules}
      navigation={settings.navigation}
      today={today}
      user={authenticatedUser}
    />
  );
}
