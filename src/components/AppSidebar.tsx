"use client";

import { useState, useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid, ShoppingCart,
  LayoutDashboard, ClipboardList,
  Settings, Sun, Moon, Lock, Loader2,
} from "lucide-react";
import { updateAccessibilitySettings } from "@/app/actions/accessibility";
import { signOut } from "@/app/login/actions";
import { useCartStore } from "@/store/useCartStore";

const NAV_LINKS = [
  { href: "/",                    icon: ShoppingCart,    label: "Balcão"       },
  { href: "/dashboard",           icon: LayoutDashboard, label: "Dashboard BI" },
  { href: "/dashboard/comandas",  icon: ClipboardList,   label: "Comandas"     },
];

const MOBILE_NAV = [
  { href: "/",                    icon: ShoppingCart,    label: "Balcão"    },
  { href: "/dashboard",           icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/comandas",  icon: ClipboardList,   label: "Comandas"  },
  { href: "/settings",            icon: Settings,        label: "Config."   },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [isSunlight, setIsSunlight]       = useState(false);
  const [isPendingTheme, startTheme]      = useTransition();
  const [isPendingLogout, startLogout]    = useTransition();

  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    setIsSunlight(document.body.classList.contains("sunlight-mode"));
    const observer = new MutationObserver(() => {
      setIsSunlight(document.body.classList.contains("sunlight-mode"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    startTheme(async () => {
      const next = isSunlight ? "dark" : "sunlight";
      await updateAccessibilitySettings(next);
      document.documentElement.classList.toggle("sunlight-mode", next === "sunlight");
      document.body.classList.toggle("sunlight-mode", next === "sunlight");
      setIsSunlight(next === "sunlight");
    });
  };

  const handleLogout = () => {
    startLogout(async () => {
      clearCart();
      await signOut();
      router.push("/login");
      router.refresh();
    });
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
    <aside className="hidden md:flex flex-col items-center py-6 w-[72px] shrink-0 border-r border-white/5 bg-[#0B0D11] z-[100]">
      {/* Logo */}
      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
        <LayoutGrid size={20} className="text-white" />
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-4 flex-1">
        {NAV_LINKS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative border ${
                active
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent"
              }`}
            >
              <Icon size={20} />
              <span className="absolute left-full ml-4 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-xl border border-white/10">
                {label}
              </span>
            </Link>
          );
        })}

        <div className="w-8 h-[1px] bg-white/5 mx-auto my-2" />

        {/* Settings */}
        <Link
          href="/settings"
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative border ${
            isActive("/settings")
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent"
          }`}
        >
          <Settings size={20} />
          <span className="absolute left-full ml-4 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-xl border border-white/10">
            Configurações
          </span>
        </Link>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          disabled={isPendingTheme}
          aria-label={isSunlight ? "Mudar para modo escuro" : "Mudar para modo sol"}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-neutral-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all group relative"
        >
          {isPendingTheme
            ? <Loader2 size={18} className="animate-spin" />
            : isSunlight ? <Moon size={20} /> : <Sun size={20} />}
          <span className="absolute left-full ml-4 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-xl border border-white/10">
            {isSunlight ? "Modo Escuro" : "Modo Sol"}
          </span>
        </button>
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={isPendingLogout}
        aria-label="Sair do sistema"
        className="w-12 h-12 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all group relative mt-auto disabled:opacity-50"
      >
        {isPendingLogout ? <Loader2 size={18} className="animate-spin" /> : <Lock size={20} />}
        <span className="absolute left-full ml-4 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-xl border border-white/10">
          Sair
        </span>
      </button>
    </aside>

    {/* ── Mobile Bottom Navigation ── */}
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-[100] bg-[#0B0D11]/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 pb-safe-or-2"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[52px] ${
              active
                ? "text-emerald-400"
                : "text-neutral-600 active:text-emerald-400"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            <span className={`text-[9px] font-bold uppercase tracking-wider leading-none ${active ? "text-emerald-400" : "text-neutral-600"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
    </>
  );
}
