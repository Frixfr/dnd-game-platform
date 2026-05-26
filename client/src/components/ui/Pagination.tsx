// client/src/components/ui/Pagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
}: PaginationProps) => {
  const generatePages = () => {
    const pages: (number | string)[] = [];
    const leftSibling = Math.max(currentPage - siblingCount, 1);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages);
    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < totalPages - 1;

    pages.push(1);
    if (showLeftDots) pages.push('...');
    for (let i = leftSibling; i <= rightSibling; i++) {
      if (i !== 1 && i !== totalPages) pages.push(i);
    }
    if (showRightDots) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center space-x-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-md border border-[#F2E9E4]/30 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0A1F44]/80 text-[#F2E9E4]"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {generatePages().map((page, idx) =>
        typeof page === 'number' ? (
          <button
            key={idx}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-md ${
              currentPage === page
                ? 'bg-[#FF0026] text-white'
                : 'border border-[#F2E9E4]/30 hover:bg-[#0A1F44]/80 text-[#F2E9E4]'
            }`}
          >
            {page}
          </button>
        ) : (
          <span key={idx} className="px-2 text-[#F2E9E4]/60">
            ...
          </span>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-md border border-[#F2E9E4]/30 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0A1F44]/80 text-[#F2E9E4]"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};