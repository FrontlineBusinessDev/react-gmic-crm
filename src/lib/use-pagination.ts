import { useEffect, useMemo, useState } from "react";

export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to a valid page whenever filtering shrinks the result set out from under the current page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  return { page, setPage, pageSize, setPageSize: changePageSize, pageItems, total: items.length };
}
