"use client";

import type { InputHTMLAttributes } from "react";
import { FileUp, ImagePlus, Paperclip } from "lucide-react";

import { Input } from "@/components/shared/FormControls";

export function FileUpload(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  return (
    <div className="upload-field">
      <FileUp aria-hidden="true" size={18} />
      <Input type="file" {...props} />
    </div>
  );
}

export function ImageUpload(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "accept"> & { label: string }) {
  return (
    <div className="upload-field">
      <ImagePlus aria-hidden="true" size={18} />
      <Input accept="image/*" type="file" {...props} />
    </div>
  );
}

/** Shared file-field name used by feature forms. */
export const UploadField = FileUpload;

export interface AttachmentItem {
  id: string;
  name: string;
  href?: string;
  sizeLabel?: string;
}

export function AttachmentList({ items }: { items: AttachmentItem[] }) {
  if (items.length === 0) {
    return <p className="muted-text">Chưa có tệp đính kèm.</p>;
  }

  return (
    <ul className="attachment-list">
      {items.map((item) => (
        <li key={item.id}>
          <Paperclip aria-hidden="true" size={16} />
          {item.href ? <a href={item.href}>{item.name}</a> : <span>{item.name}</span>}
          {item.sizeLabel ? <small>{item.sizeLabel}</small> : null}
        </li>
      ))}
    </ul>
  );
}
