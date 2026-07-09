import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[#FF7A59] bg-[#FF7A59] text-white shadow-sm hover:border-[#f16642] hover:bg-[#f16642] disabled:border-[#ffc0ad] disabled:bg-[#ffc0ad]",
  secondary:
    "border-[#BFE7E0] bg-[#DDF5F1] text-[#0F766E] hover:border-[#9EDAD1] hover:bg-[#CDEEE9]",
  ghost: "border-[#E5E7EB] bg-white text-[#111827] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]",
  danger: "border-red-100 bg-red-50 text-red-700 hover:border-red-200 hover:bg-red-100"
};

export function Button({
  children,
  className = "",
  icon,
  type = "button",
  variant = "ghost",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4",
        "text-sm font-semibold transition focus-visible:outline focus-visible:outline-2",
        "focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]",
        "disabled:cursor-not-allowed disabled:opacity-70",
        variantClasses[variant],
        className
      ].join(" ")}
      type={type}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
