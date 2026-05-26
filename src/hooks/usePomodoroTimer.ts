/**
 * usePomodoroTimer
 *
 * Robust timer hook using timestamps instead of just setInterval:
 *  - Uses `currentPhaseStartedAt` + `remainingMs` to calculate time left.
 *  - Handles Page Visibility API: when the tab becomes visible again it
 *    recalculates elapsed time and advances state if the cycle already ended.
 *  - Persists session to localStorage on every tick via PomodoroStorage.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { ActivePomodoroSession, PomodoroSettings } from "../types/pomodoro";
import { PomodoroStorage } from "../services/pomodoroStorage";
import { playChime } from "../services/soundService";
import { minToMs } from "../utils/time";

export type TimerPhase = "focus" | "shortBreak" | "longBreak"; // longBreak mantido para cálculo de duração

export interface UsePomodoroTimerOptions {
  taskName: string;
  taskDescription?: string;
  settings: PomodoroSettings;
  /** Called when the session is ended (manually or completed) */
  onSessionEnd: (session: ActivePomodoroSession) => void;
}

export interface UsePomodoroTimerReturn {
  session: ActivePomodoroSession;
  remainingMs: number;
  progressPct: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  end: () => void;
  /** Whether the last sound attempt failed (show visual alert) */
  soundFailed: boolean;
  clearSoundFailed: () => void;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function createPomodoroId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function phaseDurationMs(phase: TimerPhase, settings: PomodoroSettings): number {
  switch (phase) {
    case "focus":
      return minToMs(settings.focusMinutes);
    case "shortBreak":
      return minToMs(settings.shortBreakMinutes);
    case "longBreak":
      return minToMs(settings.longBreakMinutes);
  }
}

// Transição de fase no fluxo contínuo (sem longBreak automático).
// A conclusão da sessão é tratada em advancePhase antes de chamar esta função.
function nextPhase(current: TimerPhase): "focus" | "shortBreak" {
  return current === "focus" ? "shortBreak" : "focus";
}

function createInitialSession(
  taskName: string,
  taskDescription: string | undefined,
  settings: PomodoroSettings
): ActivePomodoroSession {
  const now = Date.now();
  return {
    id: createPomodoroId(),
    task: {
      id: createPomodoroId(),
      name: taskName,
      description: taskDescription,
      createdAt: new Date().toISOString(),
    },
    settings,
    currentPhase: "idle",
    startedAt: now,
    currentPhaseStartedAt: now,
    remainingMs: minToMs(settings.focusMinutes),
    completedFocusCycles: 0,
    completedCyclesInCurrentBlock: 0,
    isRunning: false,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePomodoroTimer({
  taskName,
  taskDescription,
  settings,
  onSessionEnd,
}: UsePomodoroTimerOptions): UsePomodoroTimerReturn {
  // Try to restore a persisted session, otherwise start fresh
  const [session, setSession] = useState<ActivePomodoroSession>(() => {
    const persisted = PomodoroStorage.getActiveSession();
    if (persisted && persisted.task.name === taskName) return persisted;
    return createInitialSession(taskName, taskDescription, settings);
  });

  // Displayed remaining ms (updated every tick)
  const [remainingMs, setRemainingMs] = useState<number>(
    session.remainingMs ?? minToMs(settings.focusMinutes)
  );

  const [soundFailed, setSoundFailed] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // ─── Persist on every session change ───────────────────────────────────────
  useEffect(() => {
    PomodoroStorage.saveActiveSession(session);
  }, [session]);

  // ─── Advance phase ──────────────────────────────────────────────────────────
  const advancePhase = useCallback(
    (fromSession: ActivePomodoroSession) => {
      const current = fromSession.currentPhase as TimerPhase;
      const isFocus = current === "focus";
      const newTotalCycles = isFocus
        ? fromSession.completedFocusCycles + 1
        : fromSession.completedFocusCycles;

      const fireSound = () => {
        if (fromSession.settings.soundEnabled) {
          playChime().then((ok) => { if (!ok) setSoundFailed(true); });
        }
      };

      const fireNotification = (title: string, body: string) => {
        if (
          fromSession.settings.notificationsEnabled &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try { new Notification(title, { body }); } catch { /* opcional */ }
        }
      };

      // ── Conclusão: todos os ciclos de foco foram completados ────────────────
      if (isFocus && newTotalCycles >= fromSession.settings.cyclesBeforeLongBreak) {
        setSession({
          ...fromSession,
          currentPhase: "completed",
          previousPhase: "focus",
          isRunning: false,
          completedFocusCycles: newTotalCycles,
          remainingMs: 0,
        });
        setRemainingMs(0);
        fireSound();
        fireNotification(
          "Sessão concluída! 🎉",
          `${newTotalCycles} ciclos de foco completados.`
        );
        return;
      }

      // ── Transição normal: foco → pausa curta → foco → ... ──────────────────
      const nextPh = nextPhase(current);
      const newBlock = isFocus
        ? fromSession.completedCyclesInCurrentBlock + 1
        : fromSession.completedCyclesInCurrentBlock;
      const now = Date.now();

      setSession({
        ...fromSession,
        currentPhase: nextPh,
        previousPhase: current,
        currentPhaseStartedAt: now,
        pausedAt: undefined,
        remainingMs: phaseDurationMs(nextPh, fromSession.settings),
        completedFocusCycles: newTotalCycles,
        completedCyclesInCurrentBlock: newBlock,
        // Mantém isRunning: fluxo contínuo (não interrompe entre fases)
        isRunning: fromSession.isRunning,
      });
      setRemainingMs(phaseDurationMs(nextPh, fromSession.settings));
      fireSound();
      fireNotification(
        isFocus ? "Ciclo de foco concluído! 🎉" : "Pausa encerrada! 💪",
        isFocus ? "Hora de descansar." : "Pronto para o próximo ciclo?"
      );
    },
    []
  );

  // ─── Tick ───────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const s = sessionRef.current;
    if (
      !s.isRunning ||
      s.currentPhase === "idle" ||
      s.currentPhase === "paused" ||
      s.currentPhase === "completed"
    ) return;

    const elapsed = Date.now() - s.currentPhaseStartedAt;
    const duration = phaseDurationMs(s.currentPhase as TimerPhase, s.settings);
    const remaining = Math.max(0, duration - elapsed);

    setRemainingMs(remaining);

    // Also keep remainingMs in session for persistence across reloads
    setSession((prev) => ({ ...prev, remainingMs: remaining }));

    if (remaining === 0) {
      advancePhase(s);
    }
  }, [advancePhase]);

  // ─── setInterval (tick every 250 ms for smoother display) ───────────────────
  useEffect(() => {
    if (session.isRunning) {
      intervalRef.current = setInterval(tick, 250);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session.isRunning, tick]);

  // ─── Page Visibility API ────────────────────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;

      const s = sessionRef.current;
      if (!s.isRunning || s.currentPhase === "idle") return;

      // Recalculate how much time has passed
      const elapsed = Date.now() - s.currentPhaseStartedAt;
      const duration = phaseDurationMs(s.currentPhase as TimerPhase, s.settings);
      const remaining = Math.max(0, duration - elapsed);

      if (remaining === 0) {
        // Phase ended while tab was hidden — advance immediately
        advancePhase(s);
      } else {
        setRemainingMs(remaining);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [advancePhase]);

  // ─── Controls ───────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    const now = Date.now();
    setSession((prev) => {
      if (prev.currentPhase === "idle") {
        // Primeira vez: inicializa no modo foco
        return {
          ...prev,
          currentPhase: "focus",
          currentPhaseStartedAt: now,
          remainingMs: phaseDurationMs("focus", prev.settings),
          pausedAt: undefined,
          isRunning: true,
        };
      }
      // Pós-reset: fase e duração já estão corretos; apenas dispara o timer
      // a partir de agora (currentPhaseStartedAt = now garante sem drift)
      return {
        ...prev,
        currentPhaseStartedAt: now,
        pausedAt: undefined,
        isRunning: true,
      };
    });
  }, []);

  const pause = useCallback(() => {
    const now = Date.now();
    setSession((prev) => {
      if (!prev.isRunning) return prev;
      const elapsed = now - prev.currentPhaseStartedAt;
      const duration = phaseDurationMs(prev.currentPhase as TimerPhase, prev.settings);
      const remaining = Math.max(0, duration - elapsed);
      const updated: ActivePomodoroSession = {
        ...prev,
        isRunning: false,
        pausedAt: now,
        remainingMs: remaining,
        previousPhase: prev.currentPhase,
        currentPhase: "paused",
      };
      return updated;
    });
  }, []);

  const resume = useCallback(() => {
    const now = Date.now();
    setSession((prev) => {
      const actualPhase = (prev.previousPhase ?? "focus") as TimerPhase;
      const remaining = prev.remainingMs ?? phaseDurationMs(actualPhase, prev.settings);
      // Recalculate startedAt so that elapsed = duration - remaining at this moment
      const newStartedAt = now - (phaseDurationMs(actualPhase, prev.settings) - remaining);
      return {
        ...prev,
        currentPhase: actualPhase,
        isRunning: true,
        pausedAt: undefined,
        currentPhaseStartedAt: newStartedAt,
      };
    });
  }, []);

  const reset = useCallback(() => {
    // Reinicia apenas o timer da fase atual (não zera ciclos).
    // Para o timer: o usuário decide quando retomar clicando "Iniciar".
    const s = sessionRef.current;
    // Não faz nada se a sessão já terminou ou ainda não iniciou
    if (s.currentPhase === "completed" || s.currentPhase === "idle") return;

    const now = Date.now();
    // Usa currentPhase diretamente (não previousPhase) para não saltar de fase
    const actualPhase = (
      s.currentPhase === "paused" ? (s.previousPhase ?? "focus") : s.currentPhase
    ) as TimerPhase;
    const duration = phaseDurationMs(actualPhase, s.settings);

    setRemainingMs(duration);
    setSession((prev) => ({
      ...prev,
      currentPhase: actualPhase,
      currentPhaseStartedAt: now,
      remainingMs: duration,
      pausedAt: undefined,
      isRunning: false,
    }));
  }, []);

  const skip = useCallback(() => {
    const s = sessionRef.current;
    // Não avança se a sessão já terminou ou ainda não iniciou
    if (s.currentPhase === "completed" || s.currentPhase === "idle") return;
    advancePhase(s);
  }, [advancePhase]);

  const end = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    PomodoroStorage.clearActiveSession();
    onSessionEnd(sessionRef.current);
  }, [onSessionEnd]);

  // ─── Progress ───────────────────────────────────────────────────────────────
  const progressPct = (() => {
    if (session.currentPhase === "completed") return 100;
    const actualPhase =
      session.currentPhase === "paused"
        ? ((session.previousPhase ?? "focus") as TimerPhase)
        : (session.currentPhase as TimerPhase);
    const duration = phaseDurationMs(actualPhase, session.settings);
    return duration > 0 ? ((duration - remainingMs) / duration) * 100 : 0;
  })();

  return {
    session,
    remainingMs,
    progressPct,
    start,
    pause,
    resume,
    reset,
    skip,
    end,
    soundFailed,
    clearSoundFailed: () => setSoundFailed(false),
  };
}
