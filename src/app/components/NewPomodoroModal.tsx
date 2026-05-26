import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import * as Switch from "@radix-ui/react-switch";
import { X, Volume2 } from "lucide-react";
import type { PomodoroConfig } from "../App";

interface NewPomodoroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (config: PomodoroConfig) => void;
}

export function NewPomodoroModal({ open, onOpenChange, onStart }: NewPomodoroModalProps) {
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [focusDuration, setFocusDuration] = useState(25);
  const [shortBreakDuration, setShortBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [cyclesBeforeLongBreak, setCyclesBeforeLongBreak] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    onStart({
      taskName: taskName.trim(),
      description: description.trim() || undefined,
      focusDuration,
      shortBreakDuration,
      longBreakDuration,
      cyclesBeforeLongBreak,
      soundEnabled,
    });

    // Reset form
    setTaskName("");
    setDescription("");
    setFocusDuration(25);
    setShortBreakDuration(5);
    setLongBreakDuration(15);
    setCyclesBeforeLongBreak(4);
    setSoundEnabled(true);
  };

  const playTestSound = () => {
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVK3m773CYBwFOI/X88x5LAUkd8fw3ZBBChRetenut1YUCkag4vK+bCEFMYjS89OCMwYfb8Lw45lIDQ5VruXwvsNgHAU4kNjzzHkrBSR3x/DdkEEKFFy16Oyv");
    audio.play().catch(() => {});
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="mb-6 flex items-center justify-between">
            <Dialog.Title className="text-xl font-medium">Novo Pomodoro</Dialog.Title>
            <Dialog.Close className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label.Root htmlFor="taskName" className="block">
                Nome da task <span className="text-destructive">*</span>
              </Label.Root>
              <input
                id="taskName"
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Ex: Estudar React"
                className="w-full rounded-lg border border-input bg-input-background px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label.Root htmlFor="description" className="block">
                Descrição (opcional)
              </Label.Root>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes sobre a task..."
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-input-background px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Duration Settings */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label.Root htmlFor="focus" className="block">
                  Foco (minutos)
                </Label.Root>
                <input
                  id="focus"
                  type="number"
                  min="1"
                  max="60"
                  value={focusDuration}
                  onChange={(e) => setFocusDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-input-background px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label.Root htmlFor="shortBreak" className="block">
                  Pausa curta (min)
                </Label.Root>
                <input
                  id="shortBreak"
                  type="number"
                  min="1"
                  max="30"
                  value={shortBreakDuration}
                  onChange={(e) => setShortBreakDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-input-background px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label.Root htmlFor="longBreak" className="block">
                  Pausa longa (min)
                </Label.Root>
                <input
                  id="longBreak"
                  type="number"
                  min="1"
                  max="60"
                  value={longBreakDuration}
                  onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-input-background px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label.Root htmlFor="cycles" className="block">
                  Ciclos até pausa longa
                </Label.Root>
                <input
                  id="cycles"
                  type="number"
                  min="2"
                  max="10"
                  value={cyclesBeforeLongBreak}
                  onChange={(e) => setCyclesBeforeLongBreak(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-input-background px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Sound Settings */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex-1">
                <Label.Root htmlFor="sound" className="block cursor-pointer">
                  Som ativado
                </Label.Root>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Tocar som ao completar cada fase
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={playTestSound}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Testar som"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
                <Switch.Root
                  id="sound"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                  className="relative h-6 w-11 rounded-full bg-switch-background transition-colors data-[state=checked]:bg-primary"
                >
                  <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[1.375rem]" />
                </Switch.Root>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 transition-colors hover:bg-muted"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!taskName.trim()}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
              >
                Iniciar Pomodoro
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
