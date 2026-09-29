// One page of a list, with everything a pager needs to say about it. The
// page asked for is clamped: a list that got shorter (a deck deleted, a
// search typed) never leaves the pager on a page that no longer exists.
export const paginate = (items, page, pageSize) => {
  const list = Array.isArray(items) ? items : [];
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const requested = Number.parseInt(page, 10);
  const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(requested) ? requested : 1));
  const startIndex = (currentPage - 1) * size;

  return {
    items: list.slice(startIndex, startIndex + size),
    currentPage,
    totalPages,
    totalItems,
    pageSize: size,
    rangeStart: totalItems > 0 ? startIndex + 1 : 0,
    rangeEnd: Math.min(startIndex + size, totalItems),
  };
};
