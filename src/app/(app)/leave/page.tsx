import Link from "next/link";
import { Card } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LeaveRequestList } from "@/features/leave";
export default function Page(){return <div className="page-stack"><PageHeader title="Nghỉ phép" action={<Link className="button button--primary button--md" href="/leave/new">Tạo đơn nghỉ</Link>}/><nav className="leave-quick-links"><Link href="/leave/my-requests">Đơn của tôi</Link><Link href="/leave/balance">Số dư phép</Link><Link href="/approvals/leave">Phê duyệt</Link><Link href="/leave/manage">Quản lý</Link></nav><Card><h3>Đơn gần đây</h3><LeaveRequestList/></Card></div>}
