import { redirect } from "next/navigation";

import { resolveLandingPage } from "@/features/dashboard/registry";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";
import { readSettingsGroup } from "@/services/system-settings/systemSettingsService";

export default async function HomePage() {
  const [user, settings] = await Promise.all([getRequestUser(), readSettingsGroup("dashboard")]);
  redirect(resolveLandingPage(requireAuthenticatedUser(user), settings));
}
