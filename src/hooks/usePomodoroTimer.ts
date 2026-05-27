/**
 * usePomodoroTimer
 *
 * Robust timer hook using real-clock timestamps instead of just setInterval:
 *  - Computes remaining = phaseDuration - (Date.now() - currentPhaseStartedAt).
 *  - Handles three page-lifecycle events so the timer stays correct after
 *    backgrounding: visibilitychange, window focus, and pageshow (iOS bfcache).
 *  - All three handlers share a debounced `recalculateFromBackground` to prevent
 *    double-advancing if multiple events fire in quick succession.
 *  - Calls unlockAudio() on the first user gesture (start / resume) so the alarm
 *    is primed before the first cycle ends.
 *  - Persists session to localStorage on every state change via PomodoroStorage.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { ActivePomodoroSession, PomodoroSettings } from "../types/pomodoro";
import { PomodoroStorage } from "../services/pomodoroStorage";
import { playChime, unlockAudio, isAudioUnlocked } from "../services/soundService";
import { minToMs } from "../utils/time";

export type TimerPhase = "focus" | "shortBreak" | "longBreak";

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
  /** Whether audio has been unlocked via a user gesture in this session */
  audioUnlocked: boolean;
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

/**
 * Decide a próxima fase do fluxo contínuo.
 *
 * Regras clássicas do Pomodoro:
 *  - Após foco: a cada LONG_BREAK_INTERVAL ciclos completos → longBreak; demais → shortBreak.
 *  - Após qualquer pausa: volta para focus.
 *
 * A verificação de conclusão (>= totalCycles) acontece em advancePhase ANTES desta função,
 * portanto aqui `newTotalCycles` nunca atinge o limite de encerramento.
 */
const LONG_BREAK_INTERVAL = 4;

function nextPhase(current: TimerPhase, newTotalCycles: number): TimerPhase {
  if (current !== "focus") return "focus";
  return newTotalCycles % LONG_BREAK_INTERVAL === 0 ? "longBreak" : "shortBreak";
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

  // Initialized from module singleton so it survives remounts within the same page load
  const [audioUnlocked, setAudioUnlocked] = useState(isAudioUnlocked);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Prevents double-advance when visibilitychange + focus fire together
  const lastRecalcRef = useRef(0);

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
          "Sessão concluída!",
          `${newTotalCycles} ciclos de foco completados.`
        );
        return;
      }

      // ── Transição normal: foco → shortBreak/longBreak → foco → ... ──────────
      const nextPh = nextPhase(current, newTotalCycles);
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
        isRunning: fromSession.isRunning,
      });
      setRemainingMs(phaseDurationMs(nextPh, fromSession.settings));
      fireSound();
      fireNotification(
        isFocus ? "Ciclo de foco concluído!" : "Pausa encerrada!",
        isFocus ? "Hora de descansar." : "Pronto para o próximo ciclo?"
      );
    },
    []
  );

  // ─── Shared background-recalculation (debounced 800 ms) ────────────────────
  // Used by visibilitychange, focus, and pageshow handlers to avoid double-advance
  // when multiple lifecycle events fire in rapid succession (common on desktop).
  const recalculateFromBackground = useCallback(() => {
    const now = Date.now();
    if (now - lastRecalcRef.current < 800) return;
    lastRecalcRef.current = now;

    const s = sessionRef.current;
    if (
      !s.isRunning ||
      s.currentPhase === "idle" ||
      s.currentPhase === "paused" ||
      s.currentPhase === "completed"
    ) return;

    const elapsed = now - s.currentPhaseStartedAt;
    const duration = phaseDurationMs(s.currentPhase as TimerPhase, s.settings);
    const remaining = Math.max(0, duration - elapsed);

    if (remaining === 0) {
      advancePhase(s);
    } else {
      setRemainingMs(remaining);
    }
  }, [advancePhase]);

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
    const handle = () => { if (!document.hidden) recalculateFromBackground(); };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [recalculateFromBackground]);

  // ─── Window focus (secondary signal — covered by debounce) ──────────────────
  useEffect(() => {
    window.addEventListener("focus", recalculateFromBackground);
    return () => window.removeEventListener("focus", recalculateFromBackground);
  }, [recalculateFromBackground]);

  // ─── pageshow — iOS Safari bfcache restore ──────────────────────────────────
  // Safari on iOS can freeze/restore pages from the back-forward cache without
  // firing visibilitychange. `pageshow` with `e.persisted === true` is the only
  // reliable signal for bfcache restores.
  useEffect(() => {
    const handle = (e: PageTransitionEvent) => {
      if (e.persisted) recalculateFromBackground();
    };
    window.addEventListener("pageshow", handle);
    return () => window.removeEventListener("pageshow", handle);
  }, [recalculateFromBackground]);

  // ─── Controls ───────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    // Unlock audio from this user gesture so the alarm can play later without
    // another interaction. Fire-and-forget — never block the UI on audio init.
    unlockAudio().then(() => {
      if (isAudioUnlocked()) setAudioUnlocked(true);
    });

    const now = Date.now();
    setSession((prev) => {
      if (prev.currentPhase === "idle") {
        return {
          ...prev,
          currentPhase: "focus",
          currentPhaseStartedAt: now,
          remainingMs: phaseDurationMs("focus", prev.settings),
          pausedAt: undefined,
          isRunning: true,
        };
      }
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
    // Also a user gesture — try to unlock audio if not already done.
    unlockAudio().then(() => {
      if (isAudioUnlocked()) setAudioUnlocked(true);
    });

    const now = Date.now();
    setSession((prev) => {
      const actualPhase = (prev.previousPhase ?? "focus") as TimerPhase;
      const remaining = prev.remainingMs ?? phaseDurationMs(actualPhase, prev.settings);
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
    const s = sessionRef.current;
    if (s.currentPhase === "completed" || s.currentPhase === "idle") return;

    const now = Date.now();
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
    audioUnlocked,
  };
}
