"use client";

import axios from "axios";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AiAssistantModal = () => {
  const { isOpen, onClose, type } = useModal();
  const isModalOpen = isOpen && type === "aiAssistant";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post("/api/ai", { message: userMessage.content });
      setMessages((prev) => [...prev, response.data]);
    } catch (error) {
      console.log(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Произошла ошибка. Попробуйте позже." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Optional: clear messages on close? For now keep them.
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#313338] text-black dark:text-white p-0 overflow-hidden w-[500px] h-[600px] flex flex-col">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold flex items-center justify-center gap-x-2">
            <Bot className="w-8 h-8 text-emerald-500" />
            AI Помощник
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Задайте вопрос искусственному интеллекту
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6 pt-0 flex flex-col gap-y-4">
          <div className="flex-1 bg-zinc-100 dark:bg-[#2B2D31] rounded-lg p-4 overflow-y-auto" ref={scrollRef}>
             {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm">
                    <Bot className="w-12 h-12 mb-2 opacity-50" />
                    <p>Начните общение с приветствия!</p>
                </div>
             )}
             {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "mb-4 flex gap-x-2 items-start",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                         msg.role === "user" ? "bg-blue-500" : "bg-emerald-500"
                    )}>
                        {msg.role === "user" ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                    </div>
                    <div className={cn(
                        "px-4 py-2 rounded-lg max-w-[80%]",
                        msg.role === "user" ? "bg-blue-500 text-white" : "bg-zinc-200 dark:bg-[#1E1F22] dark:text-zinc-200"
                    )}>
                        {msg.content}
                    </div>
                </div>
             ))}
             {isLoading && (
                 <div className="flex gap-x-2 items-start">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                         <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-[#1E1F22] dark:text-zinc-200 flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Печатает...
                    </div>
                 </div>
             )}
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-x-2">
            <Input
              disabled={isLoading}
              className="bg-zinc-200/90 dark:bg-[#1E1F22] border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
              placeholder="Напишите сообщение..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button disabled={isLoading || !input.trim()} size="icon" variant="primary">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
