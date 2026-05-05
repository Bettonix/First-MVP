"use client";

import { useCallback, useRef } from "react";

/**
 * Feedback sensorial artesanal:
 * - Som orgânico via Web Audio API (sem arquivo externo)
 * - Haptic feedback via navigator.vibrate em mobile
 */
export function useSensoryFeedback() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    return audioCtxRef.current;
  }, []);

  /**
   * Som de caixa registradora artesanal — dois tons percussivos curtos
   * que evocam madeira e metal, sem arquivo de áudio externo.
   */
  const playSuccessSound = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      // Toque grave — madeira
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(280, now + 0.08);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Toque agudo — metal (ding)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1040, now + 0.06);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      gain2.gain.setValueAtTime(0.12, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.22);
    } catch {
      // Web Audio não disponível — silencioso
    }
  }, [getCtx]);

  /** Vibração haptic curta para confirmação */
  const triggerHaptic = useCallback((pattern: number | number[] = [10, 50, 10]) => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Vibração não disponível
    }
  }, []);

  /** Feedback completo de sucesso: som + haptic condicional */
  const onSaleSuccess = useCallback((metodoPagamento?: string) => {
    playSuccessSound();
    if (metodoPagamento && metodoPagamento !== "DINHEIRO") {
      triggerHaptic([10, 40, 10]);
    }
  }, [playSuccessSound, triggerHaptic]);

  return { playSuccessSound, triggerHaptic, onSaleSuccess };
}
