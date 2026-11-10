import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Suspense } from "react";

import { PermissionDeniedState } from "@/components/shared/States";
import { hasAreaAccess } from "@/config/routeAccess";
import { DashboardAnalyticsFallback, DashboardShell, DashboardView } from "@/features/dashboard/components/DashboardView";
import { getDashboardReadModel } from "@/features/dashboard/services/dashboardService";
import { isAccountEnabled } from "@/lib/auth/permissions";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { supervisorPhoneLanding } from "@/features/dashboard/mobileAttendanceHome";

export async function DashboardPage() {
  const user = await getRequestUser();
  if (!user || !isAccountEnabled(user)) redirect("/login");
  const mobileLanding = supervisorPhoneLanding(user, await headers());
  if (mobileLanding) redirect(mobileLanding);
  if (!hasAreaAccess(user.permissions, "dashboard")) return <PermissionDeniedState />;

  return <DashboardShell>
    <Suspense fallback={<DashboardAnalyticsFallback />}>
      <DashboardAnalytics user={user} />
    </Suspense>
  </DashboardShell>;
}

async function DashboardAnalytics({ user }: { user: AuthenticatedUser }) {
  const model = await getDashboardReadModel(user);
  return <DashboardView initialModel={model} />;
}
