import { useCallback } from "react";
import confetti from "canvas-confetti";

const BRAND_COLORS = [
  "#D35400", // brasa laranja
  "#F59E0B", // dourado âmbar
  "#FFFFFF", // branco
  "#059669", // esmeralda
  "#B84A00", // laranja escuro
  "#FCD34D", // amarelo ouro
];

const GLITTER_COLORS = [
  "#FFD700", "#FFF8DC", "#FFFACD",
  "#D35400", "#F59E0B", "#FFFFFF",
];

function cannon(
  origin: { x: number; y: number },
  angle: number,
  spread: number,
  count: number,
  scalar = 1,
) {
  confetti({
    particleCount: count,
    angle,
    spread,
    origin,
    colors: BRAND_COLORS,
    gravity: 1.1,
    drift: angle > 90 ? -0.4 : 0.4,
    scalar,
    ticks: 280,
    shapes: ["circle", "square"],
    zIndex: 9999,
  });

  // Stars mixed in
  confetti({
    particleCount: Math.floor(count * 0.3),
    angle,
    spread: spread * 0.7,
    origin,
    colors: BRAND_COLORS,
    gravity: 0.9,
    drift: angle > 90 ? -0.2 : 0.2,
    scalar: scalar * 1.2,
    ticks: 320,
    shapes: ["circle", "square"],
    zIndex: 9999,
  });
}

function glitterBurst() {
  // Chuva de glitter dourado do topo
  const count = 80;
  const defaults = {
    startVelocity: 18,
    spread: 360,
    ticks: 180,
    gravity: 0.6,
    decay: 0.92,
    scalar: 0.6,
    colors: GLITTER_COLORS,
    shapes: ["circle" as const],
    zIndex: 9999,
  };

  confetti({ ...defaults, particleCount: count, origin: { x: 0.2, y: 0.1 } });
  confetti({ ...defaults, particleCount: count, origin: { x: 0.5, y: 0.05 } });
  confetti({ ...defaults, particleCount: count, origin: { x: 0.8, y: 0.1 } });
}

export function useFirstSaleConfetti() {
  const fireConfetti = useCallback(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("hasMadeFirstSale")) return;

    localStorage.setItem("hasMadeFirstSale", "1");

    // Canhão esquerdo
    cannon({ x: 0, y: 0.75 }, 60, 55, 60, 1.1);

    // Canhão direito (espelhado)
    setTimeout(() => {
      cannon({ x: 1, y: 0.75 }, 120, 55, 60, 1.1);
    }, 150);

    // Canhão central — burst principal
    setTimeout(() => {
      cannon({ x: 0.5, y: 0.65 }, 90, 80, 80, 1.3);
    }, 300);

    // Segundo burst lateral reforçado
    setTimeout(() => {
      cannon({ x: 0.1, y: 0.8 }, 65, 45, 40, 0.9);
      cannon({ x: 0.9, y: 0.8 }, 115, 45, 40, 0.9);
    }, 500);

    // Glitter dourado final
    setTimeout(glitterBurst, 650);

    // Fade-out suave com partículas leves
    setTimeout(() => {
      confetti({
        particleCount: 30,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors: GLITTER_COLORS,
        gravity: 0.4,
        scalar: 0.5,
        ticks: 200,
        shapes: ["circle"],
        zIndex: 9999,
      });
    }, 1100);
  }, []);

  return { fireConfetti };
}
