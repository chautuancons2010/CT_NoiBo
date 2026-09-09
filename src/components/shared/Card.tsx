import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <section className={cn("card", className)}>{children}</section>;
}

export interface StatCardProps {
  label: string;
  value: string;
  description?: string;
}

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <Card className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {description ? <p>{description}</p> : null}
    </Card>
  );
}
