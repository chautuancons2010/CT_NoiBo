import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, BriefcaseBusiness, FileText, ShieldCheck } from "lucide-react";

import { employeeDetailSections } from "@/config/routeRegistry";
import { Avatar } from "@/components/shared/Avatar";
import { Card } from "@/components/shared/Card";
import { EmptyState, PermissionDeniedState } from "@/components/shared/States";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge, type StatusBadgeTone } from "@/components/shared/StatusBadge";
import { Tabs } from "@/components/shared/Tabs";
import { can, type AccountStatus, type Permission } from "@/lib/auth/permissions";
import { buildInternalFileUrl } from "@/services/storage/storageService";
import { EmployeePicker } from "@/features/employees/components/EmployeePicker";
import { EmployeeAccountActions } from "@/features/employees/components/EmployeeAccountActions";
import { EmployeeSensitiveEdit } from "@/features/employees/components/EmployeeSensitiveEdit";
import {
  contractStatusLabels,
  documentTypeLabels,
  employeeProfileStatusLabels,
  getEmployeeContracts,
  getEmployeeDetail,
  getEmployeeDocuments,
  getEmployeeHistory,
  getEmployeePickerOptions,
  historyEventLabels,
  maskSensitiveValue
} from "@/features/employees/services/employeeService";
import type { EmployeeDataSet } from "@/features/employees/services/employeeService";
import { getEmployeeDataSetAsync } from "@/features/employees/services/employeeRepository";
import type { EmployeeDetail, EmployeeHistoryEvent } from "@/features/employees/types";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { roleCatalog } from "@/services/authorization/rbacService";
import { EmployeeLeavePanel } from "@/features/leave/components/EmployeeLeavePanel";

export interface EmployeeDetailPageProps {
  employeeId: string;
  section: string;
}

const accountStatusLabels: Record<AccountStatus, string> = {
  pending_activation: "Chờ kích hoạt",
  active: "Đang hoạt động",
  disabled: "Vô hiệu hóa",
  locked: "Bị khóa",
  invited: "Đã mời"
};

const accountStatusTones: Record<AccountStatus, StatusBadgeTone> = {
  pending_activation: "warning",
  active: "success",
  disabled: "error",
  locked: "error",
  invited: "info"
};

function valueOrEmpty(value?: string | number): string {
  if (value === undefined || value === null || value === "") {
    return "Chưa có";
  }

  return String(value);
}

function formatDate(value?: string): string {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00.000Z`));
}

function FieldList({
  items
}: {
  items: Array<{ label: string; value?: string | number; sensitive?: boolean }>;
}) {
  return (
    <dl className="detail-field-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>
            {valueOrEmpty(item.value)}
            {item.sensitive ? <span className="sensitive-dot">Nhạy cảm</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EmployeeProfileTab({ detail, permissions }: { detail: EmployeeDetail; permissions: readonly Permission[] }) {
  const sensitive = detail.sensitive;

  return (
    <div className="content-grid content-grid--two">
      <Card>
        <h2 className="section-title">Thông tin cơ bản</h2>
        <FieldList
          items={[
            { label: "Mã nhân viên", value: detail.profile.employeeCode },
            { label: "Họ và tên", value: detail.profile.fullName },
            { label: "Tên hiển thị", value: detail.profile.displayName },
            { label: "Ngày sinh", value: formatDate(detail.profile.dateOfBirth) },
            { label: "Hồ sơ", value: employeeProfileStatusLabels[detail.profile.profileStatus] },
            { label: "Hoàn thành", value: `${detail.profile.profileCompleteness}%` }
          ]}
        />
        <div className="profile-completeness" aria-label="Mức độ hoàn thiện hồ sơ">
          <span style={{ width: `${detail.profile.profileCompleteness}%` }} />
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Liên hệ</h2>
        <FieldList
          items={[
            { label: "Số điện thoại", value: detail.profile.personalPhone },
            { label: "Email cá nhân", value: detail.profile.personalEmail },
            { label: "Email công ty", value: detail.profile.companyEmail },
            { label: "Địa chỉ hiện tại", value: detail.profile.currentAddress },
            { label: "Địa chỉ thường trú", value: detail.profile.permanentAddress },
            { label: "Tỉnh/Thành", value: detail.profile.province },
            { label: "Quốc gia", value: detail.profile.country }
          ]}
        />
      </Card>

      <Card>
        <header className="panel-header">
          <div>
            <h2>CCCD, ngân hàng, thuế/BHXH</h2>
          </div>
          <StatusBadge tone={sensitive.allowed ? "success" : "warning"}>
            <ShieldCheck aria-hidden="true" size={14} />
            {sensitive.allowed ? "Có quyền" : "Bị giới hạn"}
          </StatusBadge>
          {sensitive.allowed && can(permissions, "employee.edit_sensitive") ? (
            <EmployeeSensitiveEdit employeeId={detail.profile.id} profile={sensitive} />
          ) : null}
        </header>
        {sensitive.allowed ? (
          <FieldList
            items={[
              { label: "Số CCCD", value: maskSensitiveValue(sensitive.nationalIdNumber), sensitive: true },
              { label: "Ngày cấp", value: formatDate(sensitive.nationalIdIssuedDate), sensitive: true },
              { label: "Nơi cấp", value: sensitive.nationalIdIssuedPlace, sensitive: true },
              { label: "Ngày hết hạn", value: formatDate(sensitive.nationalIdExpiryDate), sensitive: true },
              { label: "Ngân hàng", value: sensitive.bankName, sensitive: true },
              { label: "Số tài khoản", value: maskSensitiveValue(sensitive.bankAccountNumber), sensitive: true },
              { label: "Chủ tài khoản", value: sensitive.bankAccountHolder, sensitive: true },
              { label: "Mã số thuế", value: maskSensitiveValue(sensitive.personalTaxCode), sensitive: true },
              { label: "Mã BHXH", value: maskSensitiveValue(sensitive.socialInsuranceCode), sensitive: true }
            ]}
          />
        ) : (
          <PermissionDeniedState />
        )}
      </Card>

      <Card>
        <h2 className="section-title">Người liên hệ khẩn cấp</h2>
        {detail.emergencyContacts.length === 0 ? (
          <EmptyState
            title="Chưa có liên hệ khẩn cấp"
          />
        ) : (
          <ul className="foundation-list">
            {detail.emergencyContacts.map((contact) => (
              <li key={contact.id}>
                <span>
                  <strong>{contact.fullName}</strong>
                  <small>
                    {contact.relation} - {contact.phone}
                  </small>
                </span>
                {contact.isPrimary ? <StatusBadge tone="info">Chính</StatusBadge> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EmployeeEmploymentTab({ detail, dataSet }: { detail: EmployeeDetail; dataSet: EmployeeDataSet }) {
  return (
    <div className="content-grid content-grid--two">
      <Card>
        <h2 className="section-title">Thông tin công việc</h2>
        <FieldList
          items={[
            { label: "Phòng ban", value: detail.department.name },
            { label: "Chức vụ", value: detail.position.name },
            { label: "Loại nhân sự", value: detail.employmentType.name },
            { label: "Trạng thái", value: detail.summary.employmentStatusLabel },
            { label: "Ngày vào làm", value: formatDate(detail.profile.joinDate) },
            { label: "Ngày thử việc", value: formatDate(detail.profile.probationStartDate) },
            { label: "Ngày chính thức", value: formatDate(detail.profile.officialDate) },
            { label: "Ngày nghỉ việc", value: formatDate(detail.profile.terminationDate) }
          ]}
        />
      </Card>
      <Card>
        <h2 className="section-title">Quản lý trực tiếp</h2>
        {detail.manager ? (
          <article className="employee-manager-card">
            <Avatar name={detail.manager.fullName} />
            <span>
              <strong>{detail.manager.fullName}</strong>
              <small>
                {detail.manager.employeeCode} - {detail.manager.positionName}
              </small>
            </span>
          </article>
        ) : (
          <EmptyState title="Chưa có quản lý" />
        )}
      </Card>
      <Card className="employee-picker-card">
        <header className="panel-header">
          <div>
            <h2>Bộ chọn nhân sự</h2>
          </div>
        </header>
        <EmployeePicker label="Tìm nhân sự" options={getEmployeePickerOptions(dataSet, { activeOnly: true })} />
      </Card>
      <Card>
        <h2 className="section-title">Thông tin tham chiếu</h2>
        <FieldList
          items={[
            { label: "Database ID", value: detail.profile.id },
            { label: "Business ID", value: detail.profile.employeeCode },
            { label: "Version", value: detail.profile.rowVersion },
            { label: "Cập nhật", value: detail.profile.updatedAt }
          ]}
        />
      </Card>
    </div>
  );
}

function EmployeeContractsTab({ employeeId, dataSet }: { employeeId: string; dataSet: EmployeeDataSet }) {
  const contracts = getEmployeeContracts(employeeId, dataSet);

  if (contracts.length === 0) {
    return (
      <EmptyState
        title="Chưa có hợp đồng"
      />
    );
  }

  return (
    <Card>
      <h2 className="section-title">Hợp đồng lao động</h2>
      <div className="responsive-simple-table">
        <table>
          <thead>
            <tr>
              <th>Số hợp đồng</th>
              <th>Loại</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Trạng thái</th>
              <th>Tài liệu</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td>{contract.contractNumber}</td>
                <td>{contract.contractType}</td>
                <td>{formatDate(contract.startDate)}</td>
                <td>{formatDate(contract.endDate)}</td>
                <td>
                  <StatusBadge tone={contract.status === "active" ? "success" : "neutral"}>
                    {contractStatusLabels[contract.status]}
                  </StatusBadge>
                </td>
                <td>
                  {contract.attachmentFileId ? (
                    <Link className="private-file-link" href={buildInternalFileUrl(contract.attachmentFileId)}>
                      Xem tài liệu
                    </Link>
                  ) : (
                    "Chưa có"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function EmployeeDocumentsTab({
  employeeId,
  permissions,
  dataSet
}: {
  employeeId: string;
  permissions: readonly Permission[];
  dataSet: EmployeeDataSet;
}) {
  const documents = getEmployeeDocuments(employeeId, permissions, dataSet);

  if (documents.length === 0) {
    return (
      <EmptyState
        title="Chưa có tài liệu khả dụng"
      />
    );
  }

  return (
    <Card>
      <h2 className="section-title">Hồ sơ đính kèm</h2>
      <ul className="employee-document-list">
        {documents.map((document) => (
          <li key={document.id}>
            <FileText aria-hidden="true" size={18} />
            <span>
              <strong>{document.title}</strong>
              <small>
                {documentTypeLabels[document.documentType]} · tải lên {formatDate(document.uploadedAt.slice(0, 10))}
              </small>
            </span>
            {document.sensitive ? <StatusBadge tone="warning">Nhạy cảm</StatusBadge> : <StatusBadge>Riêng tư</StatusBadge>}
            <Link className="private-file-link" href={buildInternalFileUrl(document.fileId)}>
              Xem tài liệu
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function describeHistoryEvent(event: EmployeeHistoryEvent): string {
  const beforeValue = event.before?.value;
  const afterValue = event.after?.value;

  if (beforeValue || afterValue) {
    return `${valueOrEmpty(String(beforeValue ?? ""))} -> ${valueOrEmpty(String(afterValue ?? ""))}`;
  }

  if (event.after) {
    return Object.entries(event.after)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(" - ");
  }

  return "Đã ghi nhận thay đổi.";
}

function EmployeeHistoryTab({ employeeId, dataSet }: { employeeId: string; dataSet: EmployeeDataSet }) {
  const history = getEmployeeHistory(employeeId, dataSet);

  if (history.length === 0) {
    return <EmptyState title="Chưa có lịch sử" />;
  }

  return (
    <Card className="employee-history-panel">
      <h2 className="section-title">Quá trình công tác</h2>
      <ol className="employee-history">
        {history.map((event) => (
          <li key={event.id}>
            <span className="employee-history__marker">
              <BadgeCheck aria-hidden="true" size={16} />
            </span>
            <article>
              <header>
                <h3>{historyEventLabels[event.eventType]}</h3>
                <StatusBadge>{formatDate(event.eventDate)}</StatusBadge>
              </header>
              <p>{describeHistoryEvent(event)}</p>
              <small>
                Người thực hiện: {event.actorAccountId}
                {event.reason ? ` · Lý do: ${event.reason}` : ""}
              </small>
            </article>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function EmployeeAccountTab({
  detail,
  permissions
}: {
  detail: EmployeeDetail;
  permissions: readonly Permission[];
}) {
  if (!can(permissions, "account.view")) {
    return <PermissionDeniedState />;
  }

  if (!detail.account) {
    return (
      <Card>
        <EmptyState
          action={
            <EmployeeAccountActions
              employeeId={detail.profile.id}
              permissions={permissions}
              roles={roleCatalog}
            />
          }
          title="Nhân sự chưa có tài khoản"
        />
      </Card>
    );
  }

  return (
    <div className="content-grid content-grid--two">
      <Card>
        <header className="panel-header">
          <div>
            <h2>Tài khoản hệ thống</h2>
          </div>
          <StatusBadge tone={accountStatusTones[detail.account.status]}>
            {accountStatusLabels[detail.account.status]}
          </StatusBadge>
        </header>
        <FieldList
          items={[
            { label: "Email đăng nhập", value: detail.account.loginEmail },
            { label: "Số điện thoại", value: detail.account.loginPhone },
            { label: "Mã nhân viên", value: detail.account.employeeCodeIdentifier },
            { label: "Ngày kích hoạt", value: detail.account.activatedAt },
            { label: "Đăng nhập gần nhất", value: detail.account.lastLoginAt }
          ]}
        />
      </Card>
      <Card>
        <h2 className="section-title">Vai trò</h2>
        <div className="role-chip-list">
          {detail.account.roleNames.map((roleName) => (
            <StatusBadge key={roleName} tone="info">
              {roleName}
            </StatusBadge>
          ))}
        </div>
        <EmployeeAccountActions
          account={detail.account}
          employeeId={detail.profile.id}
          permissions={permissions}
          roles={roleCatalog}
        />
      </Card>
    </div>
  );
}

export async function EmployeeDetailPage({ employeeId, section }: EmployeeDetailPageProps) {
  const currentSection = employeeDetailSections.find((item) => item.value === section);

  if (!currentSection) {
    notFound();
  }

  const user = await getRequestUser();

  if (!user || !can(user.permissions, "employee.view")) {
    return <PermissionDeniedState />;
  }

  const dataSet = await getEmployeeDataSetAsync();
  const detail = getEmployeeDetail(employeeId, user.permissions, dataSet);

  if (!detail) {
    notFound();
  }

  return (
    <div className="page-stack">
      <PageHeader
        action={
          can(user.permissions, "employee.edit") ? (
            <Link className="button button--secondary button--md" href={`/employees/${employeeId}/edit`}>
              <span className="button__icon"><BriefcaseBusiness aria-hidden="true" size={16} /></span>
              <span>Chỉnh sửa</span>
            </Link>
          ) : null
        }
        title={detail.summary.fullName}
      />

      <section className="employee-detail-header">
        <Avatar className="employee-detail-header__avatar" name={detail.summary.fullName} />
        <div>
          <h2>{detail.summary.displayName}</h2>
          <p>
            {detail.summary.employeeCode} - {detail.summary.employmentTypeName}
          </p>
        </div>
        <StatusBadge tone={detail.summary.employmentStatusTone}>{detail.summary.employmentStatusLabel}</StatusBadge>
      </section>

      <Tabs
        items={employeeDetailSections.map((item) => ({
          label: item.label,
          href: `/employees/${employeeId}/${item.value}`,
          active: item.value === section
        }))}
        label="Tab hồ sơ nhân viên"
      />

      {section === "profile" ? <EmployeeProfileTab detail={detail} permissions={user.permissions} /> : null}
      {section === "employment" ? <EmployeeEmploymentTab dataSet={dataSet} detail={detail} /> : null}
      {section === "contracts" ? <EmployeeContractsTab dataSet={dataSet} employeeId={employeeId} /> : null}
      {section === "documents" ? <EmployeeDocumentsTab dataSet={dataSet} employeeId={employeeId} permissions={user.permissions} /> : null}
      {section === "history" ? <EmployeeHistoryTab dataSet={dataSet} employeeId={employeeId} /> : null}
      {section === "leave" ? <EmployeeLeavePanel employeeId={employeeId} /> : null}
      {section === "account" ? <EmployeeAccountTab detail={detail} permissions={user.permissions} /> : null}
    </div>
  );
}
