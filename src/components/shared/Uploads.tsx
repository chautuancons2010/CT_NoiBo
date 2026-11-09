"use client";

import { useEffect, useImperativeHandle, useRef, useState, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { FileText, FileUp, ImagePlus, Paperclip } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import { FormField } from "@/components/shared/FormControls";

type UploadInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; ref?: Ref<HTMLInputElement> };

function UploadInput({ label, id, required, disabled, className, onChange, icon, ref: forwardedRef, ...props }: UploadInputProps & { icon: ReactNode }) {
  const [names, setNames] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current!, []);
  useEffect(() => {
    const form = inputRef.current?.form;
    const reset = () => setNames([]);
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [props.form]);
  const selected = names.length > 1 ? `${names.length} tệp` : names[0] ?? "Chưa chọn tệp";
  return <div className="upload-field">
    {icon}
    <FormField id={id} label={label} required={required} disabled={disabled}>
      {(fieldId, describedBy) => <span className="upload-control" data-disabled={disabled || undefined}>
        <input {...props} aria-describedby={[props["aria-describedby"], describedBy, `${fieldId}-selection`].filter(Boolean).join(" ")} className={cn("upload-control__native", className)} disabled={disabled} id={fieldId} ref={inputRef} required={required} type="file" onChange={(event) => { setNames(Array.from(event.currentTarget.files ?? []).map(file => file.name)); onChange?.(event); }} />
        <span aria-hidden="true" className="upload-control__button">Chọn tệp</span>
        <span aria-live="polite" className="upload-control__value" id={`${fieldId}-selection`} title={names.join(", ") || undefined}>{selected}</span>
      </span>}
    </FormField>
  </div>;
}

export function FileUpload(props: UploadInputProps) {
  return <UploadInput {...props} icon={<FileUp aria-hidden="true" size={20} />} />;
}

export function ImageUpload(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "accept"> & { label: string }) {
  return <UploadInput {...props} accept="image/*" icon={<ImagePlus aria-hidden="true" size={20} />} />;
}

/** Shared file-field name used by feature forms. */
export const UploadField = FileUpload;

export interface AttachmentItem {
  id: string;
  name: string;
  href?: string;
  sizeLabel?: string;
}

export interface UploadPreviewProps {
  name: string;
  meta?: ReactNode;
  preview?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function UploadPreview({ name, meta, preview, action, className }: UploadPreviewProps) {
  return (
    <div className={cn("upload-preview", className)}>
      <span aria-hidden="true" className="upload-preview__media">{preview ?? <FileText size={20} />}</span>
      <span className="upload-preview__copy"><strong>{name}</strong>{meta ? <small>{meta}</small> : null}</span>
      {action ? <span className="upload-preview__action">{action}</span> : null}
    </div>
  );
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
