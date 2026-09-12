export interface RouteMeta {
  title: string;
  description: string;
  module: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const routeMetaByPath: Record<string, RouteMeta> = {
  "/dashboard": {
    title: "Tổng quan",
    description: "Các việc cần theo dõi trong ngày và trạng thái nền tảng.",
    module: "Tổng quan"
  },
  "/employees": {
    title: "Nhân viên",
    description: "Nền tảng quản lý hồ sơ nhân sự, tài khoản liên kết và lịch sử thay đổi.",
    module: "Nhân sự"
  },
  "/employees/new": {
    title: "Tạo hồ sơ nhân viên",
    description: "Route riêng cho form dài; nghiệp vụ chi tiết sẽ triển khai ở prompt Nhân sự.",
    module: "Nhân sự"
  },
  "/attendance": {
    title: "Chấm công",
    description: "Nền tảng chấm công cá nhân qua mobile, GPS, ảnh và trạng thái đồng bộ.",
    module: "Nhân sự"
  },
  "/attendance/history": {
    title: "Lịch sử chấm công",
    description: "",
    module: "Nhân sự"
  },
  "/attendance/records": {
    title: "Kiểm tra chấm công",
    description: "",
    module: "Nhân sự"
  },
  "/timesheets": {
    title: "Bảng công",
    description: "Tầng tổng hợp dữ liệu công từ chấm công, điểm danh, đơn nghỉ và điều chỉnh.",
    module: "Nhân sự"
  },
  "/timesheets/exceptions": { title: "Ngoại lệ bảng công", description: "", module: "Nhân sự" },
  "/timesheets/adjustments": { title: "Điều chỉnh bảng công", description: "", module: "Nhân sự" },
  "/shifts": {
    title: "Ca làm",
    description: "Cấu hình ca làm và chính sách liên quan sẽ nằm trong dữ liệu cấu hình.",
    module: "Nhân sự"
  },
  "/leave": {
    title: "Nghỉ phép",
    description: "Nền tảng route cho đơn từ, phê duyệt và xuất PDF ở bước sau.",
    module: "Nhân sự"
  },
  "/projects": {
    title: "Dự án / Công trường",
    description: "Quản lý project, worksite, phân công và roster theo cấu trúc mở rộng.",
    module: "Dự án"
  },
  "/projects/updates": {
    title: "Cập nhật dự án",
    description: "Kênh cập nhật tình hình dự án, hình ảnh và lịch sử theo công trường.",
    module: "Dự án"
  },
  "/project-monitoring": {
    title: "Theo dõi dự án",
    description: "",
    module: "Dự án"
  },
  "/project-monitoring/issues": {
    title: "Trung tâm vấn đề",
    description: "",
    module: "Dự án"
  },
  "/project-monitoring/recent": {
    title: "Cập nhật gần đây",
    description: "",
    module: "Dự án"
  },
  "/worker-attendance": {
    title: "Điểm danh công nhân",
    description: "",
    module: "Dự án"
  },
  "/warehouse/items": {
    title: "Hàng hóa",
    description: "Danh mục hàng hóa dùng chung cho nhập, xuất, chuyển và kiểm kê.",
    module: "Kho"
  },
  "/warehouse/receipts": {
    title: "Nhập kho",
    description: "Route nghiệp vụ nhập kho, chứng từ và audit sẽ triển khai ở module Kho.",
    module: "Kho"
  },
  "/warehouse/issues": {
    title: "Xuất kho",
    description: "Route nghiệp vụ xuất kho có kiểm quyền và audit.",
    module: "Kho"
  },
  "/warehouse/transfers": {
    title: "Chuyển kho",
    description: "Route nghiệp vụ chuyển kho giữa các địa điểm.",
    module: "Kho"
  },
  "/warehouse/inventory": {
    title: "Kiểm kê",
    description: "Route kiểm kê và đối chiếu tồn kho.",
    module: "Kho"
  },
  "/import-export/shipments": {
    title: "Lô hàng",
    description: "Nền tảng quản lý shipment, container, ETA/ETD và liên kết nhập kho.",
    module: "Xuất nhập khẩu"
  },
  "/import-export/documents": {
    title: "Chứng từ XNK",
    description: "Quản lý metadata chứng từ và file lưu trữ private.",
    module: "Xuất nhập khẩu"
  },
  "/approvals": {
    title: "Phê duyệt",
    description: "Hàng đợi phê duyệt dùng chung cho đơn từ và nghiệp vụ phát sinh.",
    module: "Quản lý"
  },
  "/reports": {
    title: "Báo cáo",
    description: "Nền tảng báo cáo, export Excel/PDF và tích hợp BI.",
    module: "Quản lý"
  },
  "/settings/users": {
    title: "Người dùng",
    description: "Tài khoản đăng nhập tách biệt với hồ sơ nhân sự.",
    module: "Hệ thống"
  },
  "/settings/organization": {
    title: "Cấu hình tổ chức",
    description: "Cấu hình doanh nghiệp và các dữ liệu nền tảng.",
    module: "Hệ thống"
  },
  "/settings/attendance": {
    title: "Cấu hình chấm công",
    description: "Extension point cho ca làm, GPS, ngày công và policy.",
    module: "Hệ thống"
  },
  "/settings/attendance/locations": {
    title: "Địa điểm chấm công",
    description: "",
    module: "Hệ thống"
  },
  "/settings/attendance/shifts": { title: "Ca làm", description: "", module: "Hệ thống" },
  "/settings/attendance/calendar": { title: "Lịch làm việc", description: "", module: "Hệ thống" },
  "/settings/attendance/policies": { title: "Chính sách chấm công", description: "", module: "Hệ thống" },
  "/settings/roles": {
    title: "Vai trò",
    description: "Role là gói permission, không phải điều kiện hard-code trong UI.",
    module: "Hệ thống"
  },
  "/settings/permissions": {
    title: "Quyền",
    description: "Nền tảng effective permission cho UI và API.",
    module: "Hệ thống"
  },
  "/settings/approval-workflows": {
    title: "Quy trình duyệt",
    description: "Cấu hình workflow phê duyệt theo nghiệp vụ.",
    module: "Hệ thống"
  },
  "/settings/export-templates": {
    title: "Mẫu xuất dữ liệu",
    description: "Cấu hình template Excel/PDF dùng chung.",
    module: "Hệ thống"
  },
  "/settings/integrations": {
    title: "Tích hợp",
    description: "API key, webhook và kết nối hệ thống bên ngoài.",
    module: "Hệ thống"
  },
  "/settings/audit-log": {
    title: "Audit log",
    description: "Theo dõi thay đổi quan trọng theo actor, entity, before/after và lý do.",
    module: "Hệ thống"
  },
  "/system-admin/branding": { title: "Thương hiệu", description: "", module: "Trung tâm quản trị" },
  "/system-admin/appearance": { title: "Giao diện", description: "", module: "Trung tâm quản trị" },
  "/system-admin/navigation": { title: "Điều hướng", description: "", module: "Trung tâm quản trị" },
  "/system-admin/modules": { title: "Module", description: "", module: "Trung tâm quản trị" },
  "/system-admin/organization": { title: "Tổ chức", description: "", module: "Trung tâm quản trị" },
  "/system-admin/localization": { title: "Định dạng & thời gian", description: "", module: "Trung tâm quản trị" },
  "/system-admin/security": { title: "Bảo mật", description: "", module: "Trung tâm quản trị" },
  "/system-admin/config-history": { title: "Lịch sử cấu hình", description: "", module: "Trung tâm quản trị" },
  "/system-admin/audit": { title: "Audit log", description: "", module: "Trung tâm quản trị" },
  "/notifications": {
    title: "Thông báo",
    description: "Route mobile cho thông báo nghiệp vụ và trạng thái đồng bộ.",
    module: "Cá nhân"
  },
  "/profile": {
    title: "Cá nhân",
    description: "Thông tin tài khoản, phiên đăng nhập và thiết lập cá nhân.",
    module: "Cá nhân"
  }
};

const employeeSectionLabels: Record<string, string> = {
  profile: "Hồ sơ",
  employment: "Công việc",
  contracts: "Hợp đồng",
  documents: "Tài liệu",
  history: "Lịch sử",
  leave: "Nghỉ phép",
  account: "Tài khoản"
};

const projectSectionLabels: Record<string, string> = {
  overview: "Tổng quan",
  updates: "Cập nhật",
  team: "Nhân sự",
  schedule: "Lịch",
  "worker-attendance": "Điểm danh",
  documents: "Tài liệu",
  history: "Lịch sử"
};

function getEmployeeSectionLabel(section: string) {
  return section === "edit" ? "Chỉnh sửa" : employeeSectionLabels[section] ?? "Chi tiết";
}

export function getRouteMeta(pathname: string): RouteMeta {
  const exact = routeMetaByPath[pathname];
  if (exact) {
    return exact;
  }

  {
    const employeeTimesheet = pathname.match(/^\/timesheets\/periods\/([^/]+)\/employees\/([^/]+)$/);
    if (employeeTimesheet) return { title: "Công nhân viên", description: "", module: "Nhân sự" };
    const periodTimesheet = pathname.match(/^\/timesheets\/periods\/([^/]+)$/);
    if (periodTimesheet) return { title: "Chi tiết kỳ công", description: "", module: "Nhân sự" };
  }

  const employeeMatch = pathname.match(/^\/employees\/([^/]+)\/([^/]+)$/);
  if (employeeMatch) {
    const section = getEmployeeSectionLabel(employeeMatch[2]);
    return {
      title: `Nhân viên ${employeeMatch[1]} · ${section}`,
      description: "Route-backed tab cho hồ sơ nhân viên, giữ đúng URL khi refresh.",
      module: "Nhân sự"
    };
  }

  const projectUpdateMatch = pathname.match(/^\/projects\/([^/]+)\/updates\/(new|[^/]+)$/);
  if (projectUpdateMatch) {
    return { title: projectUpdateMatch[2] === "new" ? "Cập nhật dự án" : "Chi tiết cập nhật", description: "", module: "Dự án" };
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/([^/]+)$/);
  if (projectMatch) {
    const section = projectSectionLabels[projectMatch[2]] ?? "Chi tiết";
    return {
      title: `Dự án ${projectMatch[1]} · ${section}`,
      description: "Route-backed tab cho dự án/công trường.",
      module: "Dự án"
    };
  }

  return {
    title: "Không tìm thấy",
    description: "Đường dẫn không tồn tại hoặc chưa được cấp quyền.",
    module: "Hệ thống"
  };
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/dashboard") {
    return [{ label: "Tổng quan" }];
  }

  const employeeMatch = pathname.match(/^\/employees\/([^/]+)\/([^/]+)$/);
  if (employeeMatch) {
    return [
      { label: "Nhân sự", href: "/employees" },
      { label: employeeMatch[1], href: `/employees/${employeeMatch[1]}/profile` },
      { label: getEmployeeSectionLabel(employeeMatch[2]) }
    ];
  }

  const projectUpdateMatch = pathname.match(/^\/projects\/([^/]+)\/updates\/(new|[^/]+)$/);
  if (projectUpdateMatch) {
    return [{ label: "Dự án", href: "/projects" }, { label: projectUpdateMatch[1], href: `/projects/${projectUpdateMatch[1]}/overview` }, { label: "Cập nhật", href: `/projects/${projectUpdateMatch[1]}/updates` }, { label: projectUpdateMatch[2] === "new" ? "Tạo mới" : "Chi tiết" }];
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/([^/]+)$/);
  if (projectMatch) {
    return [
      { label: "Dự án", href: "/projects" },
      { label: projectMatch[1], href: `/projects/${projectMatch[1]}/overview` },
      { label: projectSectionLabels[projectMatch[2]] ?? "Chi tiết" }
    ];
  }

  const meta = getRouteMeta(pathname);
  if (meta.module === meta.title) {
    return [{ label: meta.title }];
  }

  return [{ label: meta.module }, { label: meta.title }];
}

export const employeeDetailSections = Object.entries(employeeSectionLabels).map(
  ([value, label]) => ({ value, label })
);

export const projectDetailSections = Object.entries(projectSectionLabels).map(
  ([value, label]) => ({ value, label })
);
