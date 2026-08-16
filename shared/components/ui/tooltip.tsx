"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, className, side = "top" }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (side === "top") {
        setCoords({
          top: rect.top - 6,
          left: Math.max(8, rect.left),
        });
      } else if (side === "bottom") {
        setCoords({
          top: rect.bottom + 6,
          left: Math.max(8, rect.left),
        });
      } else if (side === "right") {
        setCoords({
          top: rect.top + rect.height / 2,
          left: rect.right + 8,
        });
      } else if (side === "left") {
        setCoords({
          top: rect.top + rect.height / 2,
          left: rect.left - 8,
        });
      }
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setOpen(false);
  };

  if (!content) return <>{children}</>;

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex items-center max-w-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {open && mounted && coords && createPortal(
        <div
          role="tooltip"
          style={{
            position: "fixed",
            left: side === "left" ? undefined : `${coords.left}px`,
            right: side === "left" ? `${window.innerWidth - coords.left}px` : undefined,
            top: (side === "right" || side === "left") ? `${coords.top}px` : (side === "bottom" ? `${coords.top}px` : undefined),
            bottom: side === "top" ? `${window.innerHeight - coords.top}px` : undefined,
            transform: (side === "right" || side === "left") ? "translateY(-50%)" : undefined,
          }}
          className={cn(
            "z-[9999] px-2.5 py-1.5 text-[11px] leading-snug font-normal text-white bg-slate-900/95 backdrop-blur-xs rounded shadow-lg animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap pointer-events-none",
            className
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-0 h-0",
              side === "top" && "top-full left-3 border-x-4 border-x-transparent border-t-4 border-t-slate-900/95",
              side === "bottom" && "bottom-full left-3 border-x-4 border-x-transparent border-b-4 border-b-slate-900/95",
              side === "right" && "right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900/95",
              side === "left" && "left-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-l-4 border-l-slate-900/95"
            )}
          />
        </div>,
        document.body
      )}
    </>
  );
}
