"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
export function WorkerEvidencePhoto({ photo, id, label = "Ảnh điểm danh" }: { photo?: Blob; id?: string; label?: string }) {
  const [localUrl] = useState(() => photo ? URL.createObjectURL(photo) : undefined);
  const [open, setOpen] = useState(false);
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);
  const src = localUrl ?? `/api/v1/worker-attendance/photos/${id}`;
  return <><button aria-label={`Xem ${label.toLocaleLowerCase("vi")}`} className="worker-photo-button" onClick={() => setOpen(true)} type="button"><Image alt={label} height={240} src={localUrl ?? `${src}?size=thumbnail`} unoptimized width={320} /></button><ImageLightbox images={[{ id: id ?? "local", src, alt: label, title: label }]} open={open} onClose={() => setOpen(false)} /></>;
}
