import { describe, expect, it } from "vitest";
import {
  filterSelectOptions,
  findTypeaheadIndex,
  readSelectOptions,
  stepSelectIndex,
} from "./selectOptions";

const LANGUAGES = ["English", "Polish", "Portuguese", "Ukrainian", "Español"].map((label) => ({
  value: label,
  label,
  disabled: false,
}));

describe("readSelectOptions", () => {
  it("reads option children like a native select, including groups", () => {
    const options = readSelectOptions(
      <>
        <option value="">None</option>
        <option value="en">English</option>
        <optgroup label="More">
          <option value={25}>25 {"per page"}</option>
          <option disabled>Soon</option>
        </optgroup>
        {false}
      </>,
    );

    expect(options).toEqual([
      { value: "", label: "None", disabled: false },
      { value: "en", label: "English", disabled: false },
      { value: "25", label: "25 per page", disabled: false },
      { value: "Soon", label: "Soon", disabled: true },
    ]);
  });
});

describe("filterSelectOptions", () => {
  it("keeps options containing every typed word, ignoring case and accents", () => {
    expect(filterSelectOptions(LANGUAGES, "pol").map((o) => o.label)).toEqual(["Polish"]);
    expect(filterSelectOptions(LANGUAGES, "espa").map((o) => o.label)).toEqual(["Español"]);
    expect(filterSelectOptions(LANGUAGES, "  ")).toBe(LANGUAGES);
  });
});

describe("findTypeaheadIndex", () => {
  it("jumps to the next match after the current one and wraps", () => {
    expect(findTypeaheadIndex(LANGUAGES, "p", -1)).toBe(1);
    expect(findTypeaheadIndex(LANGUAGES, "p", 1)).toBe(2);
    expect(findTypeaheadIndex(LANGUAGES, "p", 2)).toBe(1);
    expect(findTypeaheadIndex(LANGUAGES, "x", 0)).toBe(-1);
  });
});

describe("stepSelectIndex", () => {
  it("skips disabled options and stops at the ends", () => {
    const options = [
      { label: "a", disabled: false },
      { label: "b", disabled: true },
      { label: "c", disabled: false },
    ];

    expect(stepSelectIndex(options, 0, 1)).toBe(2);
    expect(stepSelectIndex(options, 2, 1)).toBe(2);
    expect(stepSelectIndex(options, 2, -1)).toBe(0);
  });
});
