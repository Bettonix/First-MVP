"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid, ShoppingCart,
  LayoutDashboard, ClipboardList,
  Settings, Lock, Loader2, History,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { useCartStore } from "@/store/useCartStore";
import type { UserRole } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/",                    icon: ShoppingCart,    label: "Balcão"       },
  { href: "/dashboard",           icon: LayoutDashboard, label: "Dashboard BI" },
  { href: "/dashboard/comandas",  icon: ClipboardList,   label: "Comandas"     },
  { href: "/historico",           icon: History,         label: "Histórico"    },
];

const MOBILE_NAV = [
  { href: "/",                    icon: ShoppingCart,    label: "Balcão"    },
  { href: "/dashboard",           icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/comandas",  icon: ClipboardList,   label: "Comandas"  },
  { href: "/historico",           icon: History,         label: "Histórico" },
  { href: "/settings",            icon: Settings,        label: "Config."   },
];

export function AppSidebar({ userRole = "GERENTE" }: { userRole?: UserRole }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [isPendingLogout, startLogout] = useTransition();
  const clearCart = useCartStore((s) => s.clearCart);

  const handleLogout = () => {
    startLogout(async () => {
      clearCart();
      await signOut();
      router.push("/login");
    });
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
    <aside className="hidden md:flex flex-col items-center py-6 w-[72px] shrink-0 border-r z-[100]"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--porcelana)" }}>
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-8 shadow-md"
        style={{ background: "linear-gradient(135deg, #D35400 0%, #B84A00 100%)", boxShadow: "0 4px 12px rgba(211,84,0,0.25)" }}>
        <LayoutGrid size={20} className="text-white" />
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-4 flex-1">
        {NAV_LINKS
          .filter(({ href }) => userRole === "GERENTE" || !href.startsWith("/dashboard"))
          .map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative border"
              style={{
                backgroundColor: active ? "var(--brasa-light)" : "transparent",
                color: active ? "var(--brasa)" : "var(--ink-3)",
                borderColor: active ? "var(--brasa-border)" : "transparent",
                borderTopColor: active ? "var(--brasa)" : "transparent",
                borderTopWidth: active ? "2px" : "1px",
              }}
            >
              <Icon size={20} />
              <span className="absolute left-full ml-4 text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-lg"
                style={{ backgroundColor: "var(--porcelana)", color: "var(--ink)", border: "1px solid var(--border-md)" }}>
                {label}
              </span>
            </Link>
          );
        })}

        <div className="w-8 h-[1px] mx-auto my-2" style={{ backgroundColor: "var(--border-md)" }} />

        {/* Settings — apenas GERENTE */}
        {userRole === "GERENTE" && (
          <Link
            href="/settings"
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative border"
            style={{
              backgroundColor: isActive("/settings") ? "var(--brasa-light)" : "transparent",
              color: isActive("/settings") ? "var(--brasa)" : "var(--ink-3)",
              borderColor: isActive("/settings") ? "var(--brasa-border)" : "transparent",
              borderTopColor: isActive("/settings") ? "var(--brasa)" : "transparent",
              borderTopWidth: isActive("/settings") ? "2px" : "1px",
            }}
          >
            <Settings size={20} />
            <span className="absolute left-full ml-4 text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-lg"
              style={{ backgroundColor: "var(--porcelana)", color: "var(--ink)", border: "1px solid var(--border-md)" }}>
              Configurações
            </span>
          </Link>
        )}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={isPendingLogout}
        aria-label="Sair do sistema"
        className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative mt-auto disabled:opacity-50"
        style={{ color: "var(--ink-3)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9B1C1C"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--danger-bg)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
      >
        {isPendingLogout ? <Loader2 size={18} className="animate-spin" /> : <Lock size={20} />}
        <span className="absolute left-full ml-4 text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-lg"
          style={{ backgroundColor: "var(--porcelana)", color: "var(--ink)", border: "1px solid var(--border-md)" }}>
          Sair
        </span>
      </button>
    </aside>

    {/* ── Mobile Bottom Navigation ── */}
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-[100] backdrop-blur-xl flex items-center justify-around px-2"
      style={{
        backgroundColor: "rgba(249,247,242,0.97)",
        borderTop: "1px solid var(--border-md)",
        boxShadow: "0 -1px 12px rgba(45,45,45,0.06)",
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      {MOBILE_NAV
        .filter(({ href }) => userRole === "GERENTE" || (!href.startsWith("/dashboard") && href !== "/settings"))
        .map(({ href, icon: Icon, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[52px]"
            style={{ color: active ? "var(--brasa)" : "var(--ink-4)" }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
    </>
  );
}
