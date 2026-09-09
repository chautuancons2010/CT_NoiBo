import { UserRound } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface AvatarProps {
  name: string;
  imageUrl?: string;
  className?: string;
}

export function Avatar({ name, imageUrl, className }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span aria-label={name} className={cn("avatar", className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={imageUrl} />
      ) : (
        <span aria-hidden="true">{initials || <UserRound size={16} />}</span>
      )}
    </span>
  );
}
