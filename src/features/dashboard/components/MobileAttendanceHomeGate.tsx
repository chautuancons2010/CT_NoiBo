"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { LoadingState } from "@/components/shared/States";
import { usesSupervisorPhoneHome } from "@/features/dashboard/mobileAttendanceHome";
import { useMobileViewport } from "@/lib/ui/useMobileViewport";

export function MobileAttendanceHomeGate({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const mobile = useMobileViewport();
  const router = useRouter();
  const supervisor = usesSupervisorPhoneHome(user);
  useEffect(() => {
    if (supervisor && mobile) router.replace("/personal");
  }, [supervisor, mobile, router]);
  if (supervisor && mobile !== false) return <LoadingState title="Đang mở Cá nhân" />;
  return children;
}
