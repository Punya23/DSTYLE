import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={id}
            className="text-[10px] font-sans font-medium tracking-[0.2em] uppercase text-brand-ink"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full border border-brand-ivory-deep bg-white px-4 py-3 text-sm font-sans text-brand-ink placeholder:text-[#a89f92] transition-[border-color,box-shadow] duration-300 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/30",
            { "border-brand-wine focus:border-brand-wine focus:ring-brand-wine/25": !!error },
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-sans text-brand-wine">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
