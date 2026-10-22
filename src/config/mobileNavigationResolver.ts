import type { NavigationIcon } from "@/config/navigation";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";

export interface MobileNavDestination {
  href: string;
  label: string;
  icon: NavigationIcon;
  exact?: boolean;
  quick?: boolean;
  slot?: number;
}

export interface MobileNavigationModel {
  mode: "personal" | "supervisor";
  label: string;
  direct: MobileNavDestination[];
  secondary: MobileNavDestination[];
}

export function canUseWorkerAttendance(user: AuthenticatedUser): boolean {
  return can(user.permissions, "worker_attendance.create");
}

export function isMobilePersonalRoute(pathname: string, user: AuthenticatedUser): boolean {
  const personalPaths = [
    "/personal", "/profile", "/messages", "/notifications",
    "/attendance/me", "/attendance/quick", "/attendance/history",
    "/attendance/requests", "/attendance/photos",
    "/leave", "/accounting/payslips"
  ];
  if (personalPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return !pathname.startsWith("/leave/manage") && !pathname.startsWith("/leave/adjustments") && !pathname.startsWith("/leave/balances");
  }
  return canUseWorkerAttendance(user) && (pathname === "/worker-attendance" || pathname.startsWith("/worker-attendance/"));
}

export function isMobileDestinationActive(pathname: string, item: MobileNavDestination, destinations: readonly MobileNavDestination[]): boolean {
  if (pathname === item.href) return true;
  if (!pathname.startsWith(`${item.href}/`)) return false;
  return !destinations.some((other) => other.href !== item.href && other.href.length > item.href.length && (pathname === other.href || pathname.startsWith(`${other.href}/`)));
}

export function activeMobileDestination(pathname: string, model: MobileNavigationModel): MobileNavDestination | undefined {
  const matching = model.direct.find((item) => isMobileDestinationActive(pathname, item, model.direct));
  if (matching) return matching;
  const historyRoute = model.mode === "personal" && pathname.startsWith("/attendance/");
  const workerRoute = model.mode === "supervisor" && (pathname === "/worker-attendance" || pathname.startsWith("/worker-attendance/"));
  return model.direct.find((item) => item.slot === (historyRoute || workerRoute ? 2 : 1));
}

export function resolveMobileNavigation(_pathname: string, user: AuthenticatedUser): MobileNavigationModel {
  const supervisor = canUseWorkerAttendance(user);
  const direct: MobileNavDestination[] = [
    { href: "/personal", label: "Cá nhân", icon: "UserRound", slot: 1 },
    supervisor
      ? { href: "/worker-attendance/today", label: "Công nhân", icon: "UsersRound", slot: 2 }
      : { href: "/attendance/history", label: "Lịch công", icon: "CalendarRange", slot: 2 },
    { href: "/attendance/quick", label: "Chấm công", icon: "Camera", quick: true, slot: 3 },
    { href: "/messages", label: "Tin nhắn", icon: "MessageCircle", slot: 4 },
    { href: "/profile", label: "Tài khoản", icon: "UserRound", slot: 5 }
  ];
  return { mode: supervisor ? "supervisor" : "personal", label: "Điều hướng cá nhân", direct, secondary: [] };
}
