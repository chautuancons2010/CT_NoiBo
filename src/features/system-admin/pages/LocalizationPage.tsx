"use client";

import { Button } from "@/components/shared/Button";
import { Select } from "@/components/shared/FormControls";
import { FormSection, StickyActionBar } from "@/components/shared/FormLayout";
import { AdminPage } from "@/features/system-admin/components/AdminPage";
import { useSettingsEditor } from "@/features/system-admin/components/editorUtils";

export function LocalizationPage() {
  const editor = useSettingsEditor("localization");
  return <AdminPage title="Định dạng & thời gian"><section className="settings-form-card"><FormSection title="Mặc định hệ thống"><Select label="Múi giờ" options={[{ label: "Việt Nam (Asia/Ho_Chi_Minh)", value: "Asia/Ho_Chi_Minh" }]} value={editor.draft.timezone} disabled /><Select label="Định dạng ngày" onChange={(e) => editor.setDraft({ ...editor.draft, dateFormat: e.target.value as typeof editor.draft.dateFormat })} options={[{ label: "DD/MM/YYYY", value: "DD/MM/YYYY" }, { label: "YYYY-MM-DD", value: "YYYY-MM-DD" }]} value={editor.draft.dateFormat} /><Select label="Định dạng giờ" onChange={(e) => editor.setDraft({ ...editor.draft, timeFormat: e.target.value as typeof editor.draft.timeFormat })} options={[{ label: "24 giờ (HH:mm)", value: "HH:mm" }, { label: "12 giờ (hh:mm a)", value: "hh:mm a" }]} value={editor.draft.timeFormat} /><Select label="Ngày đầu tuần" options={[{ label: "Thứ Hai", value: "monday" }]} value={editor.draft.weekStartsOn} disabled /><Select label="Ngôn ngữ" options={[{ label: "Tiếng Việt", value: "vi-VN" }]} value={editor.draft.locale} disabled /></FormSection>{editor.message ? <div aria-live="polite" className="save-feedback">{editor.message}</div> : null}<StickyActionBar><Button disabled={!editor.dirty || editor.saving} onClick={editor.reset}>Hoàn tác</Button><Button disabled={!editor.dirty || editor.saving} onClick={() => void editor.save()} variant="primary">{editor.saving ? "Đang lưu" : "Xuất bản"}</Button></StickyActionBar></section></AdminPage>;
}
