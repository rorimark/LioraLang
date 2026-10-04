import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MathText } from "./MathText";
vi.mock("@shared/lib/i18n", () => ({useI18n: () => ({t:key => key})}));

describe("math text rendering", () => {
  it("renders fractions in a sentence with accessible math and retains prose", async () => {
    const {container} = render(<span> <MathText>{String.raw`The ratio is $\frac{1}{2}$ exactly.`}</MathText></span>);
    await waitFor(() => expect(container.querySelector(".katex")).not.toBeNull());
    expect(container.textContent).toContain("The ratio is ");
    expect(container.textContent).toContain(" exactly.");
    expect(container.querySelector("math mfrac")).not.toBeNull();
    expect(container.querySelector(".math-formula--inline")).not.toBeNull();
  });
  it("shows malformed math as literal source without injecting content", async () => {
    const text = String.raw`Try $\frac{a$ <script>alert(1)</script>`;
    const {container} = render(<MathText>{text}</MathText>);
    await waitFor(() => expect(container.textContent).toBe(text));
    expect(container.querySelector("script")).toBeNull();
  });
});
