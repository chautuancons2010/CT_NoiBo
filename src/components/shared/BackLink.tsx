import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({ href, label = "Quay lại" }: { href: string; label?: string }) {
  return <Link className="back-link" href={href}><ArrowLeft aria-hidden="true" size={17} />{label}</Link>;
}
