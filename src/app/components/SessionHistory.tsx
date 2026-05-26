import { Clock, CheckCircle2, XCircle } from "lucide-react";
import type { SessionHistoryItem } from "../App";

interface SessionHistoryProps {
  sessions: SessionHistoryItem[];
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) {
      return `Hoje às ${time}`;
    } else if (isYesterday) {
      return `Ontem às ${time}`;
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  return (
    <div>
      <h3 className="mb-4 text-lg font-medium">Histórico Recente</h3>
      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
          >
            <div className="flex-shrink-0">
              {session.status === "completed" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{session.taskName}</p>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(session.date)}
                </span>
                <span>•</span>
                <span>{session.cyclesCompleted} ciclos</span>
              </div>
            </div>

            <div className="flex-shrink-0">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  session.status === "completed"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {session.status === "completed" ? "Concluído" : "Interrompido"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
