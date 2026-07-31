import { useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 10;

export function usePagination<T>(items: T[], initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Keyed on the item *count*, not the array identity: editing a row in place
  // (e.g. clicking a status badge) rebuilds the array without changing what's
  // in it, and resetting there would throw the user back to page 1 mid-edit.
  // A changed count means filters actually moved, so page 1 is right.
  useEffect(() => {
    setPage(1);
  }, [items.length, pageSize]);

  // Guards the case where the count shrank enough to strand the current page
  // before the reset above lands.
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return { page: safePage, setPage, pageSize, setPageSize, totalPages, totalItems: items.length, paged };
}
