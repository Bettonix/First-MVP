"use client";

import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Share2, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { CartItem } from "@/store/useCartStore";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ReceiptData {
  nomeLoja: string;
  items: CartItem[];
  totalCentavos: number;
  metodoPagamento: string;
  criadoEm: Date;
  instagramUrl?: string;
  troco?: number;
}

interface ReceiptModalProps {
  isOpen: boolean;
  data: ReceiptData | null;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function metodoLabel(m: string) {
  if (m === "PIX") return "PIX";
  if (m === "DINHEIRO") return "Dinheiro";
  if (m === "MISTO") return "Misto (PIX + Dinheiro)";
  return m;
}

// ─── Thermal Receipt (componente oculto para impressão/PDF) ───────────────────
export function ThermalReceipt({ data }: { data: ReceiptData }) {
  const subtotal = data.items.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0);
  const qrValue = data.instagramUrl || `https://wa.me/?text=${encodeURIComponent(`${data.nomeLoja} - Recibo`)}`;

  return (
    <div
      id="thermal-receipt"
      style={{
        width: "72mm",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "11px",
        color: "#000",
        backgroundColor: "#fff",
        padding: "4mm 3mm",
        lineHeight: 1.4,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "6px", borderBottom: "1px dashed #000", paddingBottom: "6px" }}>
        <div style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "-0.5px", fontFamily: "Georgia, serif" }}>
          {data.nomeLoja}
        </div>
        <div style={{ fontSize: "9px", marginTop: "2px", color: "#444" }}>
          {fmtDate(data.criadoEm)} às {fmtTime(data.criadoEm)}
        </div>
      </div>

      {/* Items */}
      <div style={{ marginBottom: "6px" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px", color: "#555" }}>
          ITENS
        </div>
        {data.items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "44mm" }}>
              {item.quantidade}x {item.nome}
            </span>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap", marginLeft: "4px" }}>
              {fmt(item.precoCentavos * item.quantidade)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ borderTop: "1px dashed #000", paddingTop: "6px", marginBottom: "6px" }}>
        {subtotal !== data.totalCentavos && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555" }}>
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "13px", marginTop: "2px" }}>
          <span>TOTAL</span>
          <span>{fmt(data.totalCentavos)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555", marginTop: "2px" }}>
          <span>Pagamento</span>
          <span>{metodoLabel(data.metodoPagamento)}</span>
        </div>
        {data.troco != null && data.troco > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555" }}>
            <span>Troco</span>
            <span>{fmt(data.troco)}</span>
          </div>
        )}
      </div>

      {/* QR Code */}
      <div style={{ borderTop: "1px dashed #000", paddingTop: "6px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
        <QRCodeSVG value={qrValue} size={56} level="L" />
        <div style={{ fontSize: "8px", color: "#666", textAlign: "center" }}>
          {data.instagramUrl ? "Siga-nos no Instagram" : "Obrigado pela preferência!"}
        </div>
        <div style={{ fontSize: "9px", fontWeight: 700, textAlign: "center", marginTop: "4px" }}>
          Volte sempre! ♥
        </div>
      </div>
    </div>
  );
}

// ─── Digital Receipt (preview no modal) ───────────────────────────────────────
function DigitalReceiptPreview({ data }: { data: ReceiptData }) {
  const subtotal = data.items.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0);

  return (
    <div
      id="digital-receipt"
      style={{
        backgroundColor: "#F9F7F2",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
        color: "#2D2D2D",
        padding: "32px",
        borderRadius: "16px",
        maxWidth: "420px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "24px", paddingBottom: "20px", borderBottom: "2px solid #D35400" }}>
        <div style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontSize: "26px",
          fontWeight: 800,
          color: "#2D2D2D",
          letterSpacing: "-0.5px",
          lineHeight: 1.1,
        }}>
          {data.nomeLoja}
        </div>
        <div style={{ fontSize: "12px", color: "#9A9A9A", marginTop: "6px", fontWeight: 600 }}>
          {fmtDate(data.criadoEm)} · {fmtTime(data.criadoEm)}
        </div>
      </div>

      {/* Items */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9A9A9A", marginBottom: "10px" }}>
          ITENS DO PEDIDO
        </div>
        {data.items.map((item, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            backgroundColor: i % 2 === 0 ? "#FFFFFF" : "transparent",
            borderRadius: "8px",
            marginBottom: "2px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                backgroundColor: "#FDF0E8",
                color: "#D35400",
                fontWeight: 800,
                fontSize: "11px",
                padding: "2px 7px",
                borderRadius: "6px",
              }}>
                {item.quantidade}×
              </span>
              <span style={{ fontWeight: 600, fontSize: "13px" }}>{item.nome}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "#4A4A4A" }}>
              {fmt(item.precoCentavos * item.quantidade)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "20px",
        border: "1px solid rgba(45,45,45,0.08)",
        borderTop: "2px solid #D35400",
      }}>
        {subtotal !== data.totalCentavos && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9A9A9A", marginBottom: "6px" }}>
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#6B6B6B" }}>Total pago</span>
          <span style={{ fontWeight: 900, fontSize: "22px", color: "#D35400", letterSpacing: "-0.5px" }}>
            {fmt(data.totalCentavos)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9A9A9A", marginTop: "6px" }}>
          <span>Forma de pagamento</span>
          <span style={{ fontWeight: 600 }}>{metodoLabel(data.metodoPagamento)}</span>
        </div>
        {data.troco != null && data.troco > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9A9A9A", marginTop: "4px" }}>
            <span>Troco</span>
            <span style={{ fontWeight: 600 }}>{fmt(data.troco)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "11px", color: "#9A9A9A" }}>
        {data.instagramUrl && (
          <div style={{ marginBottom: "4px", fontWeight: 600 }}>
            📸 {data.instagramUrl.replace("https://www.instagram.com/", "@").replace("https://instagram.com/", "@")}
          </div>
        )}
        <div style={{ fontWeight: 700, color: "#D35400" }}>Obrigado pela preferência! ♥</div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ─────────────────────────────────────────────────────────────
export function ReceiptModal({ isOpen, data, onClose }: ReceiptModalProps) {
  const thermalRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const el = document.getElementById("thermal-receipt");
    if (!el) return;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Recibo — ${data?.nomeLoja}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #fff; }
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>${el.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  }, [data]);

  const handleDownloadPDF = useCallback(async () => {
    if (!data) return;
    const el = document.getElementById("digital-receipt");
    if (!el) return;

    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#F9F7F2",
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
      pdf.save(`recibo-${data.nomeLoja.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`);
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
    }
  }, [data]);

  const handleShare = useCallback(async () => {
    if (!data) return;
    const itemsText = data.items.map(i => `${i.quantidade}x ${i.nome} — ${fmt(i.precoCentavos * i.quantidade)}`).join("\n");
    const text = `🧾 *${data.nomeLoja}*\n\n${itemsText}\n\n*Total: ${fmt(data.totalCentavos)}*\nPagamento: ${metodoLabel(data.metodoPagamento)}\n\n${data.instagramUrl ? `📸 ${data.instagramUrl}` : "Obrigado pela preferência! ♥"}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Recibo — ${data.nomeLoja}`, text });
        return;
      } catch {
        // fallback para WhatsApp
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, [data]);

  if (!data) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92dvh]"
            style={{ backgroundColor: "var(--parchment)", border: "1px solid var(--border-md)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--porcelana)" }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-4)" }}>Comprovante</p>
                <h3 className="font-black text-base" style={{ color: "var(--ink)", fontFamily: "var(--font-serif)" }}>
                  {data.nomeLoja}
                </h3>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: "var(--muted)", color: "var(--ink-3)" }}>
                <X size={16} />
              </button>
            </div>

            {/* Scrollable preview */}
            <div className="flex-1 overflow-y-auto p-4">
              <DigitalReceiptPreview data={data} />
            </div>

            {/* Actions */}
            <div className="px-4 pb-6 pt-3 grid grid-cols-3 gap-2 shrink-0"
              style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--porcelana)" }}>
              <button
                onClick={handlePrint}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl font-bold text-xs transition-all"
                style={{ backgroundColor: "var(--muted)", color: "var(--ink-2)", border: "1px solid var(--border-md)" }}
              >
                <Printer size={18} />
                Imprimir
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl font-bold text-xs transition-all"
                style={{ backgroundColor: "var(--muted)", color: "var(--ink-2)", border: "1px solid var(--border-md)" }}
              >
                <Download size={18} />
                PDF
              </button>
              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl font-bold text-xs transition-all text-white"
                style={{ backgroundColor: "var(--brasa)", border: "1px solid var(--brasa-border)" }}
              >
                <Share2 size={18} />
                Enviar
              </button>
            </div>
          </motion.div>

          {/* Hidden thermal receipt for printing */}
          <div ref={thermalRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
            <ThermalReceipt data={data} />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
