"use client";

import { useSocket } from "@/components/providers/socket-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const SocketIndicator = () => {
  const { isConnected } = useSocket();
  const label = isConnected ? "В сети" : "Соединение...";

  return (
    <div
      className="inline-flex items-center"
      role="status"
      aria-live="polite"
      title={`Состояние: ${label}`}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full sm:hidden",
          isConnected ? "bg-emerald-500" : "animate-pulse bg-yellow-500",
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
      <Badge
        variant="outline"
        className={cn(
          "hidden border-none text-white sm:inline-flex",
          isConnected ? "bg-emerald-600" : "bg-yellow-600",
        )}
        aria-hidden="true"
      >
        {label}
      </Badge>
    </div>
  );
};
