/**
 * PomodoroStorage — localStorage persistence layer.
 *
 * TODO: substituir esta camada por integração com backend/API no futuro.
 */

import type {
  ActivePomodoroSession,
  PomodoroHistoryItem,
  PomodoroSettings,
} from "../types/pomodoro";
import { DEFAULT_SETTINGS } from "../types/pomodoro";

const KEYS = {
  ACTIVE_SESSION: "pomodoro:activeSession",
  HISTORY: "pomodoro:history",
  SETTINGS: "pomodoro:settings",
} as const;

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can be unavailable in some environments — fail silently
  }
}

// ─── Active Session ──────────────────────────────────────────────────────────

export const PomodoroStorage = {
  getActiveSession(): ActivePomodoroSession | null {
    return safeGet<ActivePomodoroSession>(KEYS.ACTIVE_SESSION);
  },

  saveActiveSession(session: ActivePomodoroSession): void {
    safeSet(KEYS.ACTIVE_SESSION, session);
  },

  clearActiveSession(): void {
    try {
      localStorage.removeItem(KEYS.ACTIVE_SESSION);
    } catch {
      // ignore
    }
  },

  // ─── History ──────────────────────────────────────────────────────────────

  getHistory(): PomodoroHistoryItem[] {
    return safeGet<PomodoroHistoryItem[]>(KEYS.HISTORY) ?? [];
  },

  addHistoryItem(item: PomodoroHistoryItem): void {
    const history = PomodoroStorage.getHistory();
    // Keep the last 100 items max
    const updated = [item, ...history].slice(0, 100);
    safeSet(KEYS.HISTORY, updated);
  },

  // ─── Settings ─────────────────────────────────────────────────────────────

  getSettings(): PomodoroSettings {
    return safeGet<PomodoroSettings>(KEYS.SETTINGS) ?? { ...DEFAULT_SETTINGS };
  },

  saveSettings(settings: PomodoroSettings): void {
    safeSet(KEYS.SETTINGS, settings);
  },
};
