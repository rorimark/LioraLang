import { forwardRef, memo } from "react";
import "./TextInput.css";

const resolveInputClassName = ({ size, className }) => {
  return ["ui-input", size ? `ui-input--${size}` : "", className]
    .filter(Boolean)
    .join(" ");
};

export const TextInput = memo(
  forwardRef(({ size = "md", className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={resolveInputClassName({ size, className })}
        {...props}
      />
    );
  }),
);

TextInput.displayName = "TextInput";
