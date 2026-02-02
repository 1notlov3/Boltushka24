"use client";

import { useSocket } from "@/components/providers/socket-provider";
import { Badge } from "@/components/ui/badge";

export const SocketIndicator = () => {
  const { isConnected } = useSocket();

  if (!isConnected) {
    return (
      <Badge 
        variant="outline" 
        className="bg-yellow-600 text-white border-none"
        title="Соединение..."
        role="status"
        aria-live="polite"
      >
        Соединение...
      </Badge>
    )
  }

  return (
    <Badge 
      variant="outline" 
      className="bg-emerald-600 text-white border-none"
      title="В сети"
      role="status"
      aria-live="polite"
    >
      В сети
    </Badge>
  )
}
