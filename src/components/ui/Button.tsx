import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[3px] px-6 py-3 text-[0.95rem] font-medium tracking-[-0.01em] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-safecrib-green text-safecrib-white hover:bg-[#0a5f47] active:bg-[#094f3c] focus-visible:outline-safecrib-green",
  secondary:
    "bg-transparent text-safecrib-black border border-black/20 hover:border-black/40 hover:bg-black/[0.03] active:bg-black/[0.06] focus-visible:outline-black/50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, children, ...props }, ref) => {
    return (
      <button ref={ref} className={`${BASE} ${VARIANTS[variant]} ${className ?? ""}`} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
