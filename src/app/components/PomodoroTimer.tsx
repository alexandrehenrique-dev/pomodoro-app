import * as Progress from "@radix-ui/react-progress";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  X,
  Coffee,
  Brain,
  VolumeX,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { usePomodoroTimer } from "../../hooks/usePomodoroTimer";
import type { PomodoroSettings, ActivePomodoroSession } from "../../types/pomodoro";
import { PomodoroStorage } from "../../services/pomodoroStorage";
import { formatMs } from "../../utils/time";
import { useEffect } from "react";

interface PomodoroTimerProps {
  taskName: string;
  taskDescription?: string;
  settings: PomodoroSettings;
  sessionStartedAt: number;
  onEndSession: (session: ActivePomodoroSession) => void;
}

export function PomodoroTimer({
  taskName,
  taskDescription,
  settings,
  sessionStartedAt,
  onEndSession,
}: PomodoroTimerProps) {
  const {
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
    clearSoundFailed,
  } = usePomodoroTimer({
    taskName,
    taskDescription,
    settings,
    onSessionEnd: onEndSession,
  });

  const { currentPhase, completedFocusCycles, previousPhase } = session;

  const isIdle = currentPhase === "idle";
  const isRunning = session.isRunning;
  const isPaused = currentPhase === "paused";
  const isCompleted = currentPhase === "completed";

  const displayPhase =
    currentPhase === "paused" ? previousPhase ?? "focus" : currentPhase;

  // Toast on phase advance
  useEffect(() => {
    if (currentPhase === "completed") {
      toast.success("Sessão concluída! 🎉", {
        description: `${completedFocusCycles} ciclos de foco completados. Ótimo trabalho!`,
        duration: 6000,
      });
    } else if (currentPhase === "shortBreak") {
      toast.success("Ciclo de foco concluído!", {
        description: "Hora da pausa curta. Relaxe um pouco!",
      });
    } else if (currentPhase === "longBreak") {
      toast.success("Ciclo de foco concluído!", {
        description: "Hora da pausa longa. Você merece descansar bem!",
      });
    } else if (currentPhase === "focus" && completedFocusCycles > 0) {
      toast.info("Pausa concluída! 💪", {
        description: "Pronto para o próximo ciclo de foco?",
      });
    }
  }, [currentPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Visual fallback when sound fails
  useEffect(() => {
    if (soundFailed) {
      toast.warning("Sem som", {
        description:
          "Não foi possível tocar o áudio. Verifique as configurações do navegador.",
        onDismiss: clearSoundFailed,
        onAutoClose: clearSoundFailed,
      });
    }
  }, [soundFailed, clearSoundFailed]);

  const getPhaseLabel = () => {
    switch (displayPhase) {
      case "focus":
        return "Foco";
      case "shortBreak":
        return "Pausa curta";
      case "longBreak":
        return "Pausa longa";
      default:
        return "Foco";
    }
  };

  const getPhaseIcon = () => {
    switch (displayPhase) {
      case "focus":
        return <Brain className="h-6 w-6" />;
      default:
        return <Coffee className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Sound-failed visual alert */}
      {soundFailed && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <VolumeX className="h-4 w-4 flex-shrink-0" />
          <span>
            Áudio bloqueado pelo navegador. Interaja com a página para habilitar o som.
          </span>
          <button
            onClick={clearSoundFailed}
            className="ml-auto rounded p-0.5 hover:bg-destructive/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Timer Card */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        {/* Header */}
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                {getPhaseIcon()}
                <h2 className="text-xl font-medium">{taskName}</h2>
              </div>
              {taskDescription && (
                <p className="text-sm text-muted-foreground">{taskDescription}</p>
              )}
            </div>
            <button
              onClick={end}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Encerrar sessão"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="px-6 py-12 text-center">
          {/* Phase badge */}
          {isCompleted ? (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-primary-foreground">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">Sessão concluída!</span>
            </div>
          ) : (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5">
              <span className="text-sm font-medium">{getPhaseLabel()}</span>
              {isPaused && (
                <span className="inline-flex h-2 w-2 rounded-full bg-destructive" />
              )}
            </div>
          )}

          <div className="mb-8 font-mono text-7xl font-light tracking-tight md:text-8xl">
            {isCompleted ? "00:00" : formatMs(remainingMs)}
          </div>

          <Progress.Root
            value={progressPct}
            className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <Progress.Indicator
              className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-out"
              style={{ transform: `translateX(-${100 - progressPct}%)` }}
            />
          </Progress.Root>

          <div className="mt-6 text-sm text-muted-foreground">
            Ciclos concluídos:{" "}
            <span className="font-medium text-foreground">{completedFocusCycles}</span>
            {!isCompleted && (
              <span className="ml-1 text-muted-foreground">
                / {settings.cyclesBeforeLongBreak}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="border-t border-border bg-muted/30 px-6 py-4">
          <div className="flex flex-wrap justify-center gap-3">

            {/* ── Estado: concluída ── apenas "Encerrar sessão" */}
            {isCompleted && (
              <button
                onClick={end}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-primary-foreground shadow-sm transition-all hover:opacity-90"
              >
                <Trophy className="h-4 w-4" />
                Encerrar sessão
              </button>
            )}

            {/* ── Estados ativos ── */}
            {!isCompleted && (
              <>
                {/*
                  Fluxo contínuo: o usuário clica "Iniciar" uma única vez.
                  Após cada fase, a próxima começa automaticamente (isRunning permanece true).
                  "Iniciar" reaparece apenas após reset manual.
                */}
                {!isRunning && !isPaused && (
                  <button
                    onClick={start}
                    className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-primary-foreground shadow-sm transition-all hover:opacity-90"
                  >
                    <Play className="h-4 w-4" />
                    Iniciar
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={pause}
                    className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-primary-foreground shadow-sm transition-all hover:opacity-90"
                  >
                    <Pause className="h-4 w-4" />
                    Pausar
                  </button>
                )}

                {isPaused && (
                  <button
                    onClick={resume}
                    className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-primary-foreground shadow-sm transition-all hover:opacity-90"
                  >
                    <Play className="h-4 w-4" />
                    Continuar
                  </button>
                )}

                {!isIdle && (
                  <>
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 transition-colors hover:bg-muted"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Resetar
                    </button>

                    <button
                      onClick={skip}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 transition-colors hover:bg-muted"
                    >
                      <SkipForward className="h-4 w-4" />
                      Avançar
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
