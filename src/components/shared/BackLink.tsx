import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({ href = "/dashboard", label = "Trở lại" }: { href?: string; label?: string }) {
  return (
    <Link className="back-link" href={href}>
      <ArrowLeft aria-hidden="true" size={17} />
      <span>{label}</span>
    </Link>
  );
}
