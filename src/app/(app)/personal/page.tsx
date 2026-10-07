"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarOff, CalendarRange, ChevronRight, UserRound, WalletCards } from "lucide-react";

import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { ModuleLauncher } from "@/components/shared/ModuleLauncher";
import { PersonalToday } from "@/features/attendance/components/PersonalToday";
import { WorkerAttendanceToday } from "@/features/worker-attendance/components/WorkerAttendanceHome";
import { canUseWorkerAttendance } from "@/config/mobileNavigationResolver";
import { canOpenPersonalAttendance } from "@/lib/auth/applicationAccess";
import { can } from "@/lib/auth/permissions";
import { useMobileViewport } from "@/lib/ui/useMobileViewport";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { PageHeader } from "@/components/shared/PageHeader";

export default function PersonalPage() {
  const user = useCurrentUser();
  const { settings } = useSystemSettings();
  const canViewAttendance = settings.modules.attendance && canOpenPersonalAttendance(user.permissions);
  const canReviewWorkers = canUseWorkerAttendance(user);
  const mobile = useMobileViewport();

  return (
    <div className="personal-home page-stack">
      <PageHeader title="Cá nhân" />
      <div className="personal-home__desktop-launcher"><ModuleLauncher excludePersonal /></div>
      {mobile && canReviewWorkers ? <section className="personal-home__mobile-only personal-supervisor-work" aria-label="Điểm danh công nhân"><h2>Điểm danh công nhân</h2><WorkerAttendanceToday /></section> : null}
      {canViewAttendance ? (
        <PersonalToday />
      ) : can(user.permissions, "profile.view") ? (
        <Link className="personal-home__profile" href="/profile"><UserRound aria-hidden="true" size={19} />Hồ sơ của tôi<ArrowUpRight aria-hidden="true" size={17} /></Link>
      ) : null}
      <nav aria-label="Thông tin của tôi" className="personal-home__mobile-only personal-home__links">
        {canViewAttendance ? <Link href="/attendance/history"><CalendarRange aria-hidden="true" size={20} /><span>Lịch công của tôi</span><ChevronRight aria-hidden="true" size={18} /></Link> : null}
        {can(user.permissions, "payslip.self.view") ? <Link href="/accounting/payslips?scope=self"><WalletCards aria-hidden="true" size={20} /><span>Phiếu lương của tôi</span><ChevronRight aria-hidden="true" size={18} /></Link> : null}
        {can(user.permissions, "leave.self.view") || can(user.permissions, "leave.self.create") ? <Link href="/leave"><CalendarOff aria-hidden="true" size={20} /><span>Nghỉ phép của tôi</span><ChevronRight aria-hidden="true" size={18} /></Link> : null}
      </nav>
      <div className="personal-home__mobile-only personal-home__logout"><LogoutButton /></div>
    </div>
  );
}
