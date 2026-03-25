import { memo, useCallback, useMemo } from "react";
import "./CardCatalogPagination.css";

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_OPTIONS = Object.freeze([]);

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

export const CardCatalogPagination = memo(({ pagination = EMPTY_OBJECT }) => {
    const resolvedPagination = pagination;
    const resolvedPageSizeOptions = Array.isArray(
      resolvedPagination.pageSizeOptions,
    )
      ? resolvedPagination.pageSizeOptions
      : EMPTY_OPTIONS;

    const visiblePages = useMemo(
      () =>
        buildVisiblePages(
          resolvedPagination.currentPage,
          resolvedPagination.totalPages,
        ),
      [resolvedPagination.currentPage, resolvedPagination.totalPages],
    );

    const handlePageButtonClick = useCallback(
      (event) => {
        const nextPage = Number(event.currentTarget.dataset.page);

        if (Number.isFinite(nextPage)) {
          resolvedPagination.onPageChange?.(nextPage);
        }
      },
      [resolvedPagination],
    );

    const handlePrevPage = useCallback(() => {
      resolvedPagination.onPageChange?.(resolvedPagination.currentPage - 1);
    }, [resolvedPagination]);

    const handleNextPage = useCallback(() => {
      resolvedPagination.onPageChange?.(resolvedPagination.currentPage + 1);
    }, [resolvedPagination]);

    const handlePageSizeSelect = useCallback(
      (event) => {
        resolvedPagination.onPageSizeChange?.(Number(event.target.value));
      },
      [resolvedPagination],
    );

    return (
      <div className="cards-pagination">
        <div className="cards-pagination__meta">
          <span>
            Showing {resolvedPagination.rangeStart}-{resolvedPagination.rangeEnd} of{" "}
            {resolvedPagination.totalItems}
          </span>

          <label className="cards-pagination__size">
            Rows
            <select
              value={resolvedPagination.pageSize}
              onChange={handlePageSizeSelect}
            >
              {resolvedPageSizeOptions.map((size) => (
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
            disabled={resolvedPagination.currentPage === 1}
          >
            Prev
          </button>

          {visiblePages.map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="cards-pagination__ellipsis"
                  aria-hidden="true"
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
                  page === resolvedPagination.currentPage
                    ? "cards-pagination__page is-active"
                    : "cards-pagination__page"
                }
                onClick={handlePageButtonClick}
                aria-current={
                  page === resolvedPagination.currentPage ? "page" : undefined
                }
                aria-label={`Go to page ${page}`}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleNextPage}
            disabled={
              resolvedPagination.currentPage === resolvedPagination.totalPages
            }
          >
            Next
          </button>
        </div>
      </div>
    );
  });

CardCatalogPagination.displayName = "CardCatalogPagination";
