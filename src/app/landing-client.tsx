"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Zap, BarChart3, ShieldCheck, Users } from "lucide-react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Hero stagger ──────────────────────────────────────────────────────────────
const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.05 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

// ── Scroll reveal (whileInView) ───────────────────────────────────────────────
const scrollReveal = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, type: "spring" as const, stiffness: 260, damping: 22 },
  },
};
const scrollRevealViewport = { once: true, margin: "-50px" };

// ── Nav fade ─────────────────────────────────────────────────────────────────
const navFade = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5 } };

// ─── Dashboard Mockup ────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
      style={{ perspective: "1400px" }}
      className="w-full max-w-5xl mx-auto mt-14 md:mt-20"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        <div className="rounded-3xl p-[3px] shadow-[0_32px_80px_rgba(0,0,0,0.18)]"
          style={{ background: "linear-gradient(135deg, rgba(211,84,0,0.4) 0%, rgba(45,45,45,0.15) 50%, rgba(211,84,0,0.2) 100%)" }}>
          <div className="rounded-[22px] overflow-hidden" style={{ backgroundColor: "#161412" }}>
            <div className="flex items-center gap-2 px-5 py-3.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ff5f57" }} />
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#febc2e" }} />
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#28c840" }} />
              <span className="ml-4 text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                Balcão Rápido · PDV
              </span>
            </div>
            <div className="p-5 md:p-7 grid grid-cols-3 gap-3 md:gap-4">
              {[
                { label: "Vendas Hoje",  value: "R$ 1.840", color: "#D35400" },
                { label: "Pedidos",      value: "47",        color: "#10b981" },
                { label: "Ticket Médio", value: "R$ 39,15", color: "#818cf8" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 md:p-4"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
                  <p className="text-base md:text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
              <div className="col-span-2 rounded-xl p-3 md:p-4"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2.5"
                  style={{ color: "rgba(255,255,255,0.4)" }}>Produtos</p>
                <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                  {["Espetinho", "Coca-Cola", "Fritas", "Combo 1", "Suco", "Água"].map((p) => (
                    <div key={p} className="rounded-lg px-2 py-2 text-center"
                      style={{ backgroundColor: "rgba(211,84,0,0.18)", border: "1px solid rgba(211,84,0,0.3)" }}>
                      <span className="text-[9px] md:text-[10px] font-bold"
                        style={{ color: "rgba(255,255,255,0.9)" }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-3 md:p-4"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2.5"
                  style={{ color: "rgba(255,255,255,0.4)" }}>Carrinho</p>
                <div className="flex flex-col gap-1.5">
                  {[["Espetinho", "R$ 8"], ["Coca-Cola", "R$ 6"]].map(([n, v]) => (
                    <div key={n} className="flex justify-between">
                      <span className="text-[9px] md:text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>{n}</span>
                      <span className="text-[9px] md:text-[10px] font-bold" style={{ color: "#D35400" }}>{v}</span>
                    </div>
                  ))}
                  <div className="mt-1.5 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex justify-between">
                      <span className="text-[10px] md:text-xs font-black" style={{ color: "rgba(255,255,255,0.75)" }}>Total</span>
                      <span className="text-[10px] md:text-xs font-black" style={{ color: "#D35400" }}>R$ 14</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Feature card — scroll reveal ────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc }: {
  icon: React.ElementType; title: string; desc: string;
}) {
  return (
    <motion.div
      variants={scrollReveal}
      initial="hidden"
      whileInView="visible"
      viewport={scrollRevealViewport}
      className="flex flex-col gap-4 p-6 rounded-2xl bg-white border border-stone-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
      style={{ borderTop: "2px solid #D35400" }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(211,84,0,0.08)", border: "1px solid rgba(211,84,0,0.15)" }}>
        <Icon size={20} style={{ color: "#D35400" }} />
      </div>
      <h3 className="font-black text-base text-stone-900">{title}</h3>
      <p className="text-sm leading-relaxed text-stone-500">{desc}</p>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingClient() {
  return (
    <div className="w-full min-h-screen flex flex-col" style={{ backgroundColor: "#F9F7F2" }}>

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div style={{
          position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: "900px", height: "600px",
          background: "radial-gradient(ellipse, rgba(211,84,0,0.07) 0%, transparent 68%)",
        }} />
      </div>

      {/* ── Nav ── */}
      <motion.nav
        {...navFade}
        className="relative z-10 w-full px-6 py-4 sticky top-0"
        style={{
          backgroundColor: "rgba(249,247,242,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(45,45,45,0.08)",
          boxShadow: "0 1px 12px rgba(45,45,45,0.05)",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 text-white"
              style={{ background: "linear-gradient(135deg, #D35400 0%, #B84A00 100%)", boxShadow: "0 2px 8px rgba(211,84,0,0.3)" }}>
              B
            </span>
            <span className="font-black text-base tracking-tight text-stone-900">Balcão Rápido</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="text-sm font-semibold px-4 py-2 rounded-xl text-stone-600 hover:text-stone-900 transition-colors">
              Entrar
            </Link>
            <motion.div
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link href="/login"
                className="text-sm font-black px-5 py-2.5 rounded-xl text-white transition-all hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, #D35400 0%, #B84A00 100%)", boxShadow: "0 2px 8px rgba(211,84,0,0.25)", display: "block" }}>
                Começar grátis
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-6 py-20 md:py-28 text-center">
        <motion.div
          className="max-w-4xl mx-auto flex flex-col items-center gap-7"
          variants={heroContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div
            variants={heroItem}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
            style={{ backgroundColor: "rgba(211,84,0,0.08)", border: "1px solid rgba(211,84,0,0.2)", color: "#B84A00" }}
          >
            <Zap size={11} /> PDV para restaurantes modernos
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={heroItem}
            className="font-black leading-[1.05] tracking-tighter text-4xl md:text-6xl lg:text-7xl"
          >
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #1c1917 0%, #44403c 100%)" }}>
              Venda mais rápido.
            </span>
            <br />
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)" }}>
              Controle tudo.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={heroItem}
            className="max-w-xl text-base md:text-lg leading-relaxed font-medium"
            style={{ color: "#4A4A4A" }}
          >
            Sistema de PDV completo para espetinhos, lanchonetes e restaurantes.
            Caixa, estoque, histórico e relatórios — tudo em um só lugar.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={heroItem} className="flex flex-col sm:flex-row items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link
                href="/login"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base text-white"
                style={{ background: "linear-gradient(135deg, #D35400 0%, #B84A00 100%)", boxShadow: "0 8px 24px rgba(211,84,0,0.35)" }}
              >
                Começar agora <ArrowRight size={18} />
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link
                href="/login"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base bg-white border border-stone-200 text-stone-800 hover:border-stone-300 hover:shadow-md transition-all"
              >
                Ver demonstração
              </Link>
            </motion.div>
          </motion.div>

          {/* Mockup */}
          <DashboardMockup />
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 w-full px-6 py-20 border-t border-stone-200">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            variants={scrollReveal}
            initial="hidden"
            whileInView="visible"
            viewport={scrollRevealViewport}
            className="text-center font-black text-2xl md:text-3xl lg:text-4xl mb-3 tracking-tight"
            style={{ color: "#1c1917" }}
          >
            Tudo que você precisa para vender
          </motion.h2>
          <motion.p
            variants={scrollReveal}
            initial="hidden"
            whileInView="visible"
            viewport={scrollRevealViewport}
            className="text-center mb-12 text-base md:text-lg"
            style={{ color: "#6B6B6B" }}
          >
            Sem complexidade. Sem mensalidades escondidas.
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard icon={Zap}         title="PDV Ultrarrápido"         desc="Interface otimizada para toque. Finalize pedidos em segundos, sem travar." />
            <FeatureCard icon={BarChart3}   title="Relatórios em Tempo Real"  desc="Acompanhe vendas, ticket médio e métodos de pagamento ao vivo." />
            <FeatureCard icon={ShieldCheck} title="Multi-Tenant Seguro"       desc="Cada loja tem seus dados isolados. Operadores com permissões separadas." />
            <FeatureCard icon={Users}       title="Gestão de Equipe"          desc="Crie operadores, defina PINs e controle quem acessa o quê." />
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="relative z-10 w-full px-6 py-20 border-t border-stone-200">
        <motion.div
          variants={scrollReveal}
          initial="hidden"
          whileInView="visible"
          viewport={scrollRevealViewport}
          className="max-w-2xl mx-auto flex flex-col items-center gap-6 text-center"
        >
          <h2 className="font-black text-2xl md:text-3xl lg:text-4xl tracking-tight" style={{ color: "#1c1917" }}>
            Pronto para acelerar suas vendas?
          </h2>
          <p className="text-base md:text-lg" style={{ color: "#6B6B6B" }}>
            Comece gratuitamente. Sem cartão de crédito.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Link
              href="/login"
              className="flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-base text-white"
              style={{ background: "linear-gradient(135deg, #D35400 0%, #B84A00 100%)", boxShadow: "0 8px 24px rgba(211,84,0,0.35)" }}
            >
              Criar conta grátis <ArrowRight size={18} />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full px-6 py-8 text-center border-t border-stone-200">
        <p className="text-xs" style={{ color: "#9A9A9A" }}>
          © {new Date().getFullYear()} Balcão Rápido. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
