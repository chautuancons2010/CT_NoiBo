import {
  type AuthenticatedUser,
  allFoundationPermissions
} from "@/lib/auth/permissions";

export const foundationDemoUser: AuthenticatedUser = {
  id: "demo-admin",
  displayName: "Quản trị nền tảng",
  email: "admin@chautuan.local",
  status: "active",
  permissions: allFoundationPermissions
};
