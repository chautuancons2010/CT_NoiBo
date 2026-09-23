"use client";

import { Building2, CalendarDays, Info, MapPin, Plus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BackLink } from "@/components/shared/BackLink";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProjectHealthControl } from "@/features/projects/components/ProjectHealthControl";
import type { ProjectDetail, ProjectStatus } from "@/features/projects/types/projectTypes";

import styles from "./PackageWorkspace.module.css";

const statusMap: Record<ProjectStatus, { label: string; tone: "info" | "success" | "warning" | "neutral" }> = {
  preparing: { label: "Chuẩn bị", tone: "info" },
  active: { label: "Đang thi công", tone: "success" },
  paused: { label: "Tạm dừng", tone: "warning" },
  completed: { label: "Hoàn thành", tone: "success" },
  closed: { label: "Đã đóng", tone: "neutral" }
};

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json() as { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "Không thể lưu dữ liệu.");
}

export function PackageContextHeader({
  project,
  completionPercent,
  canManageWorksites,
  canUpdateHealth
}: {
  project: ProjectDetail;
  completionPercent?: number;
  canManageWorksites: boolean;
  canUpdateHealth: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [addingWorksite, setAddingWorksite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const status = statusMap[project.status];
  const worksiteContext = project.worksites[0]?.name ?? "Chưa có công trường";

  async function createWorksite(form: FormData) {
    setSaving(true);
    setError("");
    try {
      await postJson(`/api/v1/projects/${project.id}/worksites`, {
        name: form.get("name"),
        address: form.get("address") || undefined,
        latitude: form.get("latitude") ? Number(form.get("latitude")) : undefined,
        longitude: form.get("longitude") ? Number(form.get("longitude")) : undefined,
        radiusMeters: Number(form.get("radiusMeters")),
        gpsRequired: true,
        allowedAccuracyThresholdMeters: 100
      });
      setAddingWorksite(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thêm công trường.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className={styles.contextHeader}>
        <div className={styles.contextTopline}>
          <BackLink href="/projects" label="Danh sách gói" />
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        <div className={styles.contextMain}>
          <div className={styles.contextIdentity}>
            <span className={styles.contextCode}>{project.code}</span>
            <h1>{project.name}</h1>
            <p>
              {worksiteContext} · {project.projectManagerName ?? "Chưa phân công"}{completionPercent === undefined ? "" : ` · ${completionPercent}%`} · {project.currentPeople} nhân sự
            </p>
          </div>
          <Button leftIcon={<Info aria-hidden="true" size={17} />} onClick={() => setOpen(true)} variant="secondary">
            Thông tin gói
          </Button>
        </div>
      </header>

      <Drawer onClose={() => setOpen(false)} open={open} title="Thông tin gói">
        <div className={styles.infoDrawer}>
          <dl className={styles.infoFacts}>
            <div><dt><Building2 aria-hidden="true" size={16} /> Khách hàng</dt><dd>{project.customerName ?? "Chưa có"}</dd></div>
            <div><dt><UserRound aria-hidden="true" size={16} /> Phụ trách</dt><dd>{project.projectManagerName ?? "Chưa phân công"}</dd></div>
            <div><dt><CalendarDays aria-hidden="true" size={16} /> Bắt đầu</dt><dd>{project.startDate}</dd></div>
            <div><dt><CalendarDays aria-hidden="true" size={16} /> Kết thúc dự kiến</dt><dd>{project.expectedEndDate ?? "Chưa xác định"}</dd></div>
          </dl>

          {project.summary || project.note ? (
            <section className={styles.infoSection}>
              <h3>Nội dung</h3>
              <p>{project.summary ?? project.note}</p>
            </section>
          ) : null}

          <section className={styles.infoSection}>
            <div className={styles.infoSectionHeader}>
              <h3>Công trường</h3>
              {canManageWorksites ? (
                <Button leftIcon={<Plus aria-hidden="true" size={15} />} onClick={() => setAddingWorksite((value) => !value)} size="sm">
                  {addingWorksite ? "Đóng" : "Thêm"}
                </Button>
              ) : null}
            </div>
            <div className={styles.worksiteList}>
              {project.worksites.map((site) => (
                <div key={site.id}>
                  <MapPin aria-hidden="true" size={17} />
                  <span><strong>{site.name}</strong>{site.address ? <small>{site.address}</small> : null}</span>
                  <StatusBadge tone={site.status === "active" ? "success" : "neutral"}>{site.status === "active" ? "Hoạt động" : "Ngừng"}</StatusBadge>
                </div>
              ))}
              {!project.worksites.length ? <p>Chưa có công trường</p> : null}
            </div>
            {addingWorksite ? (
              <form action={createWorksite} className={styles.worksiteForm}>
                <Input label="Tên địa điểm" name="name" required />
                <Input label="Địa chỉ" name="address" />
                <Input label="Vĩ độ" name="latitude" step="any" type="number" />
                <Input label="Kinh độ" name="longitude" step="any" type="number" />
                <Input defaultValue="200" label="Bán kính (m)" min={10} name="radiusMeters" type="number" />
                {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
                <Button disabled={saving} type="submit" variant="primary">{saving ? "Đang lưu" : "Lưu công trường"}</Button>
              </form>
            ) : null}
          </section>

          <section className={styles.infoSection}>
            <h3>Tình trạng gói</h3>
            {canUpdateHealth ? <ProjectHealthControl health={project.health} projectId={project.id} /> : <StatusBadge>{project.health}</StatusBadge>}
          </section>
        </div>
      </Drawer>
    </>
  );
}
