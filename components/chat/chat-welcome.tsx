import { Hash } from "lucide-react";

interface ChatWelcomeProps {
  name: string;
  type: "channel" | "conversation";
};

export const ChatWelcome = ({
  name,
  type
}: ChatWelcomeProps) => {
  return (
    <div className="space-y-2 px-4 mb-4">
      <p className="text-xl md:text-3xl font-bold">
        {type === "channel" ? "Добро пожаловать в #" : ""}{name}
      </p>
      <p className="text-zinc-600 dark:text-zinc-400 text-sm">
        {type === "channel"
          ? `Это начало общения в канале #${name}.`
          : `Это начало вашего диалога с ${name}`
        }
      </p>
    </div>
  )
}