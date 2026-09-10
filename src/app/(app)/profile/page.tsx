import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";

import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { findEmployeeForAccount, getEmployeeDetail } from "@/features/employees/services/employeeService";
import { getEmployeeDataSetAsync } from "@/features/employees/services/employeeRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page() {
  const user = await getRequestUser();
  const dataSet = await getEmployeeDataSetAsync();
  const employee = user ? findEmployeeForAccount(user.id, dataSet) : undefined;
  const detail = employee && user ? getEmployeeDetail(employee.id, user.permissions, dataSet) : undefined;

  return (
    <div className="page-stack">
      <PageHeader title="Ca nhan" />

      <Card className="self-profile-card">
        <Avatar className="employee-detail-header__avatar" name={detail?.summary.fullName ?? user?.displayName ?? "User"} />
        <div>
          <h2>{detail?.summary.fullName ?? user?.displayName ?? "Chua dang nhap"}</h2>
          <p>
            {detail
              ? `${detail.summary.employeeCode} - ${detail.summary.departmentName} - ${detail.summary.positionName}`
              : user?.email}
          </p>
        </div>
        {detail ? <StatusBadge tone={detail.summary.employmentStatusTone}>{detail.summary.employmentStatusLabel}</StatusBadge> : null}
      </Card>

      {detail ? (
        <div className="content-grid content-grid--two">
          <Card>
            <h2 className="section-title">Thong tin lien he</h2>
            <ul className="foundation-list">
              <li>
                <span>
                  <strong>So dien thoai</strong>
                  <small>{detail.profile.personalPhone}</small>
                </span>
              </li>
              <li>
                <span>
                  <strong>Email cong ty</strong>
                  <small>{detail.profile.companyEmail ?? "Chua co"}</small>
                </span>
              </li>
              <li>
                <span>
                  <strong>Dia chi hien tai</strong>
                  <small>{detail.profile.currentAddress ?? "Chua co"}</small>
                </span>
              </li>
            </ul>
          </Card>
          <Card>
            <h2 className="section-title">Tai khoan</h2>
            <ul className="foundation-list">
              <li>
                <span>
                  <strong>Trang thai</strong>
                  <small>{user?.status}</small>
                </span>
                <StatusBadge tone={user?.status === "active" ? "success" : "warning"}>{user?.status}</StatusBadge>
              </li>
              <li>
                <span>
                  <strong>Vai tro/quyen</strong>
                  <small>{user?.permissions.length ?? 0} effective permissions</small>
                </span>
              </li>
            </ul>
            <div className="account-action-row">
              <Button leftIcon={<KeyRound aria-hidden="true" size={16} />} variant="secondary">
                Doi mat khau
              </Button>
              <Button leftIcon={<LogOut aria-hidden="true" size={16} />} variant="secondary">
                Dang xuat
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <p className="muted-text">Tai khoan demo chua lien ket voi ho so nhan su.</p>
          <Link className="button button--secondary button--md" href="/employees">
            Xem danh sach nhan su
          </Link>
        </Card>
      )}
    </div>
  );
}
