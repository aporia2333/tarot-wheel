interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

export function Pagination({ currentPage, totalPages, onChange }: PaginationProps) {
  return (
    <nav className="spread-pagination" aria-label="牌阵分页">
      <button
        type="button"
        className="pagination-arrow"
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 0}
        aria-label="上一页"
      >
        <ArrowIcon direction="left" />
      </button>

      <div className="pagination-dots" aria-label={`第 ${currentPage + 1} 页，共 ${totalPages} 页`}>
        {Array.from({ length: totalPages }, (_, page) => (
          <button
            key={page}
            type="button"
            className={`pagination-dot ${page === currentPage ? "is-active" : ""}`}
            onClick={() => onChange(page)}
            aria-label={`前往第 ${page + 1} 页`}
            aria-current={page === currentPage ? "page" : undefined}
          />
        ))}
      </div>

      <button
        type="button"
        className="pagination-arrow"
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        aria-label="下一页"
      >
        <ArrowIcon direction="right" />
      </button>
    </nav>
  );
}
