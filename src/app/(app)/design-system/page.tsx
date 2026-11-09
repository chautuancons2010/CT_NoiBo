import { notFound } from "next/navigation";
import { ErpDesignReference } from "@/features/foundation/components/ErpDesignReference";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ErpDesignReference />;
}
