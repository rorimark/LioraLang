import { render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { useDialogA11y } from "./useDialogA11y";

const Dialog = ({ onClose }) => {
  const ref = useRef(null);
  useDialogA11y({ isOpen: true, containerRef: ref, onClose });

  return (
    <div ref={ref}>
      <input name="first" data-autofocus />
      <input name="second" />
    </div>
  );
};

const nextFrame = () => new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

describe("useDialogA11y", () => {
  it("does not move the focus when the close handler changes", async () => {
    const view = render(<Dialog onClose={() => {}} />);
    await nextFrame();
    expect(document.activeElement?.getAttribute("name")).toBe("first");

    view.container.querySelector("[name=second]").focus();
    view.rerender(<Dialog onClose={() => {}} />);
    await nextFrame();

    expect(document.activeElement?.getAttribute("name")).toBe("second");
  });
});
