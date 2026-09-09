import Link from "next/link";

import { ErrorState } from "@/components/shared/States";

export default function NotFoundPage() {
  return (
    <ErrorState
      action={
        <Link className="button button--primary button--md" href="/dashboard">
          Về Tổng quan
        </Link>
      }
      description="Đường dẫn không tồn tại hoặc chưa được triển khai."
      title="Không tìm thấy trang"
    />
  );
}
