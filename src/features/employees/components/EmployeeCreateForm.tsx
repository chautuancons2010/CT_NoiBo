"use client";

import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { DatePicker, Input, Select, Textarea } from "@/components/shared/FormControls";
import { FormSection, StickyActionBar } from "@/components/shared/FormLayout";
import type { Department, EmployeePickerOption, EmploymentType, Position } from "@/features/employees/types";
import { employeeStatusMeta } from "@/features/employees/services/employeeService";

export interface EmployeeCreateFormProps {
  departments: Department[];
  positions: Position[];
  employmentTypes: EmploymentType[];
  managers: EmployeePickerOption[];
}

function readString(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value : undefined;
}

export function EmployeeCreateForm({
  departments,
  positions,
  employmentTypes,
  managers
}: EmployeeCreateFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setWarnings([]);

    const formData = new FormData(event.currentTarget);
    const payload = {
      employeeCode: readString(formData, "employeeCode"),
      fullName: readString(formData, "fullName"),
      displayName: readString(formData, "displayName"),
      personalPhone: readString(formData, "personalPhone"),
      personalEmail: readString(formData, "personalEmail"),
      companyEmail: readString(formData, "companyEmail"),
      departmentId: readString(formData, "departmentId"),
      positionId: readString(formData, "positionId"),
      employmentTypeId: readString(formData, "employmentTypeId"),
      managerEmployeeId: readString(formData, "managerEmployeeId"),
      joinDate: readString(formData, "joinDate"),
      probationStartDate: readString(formData, "probationStartDate"),
      officialDate: readString(formData, "officialDate"),
      employmentStatus: readString(formData, "employmentStatus") ?? "active",
      currentAddress: readString(formData, "currentAddress"),
      province: readString(formData, "province"),
      contractorName: readString(formData, "contractorName"),
      note: readString(formData, "note")
    };

    const response = await fetch("/api/v1/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const body = await response.json();

    setSubmitting(false);

    if (!body.ok) {
      setError(body.error?.message ?? "Không thể tạo hồ sơ nhân sự.");
      return;
    }

    setWarnings(body.data.duplicateWarnings ?? []);
    router.push(`/employees/${body.data.employee.id}/profile`);
  }

  return (
    <form className="employee-create-form" onSubmit={handleSubmit}>
      {error ? <div className="form-alert form-alert--error">{error}</div> : null}
      {warnings.length > 0 ? (
        <div className="form-alert form-alert--warning">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <FormSection
        title="Thông tin cơ bản"
      >
        <Input label="Mã nhân viên" name="employeeCode" required />
        <Input label="Họ và tên" name="fullName" required />
        <Input label="Tên hiển thị" name="displayName" />
        <Input label="Số điện thoại" name="personalPhone" required />
        <Input label="Email cá nhân" name="personalEmail" type="email" />
        <Input label="Email công ty" name="companyEmail" type="email" />
      </FormSection>

      <FormSection title="Thông tin công việc">
        <Select
          label="Phòng ban"
          name="departmentId"
          options={departments.map((department) => ({
            label: department.name,
            value: department.id
          }))}
          placeholder="Chọn phòng ban"
          required
        />
        <Select
          label="Chức vụ"
          name="positionId"
          options={positions.map((position) => ({
            label: position.name,
            value: position.id
          }))}
          placeholder="Chọn chức vụ"
          required
        />
        <Select
          label="Loại nhân sự"
          name="employmentTypeId"
          options={employmentTypes.map((employmentType) => ({
            label: employmentType.name,
            value: employmentType.id
          }))}
          placeholder="Chọn loại nhân sự"
          required
        />
        <Select
          label="Quản lý trực tiếp"
          name="managerEmployeeId"
          options={managers.map((manager) => ({
            label: `${manager.displayName} · ${manager.employeeCode}`,
            value: manager.id
          }))}
          placeholder="Chưa gán"
        />
        <DatePicker label="Ngày vào làm" name="joinDate" required />
        <DatePicker label="Ngày thử việc" name="probationStartDate" />
        <DatePicker label="Ngày chính thức" name="officialDate" />
        <Select
          label="Trạng thái"
          name="employmentStatus"
          options={Object.entries(employeeStatusMeta).map(([value, meta]) => ({
            label: meta.label,
            value
          }))}
          required
        />
      </FormSection>

      <FormSection columns={1} title="Liên hệ">
        <Input label="Địa chỉ hiện tại" name="currentAddress" />
        <Input label="Tỉnh/Thành" name="province" />
        <Input label="Đơn vị / nhà thầu" name="contractorName" />
        <Textarea label="Ghi chú" name="note" />
      </FormSection>

      <StickyActionBar>
        <Button disabled={submitting} type="button" variant="secondary">
          Hủy
        </Button>
        <Button
          disabled={submitting}
          leftIcon={<Save aria-hidden="true" size={16} />}
          type="submit"
          variant="primary"
        >
          {submitting ? "Đang lưu" : "Lưu hồ sơ"}
        </Button>
      </StickyActionBar>
    </form>
  );
}
