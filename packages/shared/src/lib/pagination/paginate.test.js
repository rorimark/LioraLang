import { describe, expect, it } from "vitest";
import { paginate } from "./paginate";

const list = Array.from({ length: 45 }, (_, index) => index + 1);

describe("paginate", () => {
  it("cuts a page and says where it sits", () => {
    expect(paginate(list, 2, 20)).toMatchObject({
      items: list.slice(20, 40),
      currentPage: 2,
      totalPages: 3,
      totalItems: 45,
      rangeStart: 21,
      rangeEnd: 40,
    });
  });

  it("clamps a page that no longer exists", () => {
    expect(paginate(list, 9, 20)).toMatchObject({ currentPage: 3, rangeStart: 41, rangeEnd: 45 });
    expect(paginate(list, "nope", 20).currentPage).toBe(1);
    expect(paginate(list, -2, 20).currentPage).toBe(1);
  });

  it("describes an empty list as one empty page", () => {
    expect(paginate([], 3, 20)).toMatchObject({ items: [], currentPage: 1, totalPages: 1, rangeStart: 0, rangeEnd: 0 });
  });
});
