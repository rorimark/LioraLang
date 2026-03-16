import { useCallback, useState } from "react";

export const useWordsTable = () => {
  const [expandedRowId, setExpandedRowId] = useState(null);

  const handleToggleRow = useCallback((event) => {
    const rowId = event.currentTarget.dataset.wordId;

    if (!rowId) {
      return;
    }

    setExpandedRowId((currentId) =>
      String(currentId) === String(rowId) ? null : rowId,
    );
  }, []);

  return {
    expandedRowId,
    handleToggleRow,
  };
};
