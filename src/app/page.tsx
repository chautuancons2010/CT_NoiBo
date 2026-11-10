import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { resolveLandingPage } from "@/features/dashboard/registry";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { readSettingsGroup } from "@/services/system-settings/systemSettingsService";
import { supervisorPhoneLanding } from "@/features/dashboard/mobileAttendanceHome";

export default async function HomePage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const mobileLanding = supervisorPhoneLanding(user, await headers());
  if (mobileLanding) redirect(mobileLanding);
  const settings = await readSettingsGroup("dashboard");
  redirect(resolveLandingPage(user, settings));
}
