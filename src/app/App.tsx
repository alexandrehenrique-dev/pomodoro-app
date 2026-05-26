import { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { NewPomodoroModal } from "./components/NewPomodoroModal";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { SessionHistory } from "./components/SessionHistory";
import { EmptyState } from "./components/EmptyState";

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

export type SessionPhase = "focus" | "shortBreak" | "longBreak";

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<PomodoroConfig | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);

  const handleStartSession = (config: PomodoroConfig) => {
    setCurrentSession(config);
    setIsModalOpen(false);
  };

  const handleEndSession = (cyclesCompleted: number, status: "completed" | "interrupted") => {
    if (currentSession) {
      const newHistoryItem: SessionHistoryItem = {
        id: Date.now().toString(),
        taskName: currentSession.taskName,
        date: new Date().toISOString(),
        cyclesCompleted,
        status,
      };
      setSessionHistory([newHistoryItem, ...sessionHistory]);
    }
    setCurrentSession(null);
  };

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
            {currentSession ? (
              <PomodoroTimer
                config={currentSession}
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