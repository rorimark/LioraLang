import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCardCatalog } from "./useCardCatalog.js";

const WORDS = [
  {
    id: 1,
    source: "apple",
    target: "jabłko",
    level: "A1",
    part_of_speech: "noun",
    tags: ["food", "fruit"],
  },
  {
    id: 2,
    source: "run",
    target: "biec",
    level: "B1",
    part_of_speech: "verb",
    tags: ["action"],
  },
  {
    id: 3,
    source: "pear",
    target: "gruszka",
    level: "A2",
    part_of_speech: "noun",
    tags: ["food"],
  },
];

describe("useCardCatalog", () => {
  const renderCatalog = () => renderHook(() => useCardCatalog(WORDS));

  it("derives a clean set of filter options from the current dataset", () => {
    const { result } = renderCatalog();

    expect(result.current.levelOptions).toEqual(["A1", "A2", "B1"]);
    expect(result.current.partOfSpeechOptions).toEqual(["noun", "verb"]);
    expect(result.current.tagOptions).toEqual(["action", "food", "fruit"]);
  });

  it("treats tag filters as an AND match", () => {
    const { result } = renderCatalog();

    act(() => {
      result.current.handleToggleFilter("tags", "food");
      result.current.handleToggleFilter("tags", "fruit");
    });

    expect(result.current.totalItems).toBe(1);
    expect(result.current.paginatedWords.map((word) => word.source)).toEqual(["apple"]);
  });

  it("moves back to page one when the search term changes", () => {
    const { result } = renderCatalog();

    act(() => {
      result.current.handlePageChange(2);
      result.current.handleSearchChange("action");
    });

    expect(result.current.resolvedPage).toBe(1);
    expect(result.current.paginatedWords.map((word) => word.source)).toEqual(["run"]);
  });

  it("sorts cards from harder levels down to easier ones", () => {
    const { result } = renderCatalog();

    act(() => {
      result.current.handleSortChange("level-desc");
    });

    expect(result.current.paginatedWords.map((word) => word.source)).toEqual([
      "run",
      "pear",
      "apple",
    ]);
  });
});
