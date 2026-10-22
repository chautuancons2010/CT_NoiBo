import { BackLink } from "@/components/shared/BackLink";
import { PageHeader } from "@/components/shared/PageHeader";
import { PayslipDetail } from "@/features/accounting/components/PayslipDetail";

export default async function Page({ params, searchParams }: PageProps<"/accounting/payslips/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const selfOnly = query.scope === "self";
  return (
    <div className="page-stack">
      <BackLink href={selfOnly ? "/accounting/payslips?scope=self" : "/accounting/payslips"} label="Trở lại phiếu lương" />
      <PageHeader title="Chi tiết phiếu lương" />
      <PayslipDetail id={id} selfOnly={selfOnly} />
    </div>
  );
}
