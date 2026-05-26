import { useState, useEffect, useRef } from "react";
import * as Progress from "@radix-ui/react-progress";
import { Play, Pause, RotateCcw, SkipForward, X, Coffee, Brain } from "lucide-react";
import { toast } from "sonner";
import type { PomodoroConfig, SessionPhase } from "../App";

interface PomodoroTimerProps {
  config: PomodoroConfig;
  onEndSession: (cyclesCompleted: number, status: "completed" | "interrupted") => void;
}

export function PomodoroTimer({ config, onEndSession }: PomodoroTimerProps) {
  const [phase, setPhase] = useState<SessionPhase>("focus");
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getCurrentPhaseDuration = () => {
    switch (phase) {
      case "focus":
        return config.focusDuration * 60;
      case "shortBreak":
        return config.shortBreakDuration * 60;
      case "longBreak":
        return config.longBreakDuration * 60;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const playSound = () => {
    if (!config.soundEnabled) return;
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVK3m773CYBwFOI/X88x5LAUkd8fw3ZBBChRetenut1YUCkag4vK+bCEFMYjS89OCMwYfb8Lw45lIDQ5VruXwvsNgHAU4kNjzzHkrBSR3x/DdkEEKFFy16Oyv");
    audio.play().catch(() => {});
  };

  const handlePhaseComplete = () => {
    playSound();

    if (phase === "focus") {
      const newCycles = cyclesCompleted + 1;
      setCyclesCompleted(newCycles);

      if (newCycles % config.cyclesBeforeLongBreak === 0) {
        setPhase("longBreak");
        setTimeLeft(config.longBreakDuration * 60);
        toast.success("Ciclo de foco concluído!", {
          description: "Hora da pausa longa. Descanse bem!",
        });
      } else {
        setPhase("shortBreak");
        setTimeLeft(config.shortBreakDuration * 60);
        toast.success("Ciclo de foco concluído!", {
          description: "Hora da pausa curta. Relaxe um pouco!",
        });
      }
    } else {
      setPhase("focus");
      setTimeLeft(config.focusDuration * 60);
      toast.info("Pausa concluída!", {
        description: "Pronto para o próximo ciclo de foco?",
      });
    }

    setIsRunning(false);
    setIsPaused(false);
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setPhase("focus");
    setCyclesCompleted(0);
    setTimeLeft(config.focusDuration * 60);
  };

  const handleSkip = () => {
    handlePhaseComplete();
  };

  const handleEnd = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onEndSession(cyclesCompleted, cyclesCompleted > 0 ? "completed" : "interrupted");
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handlePhaseComplete();
            return getCurrentPhaseDuration();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, phase]);

  const progress = ((getCurrentPhaseDuration() - timeLeft) / getCurrentPhaseDuration()) * 100;

  const getPhaseLabel = () => {
    switch (phase) {
      case "focus":
        return "Foco";
      case "shortBreak":
        return "Pausa curta";
      case "longBreak":
        return "Pausa longa";
    }
  };

  const getPhaseIcon = () => {
    switch (phase) {
      case "focus":
        return <Brain className="h-6 w-6" />;
      case "shortBreak":
      case "longBreak":
        return <Coffee className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Timer Card */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        {/* Header */}
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                {getPhaseIcon()}
                <h2 className="text-xl font-medium">{config.taskName}</h2>
              </div>
              {config.description && (
                <p className="text-sm text-muted-foreground">{config.description}</p>
              )}
            </div>
            <button
              onClick={handleEnd}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Encerrar sessão"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="px-6 py-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5">
            <span className="text-sm font-medium">{getPhaseLabel()}</span>
            {isPaused && (
              <span className="inline-flex h-2 w-2 rounded-full bg-destructive"></span>
            )}
          </div>

          <div className="mb-8 font-mono text-7xl font-light tracking-tight md:text-8xl">
            {formatTime(timeLeft)}
          </div>

          <Progress.Root
            value={progress}
            className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <Progress.Indicator
              className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-out"
              style={{ transform: `translateX(-${100 - progress}%)` }}
            />
          </Progress.Root>

          <div className="mt-6 text-sm text-muted-foreground">
            Ciclos concluídos: {cyclesCompleted}
          </div>
        </div>

        {/* Controls */}
        <div className="border-t border-border bg-muted/30 px-6 py-4">
          <div className="flex flex-wrap justify-center gap-3">
            {!isRunning && !isPaused && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-primary-foreground shadow-sm transition-all hover:opacity-90"
              >
                <Play className="h-4 w-4" />
                Iniciar
              </button>
            )}

            {isRunning && (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-primary-foreground shadow-sm transition-all hover:opacity-90"
              >
                <Pause className="h-4 w-4" />
                Pausar
              </button>
            )}

            {isPaused && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-primary-foreground shadow-sm transition-all hover:opacity-90"
              >
                <Play className="h-4 w-4" />
                Continuar
              </button>
            )}

            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 transition-colors hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar
            </button>

            <button
              onClick={handleSkip}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 transition-colors hover:bg-muted"
            >
              <SkipForward className="h-4 w-4" />
              Avançar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
