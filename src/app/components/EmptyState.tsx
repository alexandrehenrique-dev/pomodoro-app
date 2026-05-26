import { Plus } from "lucide-react";

interface EmptyStateProps {
  onNewPomodoro: () => void;
}

export function EmptyState({ onNewPomodoro }: EmptyStateProps) {
  return (
    <div className="space-y-8">
      {/* CTA Button */}
      <div className="flex justify-center">
        <button
          onClick={onNewPomodoro}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-primary-foreground shadow-sm transition-all hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          Novo Pomodoro
        </button>
      </div>

      {/* Empty Card */}
      <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
        <div className="mx-auto max-w-md">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Crie uma task para iniciar seu ciclo de foco.
          </p>
        </div>
      </div>
    </div>
  );
}
