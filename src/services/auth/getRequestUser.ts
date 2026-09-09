import { foundationDemoUser } from "@/lib/auth/currentUser";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

export async function getRequestUser(): Promise<AuthenticatedUser | null> {
  // Supabase Auth session resolution will replace this demo user in the RBAC prompt.
  return foundationDemoUser;
}
