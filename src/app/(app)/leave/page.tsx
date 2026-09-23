import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { LeaveRequestList } from "@/features/leave";

export default function Page(){return <div className="page-stack"><PageHeader title="Nghỉ phép" action={<Link className="button button--primary button--md" href="/leave/new">Tạo đơn nghỉ</Link>}/><nav className="leave-quick-links"><Link href="/leave/my-requests">Đơn của tôi</Link><Link href="/leave/balance">Số dư phép</Link></nav><section aria-labelledby="recent-leave-title" className="leave-workspace"><h2 id="recent-leave-title">Đơn gần đây</h2><LeaveRequestList scope="self"/></section></div>}
