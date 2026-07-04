"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  open,
  onClose,
  children,
  className,
  title,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-brand-ink/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative bg-brand-ivory z-10 overflow-auto w-full max-h-[88vh] sm:max-h-[90vh] rounded-t-sm sm:rounded-none shadow-[0_40px_120px_-30px_rgba(11,10,9,0.5)] ring-1 ring-brand-ivory-deep",
              {
                "sm:max-w-sm": size === "sm",
                "sm:max-w-lg": size === "md",
                "sm:max-w-2xl": size === "lg",
              },
              className
            )}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#888] hover:text-brand-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              aria-label="Close"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
            {title && (
              <div className="px-7 pt-7 pb-4 border-b border-brand-ivory-deep">
                <h2 className="font-display italic text-2xl font-light text-brand-ink text-balance pr-8">{title}</h2>
                <span className="mt-3 block h-px w-12 gold-rule-solid opacity-70" />
              </div>
            )}
            <div className={title ? "p-7" : "p-7 pt-12"}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
