import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { defaultDashboardSettings, resolveDashboardProfile } from "./registry";

export function usesSupervisorPhoneHome(user: AuthenticatedUser) {
  return resolveDashboardProfile(user, defaultDashboardSettings) === "supervisor";
}

// This changes a presentation destination only; authorization still happens in
// the page and API. The viewport gate covers narrow desktop browser windows.
export function isPhoneRequest(requestHeaders: Pick<Headers, "get">) {
  const mobileHint = requestHeaders.get("sec-ch-ua-mobile");
  if (mobileHint === "?1") return true;
  return /iPhone|iPod|Android[^\n]*Mobile/i.test(requestHeaders.get("user-agent") ?? "");
}

export function supervisorPhoneLanding(user: AuthenticatedUser, requestHeaders: Pick<Headers, "get">) {
  return usesSupervisorPhoneHome(user) && isPhoneRequest(requestHeaders) ? "/personal" : undefined;
}
