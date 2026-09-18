"use client";

import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

export interface AvatarProps {
  name: string;
  imageUrl?: string;
  className?: string;
}

export function Avatar({ name, imageUrl, className }: AvatarProps) {
  const [revision, setRevision] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const refresh = () => { setFailed(false); setRevision((value) => value + 1); };
    window.addEventListener("avatar-updated", refresh);
    return () => window.removeEventListener("avatar-updated", refresh);
  }, []);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span aria-label={name} className={cn("avatar", className)}>
      {imageUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" onError={() => setFailed(true)} src={`${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${revision}`} />
      ) : (
        <span aria-hidden="true">{initials || <UserRound size={16} />}</span>
      )}
    </span>
  );
}
