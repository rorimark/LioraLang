import { describe, expect, it } from "vitest";
import { resolveSubjectProfile } from "./appearances.js";

describe("appearance catalog extension", () => {
  it("accepts a future technology without changing the resolver", () => {
    const profile = { id: "programming", appearanceField: "technology",
      presentation: { layout: "code" }, assistant: { kind: "concepts" },
      appearances: [{ aliases: ["python"], overrides: {
        presentation: { skin: "future-python" }, assistant: { instruction: "Python examples" },
      } }],
    };
    const result = resolveSubjectProfile(profile, { technology: "Python 3.14" });
    expect(result.presentation).toEqual({ layout: "code", skin: "future-python" });
    expect(result.assistant).toEqual({ kind: "concepts", instruction: "Python examples" });
    expect(profile.presentation.skin).toBeUndefined();
    expect(Object.isFrozen(result.presentation)).toBe(true);
    expect(resolveSubjectProfile(profile, { technology: "Rust" })).toBe(profile);
  });
  it("works for another subject and another existing field", () => {
    const profile = { id: "future-science", appearanceField: "area", presentation: { layout: "lab" },
      appearances: [{ aliases: ["chemistry"], overrides: { presentation: { skin: "molecules" } } }],
    };
    expect(resolveSubjectProfile(profile, { area: "Chemistry" }).presentation.skin).toBe("molecules");
  });
});
