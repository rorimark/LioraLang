import { memo, useCallback, useMemo } from "react";

const buildVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push("...");
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push("...");
  }

  pages.push(totalPages);

  return pages;
};

export const CardCatalogPagination = memo(
  ({
    currentPage,
    totalPages,
    pageSize,
    pageSizeOptions,
    totalItems,
    rangeStart,
    rangeEnd,
    onPageChange,
    onPageSizeChange,
  }) => {
    const visiblePages = useMemo(
      () => buildVisiblePages(currentPage, totalPages),
      [currentPage, totalPages],
    );

    const handlePageButtonClick = useCallback(
      (event) => {
        const nextPage = Number(event.currentTarget.dataset.page);

        if (Number.isFinite(nextPage)) {
          onPageChange(nextPage);
        }
      },
      [onPageChange],
    );

    const handlePrevPage = useCallback(() => {
      onPageChange(currentPage - 1);
    }, [currentPage, onPageChange]);

    const handleNextPage = useCallback(() => {
      onPageChange(currentPage + 1);
    }, [currentPage, onPageChange]);

    const handlePageSizeSelect = useCallback(
      (event) => {
        onPageSizeChange(Number(event.target.value));
      },
      [onPageSizeChange],
    );

    return (
      <div className="cards-pagination">
        <div className="cards-pagination__meta">
          <span>
            Showing {rangeStart}-{rangeEnd} of {totalItems}
          </span>

          <label className="cards-pagination__size">
            Rows
            <select
              value={pageSize}
              onChange={handlePageSizeSelect}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="cards-pagination__controls" aria-label="Table pagination">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            Prev
          </button>

          {visiblePages.map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="cards-pagination__ellipsis"
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                type="button"
                data-page={page}
                className={
                  page === currentPage
                    ? "cards-pagination__page is-active"
                    : "cards-pagination__page"
                }
                onClick={handlePageButtonClick}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    );
  },
);

CardCatalogPagination.displayName = "CardCatalogPagination";
