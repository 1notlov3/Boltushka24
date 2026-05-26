import { formatGroupSystemEvent, type GroupSystemEvent } from "@/lib/group-system-events";
import { cn } from "@/lib/utils";

interface ChatSystemEventProps {
  id: string;
  event: GroupSystemEvent;
  timestamp: string;
  highlighted?: boolean;
}

export const ChatSystemEvent = ({ id, event, timestamp, highlighted = false }: ChatSystemEventProps) => (
  <div
    id={`message-${id}`}
    role="note"
    aria-label="Системное событие"
    className={cn(
      "group flex justify-center px-4 py-2 transition-colors",
      highlighted && "bg-blue-500/10",
    )}
  >
    <div className="max-w-[90%] rounded-full bg-zinc-100 px-3 py-1 text-center text-xs font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
      <span>{formatGroupSystemEvent(event)}</span>
      <span className="ml-2 text-[10px] font-normal text-zinc-400">{timestamp}</span>
    </div>
  </div>
);
