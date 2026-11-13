"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/shared/Button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({ page, pageCount, onPageChange, totalItems, pageSize }: PaginationProps) {
  return (
    <nav aria-label="Phân trang" className="pagination">
      {totalItems !== undefined && pageSize ? <span className="pagination__range" role="status">{totalItems ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)}` : "0"} / {totalItems}</span> : null}
      <div className="pagination__controls">
      <Button
        disabled={page <= 1}
        leftIcon={<ChevronLeft aria-hidden="true" size={16} />}
        onClick={() => onPageChange?.(page - 1)}
        variant="secondary"
        size="sm"
      >
        Trước
      </Button>
      <span className="pagination__position" aria-live="polite">
        Trang {page} / {pageCount}
      </span>
      <Button
        disabled={page >= pageCount}
        onClick={() => onPageChange?.(page + 1)}
        rightIcon={<ChevronRight aria-hidden="true" size={16} />}
        variant="secondary"
        size="sm"
      >
        Sau
      </Button>
      </div>
    </nav>
  );
}
