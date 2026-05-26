import { useState, useCallback } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { NewPomodoroModal } from "./components/NewPomodoroModal";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { SessionHistory } from "./components/SessionHistory";
import { EmptyState } from "./components/EmptyState";
import { PomodoroStorage } from "../services/pomodoroStorage";
import type {
  ActivePomodoroSession,
  PomodoroHistoryItem,
  PomodoroSettings,
} from "../types/pomodoro";

// ─── Types used by UI-layer (legacy shape kept for compatibility) ──────────────

export interface PomodoroConfig {
  taskName: string;
  description?: string;
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  cyclesBeforeLongBreak: number;
  soundEnabled: boolean;
}

export interface SessionHistoryItem {
  id: string;
  taskName: string;
  date: string;
  cyclesCompleted: number;
  status: "completed" | "interrupted";
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Restore active session from localStorage
  const [currentConfig, setCurrentConfig] = useState<PomodoroConfig | null>(() => {
    const persisted = PomodoroStorage.getActiveSession();
    if (!persisted) return null;
    return {
      taskName: persisted.task.name,
      description: persisted.task.description,
      focusDuration: persisted.settings.focusMinutes,
      shortBreakDuration: persisted.settings.shortBreakMinutes,
      longBreakDuration: persisted.settings.longBreakMinutes,
      cyclesBeforeLongBreak: persisted.settings.cyclesBeforeLongBreak,
      soundEnabled: persisted.settings.soundEnabled,
    };
  });

  // Restore history from localStorage
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>(() => {
    const stored = PomodoroStorage.getHistory();
    return stored.map((item) => ({
      id: item.id,
      taskName: item.taskName,
      date: item.startedAt,
      cyclesCompleted: item.completedFocusCycles,
      status: item.status === "completed" ? "completed" : "interrupted",
    }));
  });

  const handleStartSession = useCallback((config: PomodoroConfig) => {
    setCurrentConfig(config);
    setIsModalOpen(false);
  }, []);

  const handleEndSession = useCallback(
    (session: ActivePomodoroSession) => {
      // Save to persistent history
      const historyItem: PomodoroHistoryItem = {
        id: createSessionId(),
        taskName: session.task.name,
        taskDescription: session.task.description,
        startedAt: new Date(session.startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        completedFocusCycles: session.completedFocusCycles,
        settings: session.settings,
        totalDurationMs: Date.now() - session.startedAt,
        status:
          session.currentPhase === "completed"
            ? "completed"
            : session.completedFocusCycles > 0
              ? "manually_ended"
              : "abandoned",
      };
      PomodoroStorage.addHistoryItem(historyItem);

      // Update UI history list
      const uiItem: SessionHistoryItem = {
        id: historyItem.id,
        taskName: historyItem.taskName,
        date: historyItem.startedAt,
        cyclesCompleted: historyItem.completedFocusCycles,
        status: session.completedFocusCycles > 0 ? "completed" : "interrupted",
      };
      setSessionHistory((prev) => [uiItem, ...prev]);
      setCurrentConfig(null);
    },
    []
  );

  // Map PomodoroConfig → PomodoroSettings (for hook)
  const settingsFromConfig = (cfg: PomodoroConfig): PomodoroSettings => ({
    focusMinutes: cfg.focusDuration,
    shortBreakMinutes: cfg.shortBreakDuration,
    longBreakMinutes: cfg.longBreakDuration,
    cyclesBeforeLongBreak: cfg.cyclesBeforeLongBreak,
    soundEnabled: cfg.soundEnabled,
  });

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-4 py-8 md:py-16">
          {/* Header */}
          <header className="mb-12 text-center">
            <h1 className="mb-2">Pomodoro App</h1>
            <p className="text-muted-foreground">
              Transforme intenção em foco, um ciclo por vez.
            </p>
          </header>

          {/* Main Content */}
          <main>
            {currentConfig ? (
              <PomodoroTimer
                taskName={currentConfig.taskName}
                taskDescription={currentConfig.description}
                settings={settingsFromConfig(currentConfig)}
                sessionStartedAt={Date.now()}
                onEndSession={handleEndSession}
              />
            ) : (
              <EmptyState onNewPomodoro={() => setIsModalOpen(true)} />
            )}
          </main>

          {/* History Section */}
          {sessionHistory.length > 0 && (
            <div className="mt-16">
              <SessionHistory sessions={sessionHistory} />
            </div>
          )}
        </div>

        {/* New Pomodoro Modal */}
        <NewPomodoroModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onStart={handleStartSession}
        />

        <Toaster richColors position="top-center" />
      </div>
    </ThemeProvider>
  );
}
