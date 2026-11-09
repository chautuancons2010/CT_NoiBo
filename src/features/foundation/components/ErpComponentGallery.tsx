"use client";

import { useState } from "react";
import { Download, MoreHorizontal, Plus, Save, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/shared/Button";
import { Checkbox, DatePicker, Input, PasswordInput, Radio, SearchInput, Select, Switch, Textarea } from "@/components/shared/FormControls";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { ConfirmDialog, Drawer } from "@/components/shared/Overlays";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/States";
import { Tabs } from "@/components/shared/Tabs";
import { FileUpload, UploadPreview } from "@/components/shared/Uploads";
import styles from "./ErpComponentGallery.module.css";

export function ErpComponentGallery() {
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [tab, setTab] = useState("all");
  const [notice, setNotice] = useState("");
  return <div className={styles.gallery}>
    <section className={styles.section}>
      <h2>Nút và thao tác</h2>
      <div className={styles.row}>
        <Button variant="primary" leftIcon={<Plus aria-hidden="true" size={17} />} onClick={() => setNotice("Đã chọn Thêm mới")}>Thêm mới</Button>
        <Button leftIcon={<Download aria-hidden="true" size={17} />} onClick={() => setNotice("Đã chọn Xuất dữ liệu")}>Xuất dữ liệu</Button>
        <Button variant="soft" onClick={() => setDialog(true)}>Xác nhận</Button>
        <Button variant="ghost" onClick={() => setNotice("Đã hủy mẫu")}>Hủy</Button>
        <Button disabled>Lưu thay đổi</Button>
        <IconButton label="Xóa mẫu" variant="danger" onClick={() => setDialog(true)}><Trash2 aria-hidden="true" size={17} /></IconButton>
      </div>
      <div className={styles.row}>
        <Button size="sm" onClick={() => setDrawer(true)}>Mở chi tiết</Button>
        <DropdownMenu label="Thao tác mẫu" trigger={<><MoreHorizontal aria-hidden="true" size={18} />Thao tác</>}>
          <button type="button" onClick={() => setNotice("Đã chọn Chỉnh sửa")}>Chỉnh sửa</button>
          <button type="button" onClick={() => setNotice("Đã chọn Nhân bản")}>Nhân bản</button>
        </DropdownMenu>
      </div>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    </section>
    <section className={styles.section}>
      <h2>Trạng thái và tab</h2>
      <div className={styles.row}>
        <StatusBadge status="draft" /><StatusBadge status="pending_approval" /><StatusBadge status="approved" /><StatusBadge status="in_progress" /><StatusBadge status="rejected" />
      </div>
      <Tabs label="Tab thành phần" items={[{ label: "Tất cả", active: tab === "all", onSelect: () => setTab("all") }, { label: "Chờ duyệt", active: tab === "pending", onSelect: () => setTab("pending") }, { label: "Đã duyệt", active: tab === "approved", onSelect: () => setTab("approved") }]} />
    </section>
    <section className={`${styles.section} ${styles.wide}`}>
      <h2>Ô nhập và bộ chọn</h2>
      <div className={styles.fields}>
        <Input label="Họ và tên" placeholder="Nhập họ và tên" defaultValue="Nguyễn Thị Mỹ" required />
        <Select label="Phòng ban" placeholder="Chọn phòng ban" options={[{ label: "Kỹ thuật", value: "technical" }, { label: "Nhân sự", value: "hr" }, { label: "Kế toán", value: "accounting" }, { label: "Kho", value: "warehouse" }]} />
        <DatePicker label="Ngày bắt đầu" defaultValue="2026-11-04" />
        <Input label="Email" defaultValue="chua-hop-le" error="Email chưa đúng định dạng" type="email" />
        <PasswordInput label="Mật khẩu" placeholder="Nhập mật khẩu" autoComplete="new-password" />
        <Input label="Mã nhân viên" value="NV001" readOnly />
        <Input label="Tài khoản" value="Đã khóa" disabled />
        <SearchInput label="Tìm kiếm thành phần" placeholder="Tìm mã hoặc tên" />
      </div>
      <Textarea label="Ghi chú" placeholder="Nhập ghi chú" rows={2} />
    </section>
    <section className={styles.section}>
      <h2>Lựa chọn</h2>
      <Checkbox label="Nhận thông báo" defaultChecked />
      <Checkbox label="Chọn nhiều bản ghi" />
      <Radio label="Toàn thời gian" name="sample-employment" defaultChecked />
      <Radio label="Bán thời gian" name="sample-employment" />
      <Switch label="Đang hoạt động" checked={enabled} onCheckedChange={setEnabled} />
    </section>
    <section className={styles.section}>
      <h2>Tệp đính kèm</h2>
      <form className={styles.uploadForm} onSubmit={(event) => event.preventDefault()}><FileUpload label="Chọn tệp" name="attachment" /><Button type="reset">Đặt lại tệp</Button></form>
      <UploadPreview name="Hop-dong-lao-dong.pdf" meta="PDF · 245 KB" action={<IconButton label="Tải tệp mẫu" onClick={() => setNotice("Đã chọn tệp mẫu")}><Download aria-hidden="true" size={17} /></IconButton>} />
    </section>
    <section className={`${styles.section} ${styles.wide}`}>
      <h2>Trạng thái trống</h2>
      <EmptyState title="Chưa có chứng từ" action={<Button variant="primary" leftIcon={<Plus aria-hidden="true" size={17} />} onClick={() => setDialog(true)}>Thêm chứng từ</Button>} />
    </section>
    <ConfirmDialog open={dialog} title="Xác nhận thao tác" confirmLabel="Xác nhận" onClose={() => setDialog(false)} onConfirm={() => { setDialog(false); setNotice("Đã xác nhận mẫu"); }}><p>Chứng từ mẫu NV001</p></ConfirmDialog>
    <Drawer open={drawer} title="Chi tiết chứng từ" onClose={() => setDrawer(false)}>
      <div className={styles.drawerBody}><Input label="Mã chứng từ" defaultValue="CT001" readOnly /><Select label="Trạng thái" defaultValue="draft" options={[{ label: "Nháp", value: "draft" }, { label: "Chờ duyệt", value: "pending" }]} /><Button variant="primary" leftIcon={<Save aria-hidden="true" size={17} />} onClick={() => { setDrawer(false); setNotice("Đã lưu mẫu"); }}>Lưu mẫu</Button></div>
    </Drawer>
  </div>;
}
