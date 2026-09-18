import type { Permission } from "@/lib/auth/permissions";
import { can, createPermissionSet } from "@/lib/auth/permissions";
import { isPathEnabled, type ModuleSettings, type NavigationSettings } from "@/config/systemSettings";

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
  | "UserRound"
  | "WalletCards"
  | "MessageCircle";

export interface NavigationItem {
  label: string;
  href: string;
  icon: NavigationIcon;
  requiredPermission: Permission;
  alternativePermission?: Permission;
  alternativePermissions?: readonly Permission[];
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
        label: "Dashboard",
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
        requiredPermission: "employee.view",
        exact: true
      },
      {
        label: "Phòng ban",
        href: "/employees/departments",
        icon: "Users",
        requiredPermission: "employee.view",
        alternativePermission: "department.manage"
      },
      {
        label: "Chức vụ",
        href: "/employees/positions",
        icon: "UserCog",
        requiredPermission: "employee.view",
        alternativePermission: "position.manage"
      },
      {
        label: "Hợp đồng",
        href: "/employees/contracts",
        icon: "FileText",
        requiredPermission: "contract.view"
      },
      {
        label: "Bảo hiểm xã hội",
        href: "/employees/insurance",
        icon: "ShieldCheck",
        requiredPermission: "insurance.view"
      },
      {
        label: "Chấm công hôm nay",
        href: "/attendance/today",
        icon: "Clock3",
        requiredPermission: "attendance.view_all",
        alternativePermission: "attendance.manage"
      },
      {
        label: "Bảng công",
        href: "/timesheets/matrix",
        icon: "CalendarDays",
        requiredPermission: "timesheet.view",
        alternativePermissions: ["attendance.view_all", "attendance.period.manage"]
      },
      {
        label: "Kỳ công",
        href: "/timesheets",
        icon: "CalendarDays",
        requiredPermission: "timesheet.view",
        alternativePermissions: ["attendance.view_all", "attendance.period.manage"],
        exact: true
      },
      {
        label: "Ca làm",
        href: "/shifts",
        icon: "CalendarDays",
        requiredPermission: "shift.view"
      },
      {
        label: "Nghỉ phép",
        href: "/leave/manage",
        icon: "FileText",
        requiredPermission: "leave.view_all"
      },
      {
        label: "Điều chỉnh công",
        href: "/timesheets/adjustments",
        icon: "ClipboardCheck",
        requiredPermission: "timesheet.adjust",
        alternativePermissions: ["attendance.adjust", "attendance.manage", "attendance.view_all"]
      },
      {
        label: "Nhật ký công",
        href: "/attendance/logs",
        icon: "Clock3",
        requiredPermission: "attendance.log.view",
        alternativePermission: "attendance.view_all"
      },
      {
        label: "Lịch làm việc",
        href: "/shifts/calendar",
        icon: "CalendarDays",
        requiredPermission: "shift.view"
      }
    ]
  },
  {
    label: "Chấm công",
    items: [
      {
        label: "Hôm nay",
        href: "/attendance/me",
        icon: "Clock3",
        requiredPermission: "attendance.self",
        alternativePermissions: ["attendance.self.view", "attendance.self.create"]
      },
      {
        label: "Lịch công của tôi",
        href: "/attendance/history",
        icon: "CalendarDays",
        requiredPermission: "attendance.self.view",
        alternativePermission: "attendance.self_history"
      },
      {
        label: "Đơn của tôi",
        href: "/attendance/requests",
        icon: "FileText",
        requiredPermission: "attendance.self",
        alternativePermission: "attendance.self_request"
      },
      {
        label: "Thông báo",
        href: "/attendance/notifications",
        icon: "Bell",
        requiredPermission: "attendance.self",
        alternativePermissions: ["attendance.self.view", "attendance.self.create", "attendance.self_history", "attendance.self_request"]
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
        requiredPermission: "project.view",
        exact: true
      },
      {
        label: "Cập nhật dự án",
        href: "/projects/updates",
        icon: "ClipboardCheck",
        requiredPermission: "project.view"
      },
      {
        label: "Theo dõi dự án",
        href: "/project-monitoring",
        icon: "BarChart3",
        requiredPermission: "project_monitoring.view"
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
        label: "Tồn kho",
        href: "/warehouse/inventory",
        icon: "Boxes",
        requiredPermission: "warehouse.view"
      },
      {
        label: "Hàng hóa",
        href: "/warehouse/items",
        icon: "Warehouse",
        requiredPermission: "warehouse.item.view"
      },
      {
        label: "Nhập kho",
        href: "/warehouse/receipts",
        icon: "PackagePlus",
        requiredPermission: "warehouse.receipt.view"
      },
      {
        label: "Xuất kho",
        href: "/warehouse/issues",
        icon: "PackageMinus",
        requiredPermission: "warehouse.issue.view"
      },
      {
        label: "Chuyển kho",
        href: "/warehouse/transfers",
        icon: "Repeat",
        requiredPermission: "warehouse.transfer.view"
      },
      {
        label: "Kho hàng",
        href: "/warehouse/warehouses",
        icon: "Warehouse",
        requiredPermission: "warehouse.view"
      },
      {
        label: "Điều chỉnh tồn",
        href: "/warehouse/adjustments",
        icon: "FileText",
        requiredPermission: "warehouse.adjustment.view"
      },
      {
        label: "Kiểm kê",
        href: "/warehouse/stock-counts",
        icon: "ClipboardCheck",
        requiredPermission: "warehouse.stock_count.view"
      },
      {
        label: "Sổ kho",
        href: "/warehouse/ledger",
        icon: "FileText",
        requiredPermission: "warehouse.ledger.view"
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
        requiredPermission: "shipment.view"
      },
      {
        label: "Vận chuyển",
        href: "/import-export/transport",
        icon: "Ship",
        requiredPermission: "shipment.view"
      },
      {
        label: "Hợp đồng mua hàng",
        href: "/import-export/contracts",
        icon: "FileText",
        requiredPermission: "import_contract.view"
      },
      {
        label: "Chứng từ",
        href: "/import-export/documents",
        icon: "FileText",
        requiredPermission: "shipment_document.view"
      },
      {
        label: "Thông quan",
        href: "/import-export/customs",
        icon: "CheckSquare",
        requiredPermission: "customs.view"
      },
      {
        label: "Đối tác",
        href: "/import-export/partners",
        icon: "Users",
        requiredPermission: "partner.view"
      }
    ]
  },
  {
    label: "Kế toán",
    items: [
      { label: "Tổng quan kế toán", href: "/accounting", icon: "LayoutDashboard", requiredPermission: "accounting.access", exact: true },
      { label: "Hồ sơ lương", href: "/accounting/salaries", icon: "WalletCards", requiredPermission: "salary.view" },
      { label: "Bảng lương", href: "/accounting/payroll", icon: "FileText", requiredPermission: "payroll.view" },
      { label: "Phiếu lương", href: "/accounting/payslips", icon: "WalletCards", requiredPermission: "payslip.self.view" },
      { label: "Nhật ký lương", href: "/accounting/salary-history", icon: "FileText", requiredPermission: "salary.history.view" }
    ]
  },
  {
    label: "Tin nhắn",
    items: [
      { label: "Hội thoại", href: "/messages", icon: "MessageCircle", requiredPermission: "chat.access" }
    ]
  },
  {
    label: "Quản lý",
    items: [
      {
        label: "Phê duyệt",
        href: "/approvals",
        icon: "CheckSquare",
        requiredPermission: "approval.inbox.view"
      },
      {
        label: "Tài liệu",
        href: "/documents",
        icon: "FileText",
        requiredPermission: "document.view"
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
        label: "Cấu hình nghiệp vụ",
        href: "/settings",
        icon: "Settings",
        requiredPermission: "settings.view",
        exact: true
      },
      {
        label: "Người dùng",
        href: "/settings/users",
        icon: "UserCog",
        requiredPermission: "user.view"
      },
      {
        label: "Vai trò & phân quyền",
        href: "/settings/roles",
        icon: "ShieldCheck",
        requiredPermission: "role.view"
      },
      {
        label: "Trung tâm quản trị",
        href: "/system-admin",
        icon: "Settings",
        requiredPermission: "system_admin.access"
      },
      {
        label: "Tích hợp",
        href: "/settings/integrations",
        icon: "Settings",
        requiredPermission: "integration.view"
      },
      {
        label: "Cấu hình kho",
        href: "/settings/warehouse",
        icon: "Warehouse",
        requiredPermission: "warehouse.master.manage"
      },
      {
        label: "Cấu hình XNK",
        href: "/settings/import-export",
        icon: "Ship",
        requiredPermission: "module.manage"
      },
      {
        label: "Nhật ký hệ thống",
        href: "/settings/audit-log",
        icon: "FileText",
        requiredPermission: "audit.view"
      }
    ]
  }
];

export const mobileNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    requiredPermission: "dashboard.view",
    exact: true
  },
  {
    label: "Chấm công",
    href: "/attendance",
    icon: "Clock3",
    requiredPermission: "attendance.self"
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
  return items.filter((item) => can(permissionSet, item.requiredPermission)
    || Boolean(item.alternativePermission && can(permissionSet, item.alternativePermission))
    || Boolean(item.alternativePermissions?.some((permission) => can(permissionSet, permission))));
}

export function filterGroupsByPermissions(
  groups: readonly NavigationGroup[],
  permissions: readonly Permission[]
): NavigationGroup[] {
  return filterGroupsByAccess(groups, permissions);
}

export function filterGroupsByAccess(
  groups: readonly NavigationGroup[],
  permissions: readonly Permission[],
  modules?: ModuleSettings,
  navigation?: NavigationSettings
): NavigationGroup[] {
  const order = new Map<string, number>(navigation?.itemOrder.map((href, index) => [href, index]) ?? []);
  const hidden = new Set<string>(navigation?.hiddenItems ?? []);
  return groups
    .map((group) => ({
      ...group,
      items: filterNavigationByPermissions(group.items, permissions)
        .filter((item) => !modules || isPathEnabled(item.href, modules))
        .filter((item) => !hidden.has(item.href))
        .sort((first, second) => (order.get(first.href) ?? 999) - (order.get(second.href) ?? 999))
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
