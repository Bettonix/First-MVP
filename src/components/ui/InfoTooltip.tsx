"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";

interface InfoTooltipProps {
  text: string;
  /** Posição do balão: "top" (padrão) | "bottom" | "left" | "right" */
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const positionClasses: Record<NonNullable<InfoTooltipProps["position"]>, string> = {
  top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left:   "right-full top-1/2 -translate-y-1/2 mr-2",
  right:  "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowClasses: Record<NonNullable<InfoTooltipProps["position"]>, string> = {
  top:    "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[var(--tooltip-bg)]",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[var(--tooltip-bg)]",
  left:   "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[var(--tooltip-bg)]",
  right:  "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[var(--tooltip-bg)]",
};

export function InfoTooltip({ text, position = "top", className = "" }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center shrink-0 ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <button
        type="button"
        aria-label={text}
        aria-describedby={visible ? "tooltip-content" : undefined}
        tabIndex={0}
        className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brasa)] rounded-full"
      >
        <HelpCircle
          size={14}
          className="text-[var(--ink-3)] hover:text-[var(--brasa)] transition-colors cursor-help"
          aria-hidden="true"
        />
      </button>

      {/* Balão */}
      <span
        id="tooltip-content"
        role="tooltip"
        style={{ ["--tooltip-bg" as string]: "#1e293b" }}
        className={`
          absolute z-[9999] w-max max-w-[220px]
          bg-[#1e293b] text-white text-[11px] font-medium leading-relaxed
          px-3 py-2 rounded-lg shadow-xl
          pointer-events-none select-none
          transition-all duration-150
          ${positionClasses[position]}
          ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        `}
      >
        {text}
        {/* Seta */}
        <span
          aria-hidden="true"
          className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
        />
      </span>
    </span>
  );
}
