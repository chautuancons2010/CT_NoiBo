"use client";

import { CheckCircle2, ChevronRight, CircleAlert, Clock3, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { Drawer } from "@/components/shared/Overlays";
import { EmptyState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ProjectUpdate } from "@/features/projects/types/projectTypes";

import styles from "./PackageWorkspace.module.css";

const recordStatus = {
  done: { label: "Hoàn thiện", tone: "success" as const, Icon: CheckCircle2 },
  waiting: { label: "Cần bổ sung", tone: "warning" as const, Icon: CircleAlert },
  in_progress: { label: "Chưa hoàn thiện", tone: "neutral" as const, Icon: Clock3 }
};

export function PackageRecordWorkspace({ updates }: { updates: ProjectUpdate[] }) {
  const records = useMemo(() => updates.filter((update) => update.attachments.some((attachment) => attachment.attachmentType !== "image")), [updates]);
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const [mobileDetail, setMobileDetail] = useState(false);
  const selected = records.find((record) => record.id === selectedId) ?? records[0];
  const completed = records.filter((record) => record.status === "done").length;
  const needsWork = records.filter((record) => record.status === "waiting").length;
  const incomplete = records.length - completed - needsWork;

  function select(id: string) {
    setSelectedId(id);
    setMobileDetail(true);
  }

  return (
    <section className={styles.recordsWorkspace}>
      <header className={styles.workspaceHeading}>
        <div><h2>Hồ sơ</h2><p>{completed}/{records.length} hoàn thiện · {needsWork} cần bổ sung · {incomplete} chưa hoàn thiện</p></div>
      </header>
      <div className={styles.recordLayout}>
        <div className={styles.recordCatalog}>
          <div className={styles.panelTitle}><h3>Danh mục hồ sơ</h3><span>{records.length}</span></div>
          <div className={styles.recordList}>
            {records.map((record) => {
              const config = recordStatus[record.status];
              const Icon = config.Icon;
              return (
                <button aria-pressed={selected?.id === record.id} className={styles.recordRow} data-active={selected?.id === record.id || undefined} key={record.id} onClick={() => select(record.id)} type="button">
                  <Icon aria-hidden="true" size={18} />
                  <span><strong>{record.title}</strong><small>{new Date(record.updatedAt).toLocaleDateString("vi-VN")}</small></span>
                  <StatusBadge tone={config.tone}>{config.label}</StatusBadge>
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              );
            })}
            {!records.length ? <EmptyState title="Chưa có danh mục hồ sơ" /> : null}
          </div>
        </div>
        <aside className={styles.recordDetail}>
          <div className={styles.panelTitle}><h3>{selected?.status === "waiting" ? "Cần xử lý" : "Chi tiết hồ sơ"}</h3></div>
          {selected ? <RecordDetail record={selected} /> : <EmptyState title="Chọn một hồ sơ" />}
        </aside>
      </div>
      <Drawer onClose={() => setMobileDetail(false)} open={mobileDetail && Boolean(selected)} title="Chi tiết hồ sơ">
        {selected ? <div className={styles.mobileRecordDetail}><RecordDetail record={selected} /></div> : null}
      </Drawer>
    </section>
  );
}

function RecordDetail({ record }: { record: ProjectUpdate }) {
  const config = recordStatus[record.status];
  const documents = record.attachments.filter((attachment) => attachment.attachmentType !== "image");
  return (
    <div className={styles.recordDetailBody}>
      <div className={styles.recordDetailHeader}>
        <div><span>Hồ sơ</span><h3>{record.title}</h3></div>
        <StatusBadge tone={config.tone}>{config.label}</StatusBadge>
      </div>
      <dl className={styles.recordFacts}>
        <div><dt>Người cập nhật</dt><dd>{record.authorName}</dd></div>
        <div><dt>Cập nhật</dt><dd>{new Date(record.updatedAt).toLocaleString("vi-VN")}</dd></div>
      </dl>
      {record.content ? <p className={styles.recordNote}>{record.content}</p> : null}
      <div className={styles.recordFiles}>
        {documents.map((document) => (
          <a href={`/api/v1/files/${document.fileId}/signed-url`} key={document.id} rel="noreferrer" target="_blank">
            <FileText aria-hidden="true" size={18} />
            <span><strong>{document.fileName}</strong><small>{Math.round(document.sizeBytes / 1024)} KB</small></span>
          </a>
        ))}
      </div>
    </div>
  );
}

