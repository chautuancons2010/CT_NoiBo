import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { resolveRequestUser } from "@/services/auth/sessionService";

export async function getRequestUser(): Promise<AuthenticatedUser | null> {
  return resolveRequestUser();
}
