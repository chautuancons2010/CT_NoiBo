import { redirect } from "next/navigation";
import { visibleApplications } from "@/config/moduleRegistry";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page() {
  const user = await getRequestUser();
  const target = user ? visibleApplications(user).find((application) => application.id === "human-resources")?.defaultRoute : undefined;
  redirect(target ?? "/dashboard");
}
