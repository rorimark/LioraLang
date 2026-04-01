import { forwardRef, memo } from "react";
import "./Button.css";

const resolveButtonClassName = ({
  variant,
  size,
  fullWidth,
  isLoading,
  className,
}) => {
  return [
    "ui-button",
    variant ? `ui-button--${variant}` : "",
    size ? `ui-button--${size}` : "",
    fullWidth ? "ui-button--full" : "",
    isLoading ? "ui-button--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
};

export const Button = memo(
  forwardRef(
    (
      {
        type = "button",
        variant = "secondary",
        size = "md",
        fullWidth = false,
        isLoading = false,
        className = "",
        disabled = false,
        ...props
      },
      ref,
    ) => {
      return (
        <button
          ref={ref}
          type={type}
          className={resolveButtonClassName({
            variant,
            size,
            fullWidth,
            isLoading,
            className,
          })}
          disabled={disabled || isLoading}
          aria-busy={isLoading || undefined}
          {...props}
        />
      );
    },
  ),
);

Button.displayName = "Button";
