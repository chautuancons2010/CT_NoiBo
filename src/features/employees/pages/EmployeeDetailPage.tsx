import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, BriefcaseBusiness, FileText, KeyRound, ShieldCheck, UserPlus } from "lucide-react";

import { employeeDetailSections } from "@/config/routeRegistry";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { EmptyState, PermissionDeniedState } from "@/components/shared/States";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { StatusBadge, type StatusBadgeTone } from "@/components/shared/StatusBadge";
import { Tabs } from "@/components/shared/Tabs";
import { can, type AccountStatus, type Permission } from "@/lib/auth/permissions";
import { buildInternalFileUrl } from "@/services/storage/storageService";
import { EmployeePicker } from "@/features/employees/components/EmployeePicker";
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

export interface EmployeeDetailPageProps {
  employeeId: string;
  section: string;
}

const accountStatusLabels: Record<AccountStatus, string> = {
  pending_activation: "Cho kich hoat",
  active: "Dang hoat dong",
  disabled: "Vo hieu hoa",
  locked: "Bi khoa",
  invited: "Da moi"
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
    return "Chua co";
  }

  return String(value);
}

function formatDate(value?: string): string {
  if (!value) {
    return "Chua co";
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
            {item.sensitive ? <span className="sensitive-dot">Nhay cam</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EmployeeProfileTab({ detail }: { detail: EmployeeDetail }) {
  const sensitive = detail.sensitive;

  return (
    <div className="content-grid content-grid--two">
      <Card>
        <h2 className="section-title">Thong tin co ban</h2>
        <FieldList
          items={[
            { label: "Ma nhan vien", value: detail.profile.employeeCode },
            { label: "Ho va ten", value: detail.profile.fullName },
            { label: "Ten hien thi", value: detail.profile.displayName },
            { label: "Ngay sinh", value: formatDate(detail.profile.dateOfBirth) },
            { label: "Ho so", value: employeeProfileStatusLabels[detail.profile.profileStatus] },
            { label: "Hoan thanh", value: `${detail.profile.profileCompleteness}%` }
          ]}
        />
        <div className="profile-completeness" aria-label="Muc do hoan thien ho so">
          <span style={{ width: `${detail.profile.profileCompleteness}%` }} />
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Lien he</h2>
        <FieldList
          items={[
            { label: "So dien thoai", value: detail.profile.personalPhone },
            { label: "Email ca nhan", value: detail.profile.personalEmail },
            { label: "Email cong ty", value: detail.profile.companyEmail },
            { label: "Dia chi hien tai", value: detail.profile.currentAddress },
            { label: "Dia chi thuong tru", value: detail.profile.permanentAddress },
            { label: "Tinh/Thanh", value: detail.profile.province },
            { label: "Quoc gia", value: detail.profile.country }
          ]}
        />
      </Card>

      <Card>
        <header className="panel-header">
          <div>
            <h2>CCCD, ngan hang, thue/BHXH</h2>
          </div>
          <StatusBadge tone={sensitive.allowed ? "success" : "warning"}>
            <ShieldCheck aria-hidden="true" size={14} />
            {sensitive.allowed ? "Co quyen" : "Bi gioi han"}
          </StatusBadge>
        </header>
        {sensitive.allowed ? (
          <FieldList
            items={[
              { label: "So CCCD", value: maskSensitiveValue(sensitive.nationalIdNumber), sensitive: true },
              { label: "Ngay cap", value: formatDate(sensitive.nationalIdIssuedDate), sensitive: true },
              { label: "Noi cap", value: sensitive.nationalIdIssuedPlace, sensitive: true },
              { label: "Ngay het han", value: formatDate(sensitive.nationalIdExpiryDate), sensitive: true },
              { label: "Ngan hang", value: sensitive.bankName, sensitive: true },
              { label: "So tai khoan", value: maskSensitiveValue(sensitive.bankAccountNumber), sensitive: true },
              { label: "Chu tai khoan", value: sensitive.bankAccountHolder, sensitive: true },
              { label: "Ma so thue", value: maskSensitiveValue(sensitive.personalTaxCode), sensitive: true },
              { label: "Ma BHXH", value: maskSensitiveValue(sensitive.socialInsuranceCode), sensitive: true }
            ]}
          />
        ) : (
          <PermissionDeniedState />
        )}
      </Card>

      <Card>
        <h2 className="section-title">Nguoi lien he khan cap</h2>
        {detail.emergencyContacts.length === 0 ? (
          <EmptyState
            title="Chua co lien he khan cap"
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
                {contact.isPrimary ? <StatusBadge tone="info">Chinh</StatusBadge> : null}
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
        <h2 className="section-title">Thong tin cong viec</h2>
        <FieldList
          items={[
            { label: "Phong ban", value: detail.department.name },
            { label: "Chuc vu", value: detail.position.name },
            { label: "Loai nhan su", value: detail.employmentType.name },
            { label: "Trang thai", value: detail.summary.employmentStatusLabel },
            { label: "Ngay vao lam", value: formatDate(detail.profile.joinDate) },
            { label: "Ngay thu viec", value: formatDate(detail.profile.probationStartDate) },
            { label: "Ngay chinh thuc", value: formatDate(detail.profile.officialDate) },
            { label: "Ngay nghi viec", value: formatDate(detail.profile.terminationDate) }
          ]}
        />
      </Card>
      <Card>
        <h2 className="section-title">Quan ly truc tiep</h2>
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
          <EmptyState title="Chua co quan ly" />
        )}
      </Card>
      <Card className="employee-picker-card">
        <header className="panel-header">
          <div>
            <h2>Employee selector dung lai</h2>
          </div>
        </header>
        <EmployeePicker label="Tim nhan su" options={getEmployeePickerOptions(dataSet, { activeOnly: true })} />
      </Card>
      <Card>
        <h2 className="section-title">Snapshot cho nghiep vu sau</h2>
        <FieldList
          items={[
            { label: "Database ID", value: detail.profile.id },
            { label: "Business ID", value: detail.profile.employeeCode },
            { label: "Version", value: detail.profile.rowVersion },
            { label: "Cap nhat", value: detail.profile.updatedAt }
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
        title="Chua co hop dong"
      />
    );
  }

  return (
    <Card>
      <h2 className="section-title">Hop dong lao dong</h2>
      <div className="responsive-simple-table">
        <table>
          <thead>
            <tr>
              <th>So hop dong</th>
              <th>Loai</th>
              <th>Bat dau</th>
              <th>Ket thuc</th>
              <th>Trang thai</th>
              <th>Tai lieu</th>
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
                      Signed access
                    </Link>
                  ) : (
                    "Chua co"
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
        title="Chua co tai lieu kha dung"
      />
    );
  }

  return (
    <Card>
      <h2 className="section-title">Ho so dinh kem</h2>
      <ul className="employee-document-list">
        {documents.map((document) => (
          <li key={document.id}>
            <FileText aria-hidden="true" size={18} />
            <span>
              <strong>{document.title}</strong>
              <small>
                {documentTypeLabels[document.documentType]} - tai len {formatDate(document.uploadedAt.slice(0, 10))}
              </small>
            </span>
            {document.sensitive ? <StatusBadge tone="warning">Nhay cam</StatusBadge> : <StatusBadge>Private</StatusBadge>}
            <Link className="private-file-link" href={buildInternalFileUrl(document.fileId)}>
              Signed access
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

  return "Da ghi nhan thay doi.";
}

function EmployeeHistoryTab({ employeeId, dataSet }: { employeeId: string; dataSet: EmployeeDataSet }) {
  const history = getEmployeeHistory(employeeId, dataSet);

  if (history.length === 0) {
    return <EmptyState title="Chua co lich su" />;
  }

  return (
    <Card className="employee-history-panel">
      <h2 className="section-title">Qua trinh cong tac</h2>
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
                Actor: {event.actorAccountId}
                {event.reason ? ` - Ly do: ${event.reason}` : ""}
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
            <PermissionGate permissions={permissions} require="account.create">
              <Button leftIcon={<UserPlus aria-hidden="true" size={16} />} variant="primary">
                Cap tai khoan he thong
              </Button>
            </PermissionGate>
          }
          title="Nhan su chua co tai khoan"
        />
      </Card>
    );
  }

  return (
    <div className="content-grid content-grid--two">
      <Card>
        <header className="panel-header">
          <div>
            <h2>Tai khoan he thong</h2>
          </div>
          <StatusBadge tone={accountStatusTones[detail.account.status]}>
            {accountStatusLabels[detail.account.status]}
          </StatusBadge>
        </header>
        <FieldList
          items={[
            { label: "Email dang nhap", value: detail.account.loginEmail },
            { label: "So dien thoai", value: detail.account.loginPhone },
            { label: "Ma nhan vien", value: detail.account.employeeCodeIdentifier },
            { label: "Ngay kich hoat", value: detail.account.activatedAt },
            { label: "Dang nhap gan nhat", value: detail.account.lastLoginAt }
          ]}
        />
      </Card>
      <Card>
        <h2 className="section-title">Vai tro</h2>
        <div className="role-chip-list">
          {detail.account.roleNames.map((roleName) => (
            <StatusBadge key={roleName} tone="info">
              {roleName}
            </StatusBadge>
          ))}
        </div>
        <div className="account-action-row">
          <PermissionGate permissions={permissions} require="account.assign_role">
            <Button leftIcon={<KeyRound aria-hidden="true" size={16} />} variant="secondary">
              Quan ly vai tro
            </Button>
          </PermissionGate>
          <PermissionGate permissions={permissions} require="account.disable">
            <Button variant="danger">Vo hieu hoa</Button>
          </PermissionGate>
        </div>
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
          <PermissionGate permissions={user.permissions} require="employee.edit">
            <Button leftIcon={<BriefcaseBusiness aria-hidden="true" size={16} />} variant="secondary">
              Chinh sua
            </Button>
          </PermissionGate>
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
        label="Tab ho so nhan vien"
      />

      {section === "profile" ? <EmployeeProfileTab detail={detail} /> : null}
      {section === "employment" ? <EmployeeEmploymentTab dataSet={dataSet} detail={detail} /> : null}
      {section === "contracts" ? <EmployeeContractsTab dataSet={dataSet} employeeId={employeeId} /> : null}
      {section === "documents" ? <EmployeeDocumentsTab dataSet={dataSet} employeeId={employeeId} permissions={user.permissions} /> : null}
      {section === "history" ? <EmployeeHistoryTab dataSet={dataSet} employeeId={employeeId} /> : null}
      {section === "account" ? <EmployeeAccountTab detail={detail} permissions={user.permissions} /> : null}
    </div>
  );
}
