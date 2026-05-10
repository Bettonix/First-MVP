"use client";

import { HelpCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface InfoTooltipProps {
  text: string;
  /** Posição preferida do balão: "top" (padrão) | "bottom" | "left" | "right" */
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function InfoTooltip({ text, position = "top", className = "" }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [offset, setOffset] = useState(0);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Ajusta posição horizontal para não sair da tela em mobile
  useEffect(() => {
    if (!visible || !tooltipRef.current || (position !== "top" && position !== "bottom")) return;

    const rect = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const margin = 8;

    if (rect.left < margin) {
      setOffset(margin - rect.left);
    } else if (rect.right > vw - margin) {
      setOffset(vw - margin - rect.right);
    } else {
      setOffset(0);
    }
  }, [visible, position]);

  const isVertical = position === "top" || position === "bottom";

  const positionClass = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  }[position];

  const arrowClass = {
    top:    "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[#1e293b]",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[#1e293b]",
    left:   "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#1e293b]",
    right:  "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#1e293b]",
  }[position];

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex items-center shrink-0 ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span
        role="img"
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
      </span>

      {/* Balão */}
      <span
        ref={tooltipRef}
        id="tooltip-content"
        role="tooltip"
        style={isVertical && offset !== 0 ? { transform: `translateX(calc(-50% + ${offset}px))` } : undefined}
        className={`
          absolute z-[9999] w-max max-w-[min(220px,calc(100vw-32px))]
          bg-[#1e293b] text-white text-[11px] font-medium leading-relaxed
          px-3 py-2 rounded-lg shadow-xl
          pointer-events-none select-none
          transition-all duration-150
          ${positionClass}
          ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        `}
      >
        {text}
        {/* Seta */}
        <span
          aria-hidden="true"
          className={`absolute w-0 h-0 border-4 ${arrowClass}`}
        />
      </span>
    </span>
  );
}
