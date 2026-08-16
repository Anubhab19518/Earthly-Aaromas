import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "underline";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full transition-colors text-xs font-medium outline-none disabled:cursor-not-allowed disabled:opacity-50",
          variant === "underline"
            ? "bg-transparent border-0 border-b border-slate-300 rounded-none px-1 py-1 text-slate-900 focus:border-blue-600 focus:ring-0 placeholder:text-slate-400"
            : "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
