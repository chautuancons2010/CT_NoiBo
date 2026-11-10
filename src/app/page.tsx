import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { resolveLandingPage } from "@/features/dashboard/registry";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { readSettingsGroup } from "@/services/system-settings/systemSettingsService";
import { supervisorPhoneLanding } from "@/features/dashboard/mobileAttendanceHome";
import { publicTesterAccess } from "@/lib/testing/policy.mjs";

export default async function HomePage() {
  const user = await getRequestUser();
  if (!user) redirect(publicTesterAccess() ? "/testing" : "/login");
  const mobileLanding = supervisorPhoneLanding(user, await headers());
  if (mobileLanding) redirect(mobileLanding);
  const settings = await readSettingsGroup("dashboard");
  redirect(resolveLandingPage(user, settings));
}
