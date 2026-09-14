import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function InternalAppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
