import { BackLink } from "@/components/shared/BackLink";
import { PageHeader } from "@/components/shared/PageHeader";
import { PayslipDetail } from "@/features/accounting/components/PayslipDetail";

export default async function Page({ params }: PageProps<"/accounting/payslips/[id]">) {
  const { id } = await params;
  return (
    <div className="page-stack">
      <BackLink href="/accounting/payslips" label="Trở lại phiếu lương" />
      <PageHeader title="Chi tiết phiếu lương" />
      <PayslipDetail id={id} />
    </div>
  );
}
