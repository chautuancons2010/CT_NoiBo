import type { Permission } from "@/lib/auth/permissions";
import { can, createPermissionSet } from "@/lib/auth/permissions";

export type NavigationIcon =
  | "LayoutDashboard"
  | "Users"
  | "Clock3"
  | "CalendarDays"
  | "BriefcaseBusiness"
  | "ClipboardCheck"
  | "Warehouse"
  | "PackagePlus"
  | "PackageMinus"
  | "Repeat"
  | "Boxes"
  | "Ship"
  | "FileText"
  | "CheckSquare"
  | "BarChart3"
  | "UserCog"
  | "ShieldCheck"
  | "Settings"
  | "Bell"
  | "UserRound";

export interface NavigationItem {
  label: string;
  href: string;
  icon: NavigationIcon;
  requiredPermission: Permission;
  exact?: boolean;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const desktopNavigation: NavigationGroup[] = [
  {
    label: "Tổng quan",
    items: [
      {
        label: "Tổng quan",
        href: "/dashboard",
        icon: "LayoutDashboard",
        requiredPermission: "dashboard.view",
        exact: true
      }
    ]
  },
  {
    label: "Nhân sự",
    items: [
      {
        label: "Nhân viên",
        href: "/employees",
        icon: "Users",
        requiredPermission: "employee.view"
      },
      {
        label: "Chấm công",
        href: "/attendance",
        icon: "Clock3",
        requiredPermission: "attendance.view"
      },
      {
        label: "Bảng công",
        href: "/timesheets",
        icon: "CalendarDays",
        requiredPermission: "timesheet.view"
      },
      {
        label: "Ca làm",
        href: "/shifts",
        icon: "CalendarDays",
        requiredPermission: "settings.view"
      },
      {
        label: "Nghỉ phép",
        href: "/leave",
        icon: "FileText",
        requiredPermission: "leave.view"
      }
    ]
  },
  {
    label: "Dự án",
    items: [
      {
        label: "Dự án / Công trường",
        href: "/projects",
        icon: "BriefcaseBusiness",
        requiredPermission: "project.view"
      },
      {
        label: "Cập nhật dự án",
        href: "/projects/updates",
        icon: "ClipboardCheck",
        requiredPermission: "project.view"
      },
      {
        label: "Điểm danh công nhân",
        href: "/worker-attendance",
        icon: "ClipboardCheck",
        requiredPermission: "worker_attendance.view"
      }
    ]
  },
  {
    label: "Kho",
    items: [
      {
        label: "Hàng hóa",
        href: "/warehouse/items",
        icon: "Warehouse",
        requiredPermission: "warehouse.view"
      },
      {
        label: "Nhập kho",
        href: "/warehouse/receipts",
        icon: "PackagePlus",
        requiredPermission: "warehouse.view"
      },
      {
        label: "Xuất kho",
        href: "/warehouse/issues",
        icon: "PackageMinus",
        requiredPermission: "warehouse.view"
      },
      {
        label: "Chuyển kho",
        href: "/warehouse/transfers",
        icon: "Repeat",
        requiredPermission: "warehouse.view"
      },
      {
        label: "Kiểm kê",
        href: "/warehouse/inventory",
        icon: "Boxes",
        requiredPermission: "warehouse.view"
      }
    ]
  },
  {
    label: "Xuất nhập khẩu",
    items: [
      {
        label: "Lô hàng",
        href: "/import-export/shipments",
        icon: "Ship",
        requiredPermission: "import_export.view"
      },
      {
        label: "Chứng từ",
        href: "/import-export/documents",
        icon: "FileText",
        requiredPermission: "import_export.view"
      }
    ]
  },
  {
    label: "Quản lý",
    items: [
      {
        label: "Phê duyệt",
        href: "/approvals",
        icon: "CheckSquare",
        requiredPermission: "approval.view"
      },
      {
        label: "Báo cáo",
        href: "/reports",
        icon: "BarChart3",
        requiredPermission: "report.view"
      }
    ]
  },
  {
    label: "Hệ thống",
    items: [
      {
        label: "Người dùng",
        href: "/settings/users",
        icon: "UserCog",
        requiredPermission: "user.view"
      },
      {
        label: "Vai trò & Quyền",
        href: "/settings/roles",
        icon: "ShieldCheck",
        requiredPermission: "role.view"
      },
      {
        label: "Phân quyền",
        href: "/settings/permissions",
        icon: "ShieldCheck",
        requiredPermission: "permission.view"
      },
      {
        label: "Cấu hình",
        href: "/settings/organization",
        icon: "Settings",
        requiredPermission: "settings.view"
      },
      {
        label: "Tích hợp",
        href: "/settings/integrations",
        icon: "Settings",
        requiredPermission: "integration.view"
      },
      {
        label: "Audit log",
        href: "/settings/audit-log",
        icon: "FileText",
        requiredPermission: "audit.view"
      }
    ]
  }
];

export const mobileNavigation: NavigationItem[] = [
  {
    label: "Trang chủ",
    href: "/dashboard",
    icon: "LayoutDashboard",
    requiredPermission: "dashboard.view",
    exact: true
  },
  {
    label: "Chấm công",
    href: "/attendance",
    icon: "Clock3",
    requiredPermission: "attendance.view"
  },
  {
    label: "Điểm danh",
    href: "/worker-attendance",
    icon: "ClipboardCheck",
    requiredPermission: "worker_attendance.view"
  },
  {
    label: "Thông báo",
    href: "/notifications",
    icon: "Bell",
    requiredPermission: "notification.view"
  },
  {
    label: "Cá nhân",
    href: "/profile",
    icon: "UserRound",
    requiredPermission: "profile.view"
  }
];

export function filterNavigationByPermissions<T extends NavigationItem>(
  items: readonly T[],
  permissions: readonly Permission[]
): T[] {
  const permissionSet = createPermissionSet(permissions);
  return items.filter((item) => can(permissionSet, item.requiredPermission));
}

export function filterGroupsByPermissions(
  groups: readonly NavigationGroup[],
  permissions: readonly Permission[]
): NavigationGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: filterNavigationByPermissions(group.items, permissions)
    }))
    .filter((group) => group.items.length > 0);
}

export function isNavigationItemActive(
  pathname: string,
  item: Pick<NavigationItem, "href" | "exact">
): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
