// ─── Domain Types ────────────────────────────────────────────────────────────

export type PomodoroPhase =
  | "idle"
  | "focus"
  | "shortBreak"
  | "longBreak"
  | "paused"
  | "completed";

export type PomodoroSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  soundEnabled: boolean;
  notificationsEnabled?: boolean;
};

export type PomodoroTask = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
};

export type ActivePomodoroSession = {
  id: string;
  task: PomodoroTask;
  settings: PomodoroSettings;
  currentPhase: PomodoroPhase;
  previousPhase?: PomodoroPhase;
  /** Unix timestamp (ms) when the whole session started */
  startedAt: number;
  /** Unix timestamp (ms) when the current phase started (or resumed) */
  currentPhaseStartedAt: number;
  /** Unix timestamp (ms) when the session was paused, if paused */
  pausedAt?: number;
  /** Remaining time in ms when paused (calculated on pause) */
  remainingMs?: number;
  completedFocusCycles: number;
  completedCyclesInCurrentBlock: number;
  isRunning: boolean;
};

export type PomodoroHistoryItem = {
  id: string;
  taskName: string;
  taskDescription?: string;
  startedAt: string;
  endedAt: string;
  completedFocusCycles: number;
  settings: PomodoroSettings;
  totalDurationMs: number;
  status: "completed" | "manually_ended" | "abandoned";
};

// ─── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
  soundEnabled: true,
  notificationsEnabled: false,
};
