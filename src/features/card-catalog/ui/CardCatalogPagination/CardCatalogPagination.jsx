import { memo, useCallback, useMemo } from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { Select } from "@shared/ui";
import "./CardCatalogPagination.css";
import { useI18n } from "@shared/lib/i18n";

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

export const CardCatalogPagination = memo(({ pagination = EMPTY_OBJECT, label, sizeLabel }) => {
    const { t } = useI18n();
    const navLabel = label || t("pager.label");
    const sizeText = sizeLabel || t("pager.rows");
    const resolvedPagination = pagination;
    const resolvedPageSizeOptions = Array.isArray(
      resolvedPagination.pageSizeOptions,
    )
      ? resolvedPagination.pageSizeOptions
      : EMPTY_OPTIONS;
    const showsPageSizeControl =
      resolvedPageSizeOptions.length > 0
      && typeof resolvedPagination.onPageSizeChange === "function";

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

    const { currentPage, totalPages } = resolvedPagination;

    // Wide: every page key. Narrow: back, "Page 2 of 8", forward. The
    // container decides, so the pager fits wherever it is put.
    return (
      <nav className="cards-pagination" aria-label={navLabel}>
        <div className="cards-pagination__meta">
          <span className="cards-pagination__range">
            {t("pager.range", {
              start: resolvedPagination.rangeStart,
              end: resolvedPagination.rangeEnd,
              total: resolvedPagination.totalItems,
            })}
          </span>

          {showsPageSizeControl ? (
            <label className="cards-pagination__size">
              {sizeText}
              <Select
                value={resolvedPagination.pageSize}
                onChange={handlePageSizeSelect}
                aria-label={t("pager.perPage", { name: sizeText })}
              >
                {resolvedPageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
        </div>

        {totalPages > 1 ? (
          <div className="cards-pagination__controls">
            <button
              type="button"
              className="cards-pagination__step"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              aria-label={t("pager.previousPage")}
            >
              <IoChevronBack aria-hidden />
              <span className="cards-pagination__step-text">{t("common.previous")}</span>
            </button>

            <span className="cards-pagination__status" aria-hidden="true">
              {t("pager.status", { page: currentPage, total: totalPages })}
            </span>

            <span className="cards-pagination__pages">
              {visiblePages.map((page, index) => {
                if (page === "...") {
                  return (
                    <span key={`ellipsis-${index}`} className="cards-pagination__ellipsis" aria-hidden="true">
                      …
                    </span>
                  );
                }

                return (
                  <button
                    key={page}
                    type="button"
                    data-page={page}
                    className={page === currentPage ? "cards-pagination__page is-active" : "cards-pagination__page"}
                    onClick={handlePageButtonClick}
                    aria-current={page === currentPage ? "page" : undefined}
                    aria-label={t("pager.page", { page })}
                  >
                    {page}
                  </button>
                );
              })}
            </span>

            <button
              type="button"
              className="cards-pagination__step"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              aria-label={t("pager.nextPage")}
            >
              <span className="cards-pagination__step-text">{t("common.next")}</span>
              <IoChevronForward aria-hidden />
            </button>
          </div>
        ) : null}
      </nav>
    );
  });

CardCatalogPagination.displayName = "CardCatalogPagination";
