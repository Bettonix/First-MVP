"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

interface PremiumSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  name?: string;
  onBlur?: () => void;
}

const GAP = 6;
const PADDING = 8;

interface DropdownStyle {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

export function PremiumSelect({ options, value, onChange, className, onBlur }: PremiumSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [dropStyle, setDropStyle] = useState<DropdownStyle>({ top: 0, left: 0, width: 0, maxHeight: 240 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or scroll (ignoring events inside the menu itself)
  useEffect(() => {
    if (!isOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const closeOnScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [isOpen]);

  const open = () => {
    if (!triggerRef.current) { setIsOpen(true); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - GAP - PADDING;
    const spaceAbove = rect.top - GAP - PADDING;
    const goUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    setDropUp(goUp);
    setDropStyle({
      top:    goUp ? undefined : rect.bottom + GAP + window.scrollY,
      bottom: goUp ? window.innerHeight - rect.top + GAP - window.scrollY : undefined,
      left:   rect.left + window.scrollX,
      width:  rect.width,
      maxHeight: Math.max(120, goUp ? spaceAbove : spaceBelow),
    });
    setIsOpen(true);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    onBlur?.();
  };

  const menu = isOpen && (
    <div
      style={{
        position: "fixed",
        top:      dropUp ? undefined : dropStyle.top,
        bottom:   dropUp ? dropStyle.bottom : undefined,
        left:     dropStyle.left,
        width:    dropStyle.width,
        maxHeight: dropStyle.maxHeight,
        zIndex:   9999,
      }}
      className="
        bg-[var(--porcelana)]
        border dash-border
        rounded-2xl shadow-2xl shadow-slate-300/40 dark:shadow-black/60
        overflow-y-auto overscroll-contain
        py-1
      "
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onMouseDown={(e) => e.preventDefault()} // prevent blur before click
          onClick={() => handleSelect(opt)}
          className={`
            w-full text-left px-4 py-3 text-sm font-semibold
            flex items-center justify-between gap-3
            transition-colors duration-100
            ${value === opt
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
              : "dash-value dash-row-hover"
            }
          `}
        >
          {opt}
          {value === opt && <Check size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className={`${className} flex items-center justify-between gap-2 w-full`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 dash-label transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {typeof document !== "undefined" && menu && createPortal(menu, document.body)}
    </>
  );
}
