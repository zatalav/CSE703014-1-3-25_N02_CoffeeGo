import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const ADMIN_PAGE_SIZE = 8;

export function getPageCount(total: number, pageSize = ADMIN_PAGE_SIZE) {
  return Math.max(1, Math.ceil(Math.max(total, 0) / pageSize));
}

export function clampPage(page: number, total: number, pageSize = ADMIN_PAGE_SIZE) {
  return Math.min(Math.max(page, 1), getPageCount(total, pageSize));
}

export function getPagedItems<T>(items: T[], page: number, pageSize = ADMIN_PAGE_SIZE) {
  const currentPage = clampPage(page, items.length, pageSize);
  const start = (currentPage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

type PaginationEntry = number | "ellipsis";

const visiblePages = (currentPage: number, totalPages: number): PaginationEntry[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sorted = Array.from(pages)
    .filter(page => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return sorted.reduce<PaginationEntry[]>((entries, page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      entries.push("ellipsis");
    }
    entries.push(page);
    return entries;
  }, []);
};

type PaginationProps = {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  itemLabel?: string;
  extraContent?: ReactNode;
  containerClassName?: string;
};

export function Pagination({
  page,
  total,
  onPageChange,
  pageSize = ADMIN_PAGE_SIZE,
  itemLabel = "du lieu",
  extraContent,
  containerClassName = "px-4 py-3 border-t border-gray-100",
}: PaginationProps) {
  if (total <= 0) return null;

  const totalPages = getPageCount(total, pageSize);
  const currentPage = clampPage(page, total, pageSize);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(total, currentPage * pageSize);

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${containerClassName}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
        <span style={{ fontSize: "12.5px", color: "#6B7280" }}>
          Hien thi {start}-{end} / {total} {itemLabel}
        </span>
        {extraContent}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
          title="Trang truoc"
        >
          <ChevronLeft size={15} />
        </button>
        {visiblePages(currentPage, totalPages).map((entry, index) => entry === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-400" style={{ fontSize: "12px" }}>...</span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onPageChange(entry)}
            className={`w-8 h-8 rounded-lg text-xs ${entry === currentPage ? "bg-[#0F4761] text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
          >
            {entry}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
          title="Trang sau"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
