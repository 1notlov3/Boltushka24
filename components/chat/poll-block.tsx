"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2, Square, SquareCheck } from "lucide-react";
import { toast } from "sonner";

import { http } from "@/lib/http";
import { cn } from "@/lib/utils";

export type PollOption = {
  id: string;
  text: string;
};

export type PollVote = {
  id: string;
  memberId: string;
  optionId: string;
};

export type PollData = {
  id: string;
  question: string;
  options: unknown;
  multiple: boolean;
  closesAt?: string | Date | null;
  votes: PollVote[];
};

interface PollBlockProps {
  poll: PollData;
  currentMemberId: string;
}

function normalizeOptions(options: unknown): PollOption[] {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) return null;

      const id = (option as { id?: unknown }).id;
      const text = (option as { text?: unknown }).text;

      if (typeof id !== "string" || typeof text !== "string") return null;
      return { id, text };
    })
    .filter((option): option is PollOption => !!option);
}

export function PollBlock({ poll, currentMemberId }: PollBlockProps) {
  const [state, setState] = useState<PollData>(poll);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    setState(poll);
  }, [poll]);

  useEffect(() => {
    if (!state.closesAt) {
      setIsClosed(false);
      return;
    }

    const closeAt = new Date(state.closesAt).getTime();
    const updateClosedState = () => setIsClosed(closeAt <= Date.now());

    updateClosedState();
    const interval = setInterval(updateClosedState, 30_000);

    return () => clearInterval(interval);
  }, [state.closesAt]);

  const options = useMemo(() => normalizeOptions(state.options), [state.options]);
  const totalVotes = state.votes.length;
  const selected = new Set(
    state.votes
      .filter((vote) => vote.memberId === currentMemberId)
      .map((vote) => vote.optionId),
  );
  const toggleVote = async (optionId: string) => {
    if (pendingOptionId || isClosed) return;

    const alreadySelected = selected.has(optionId);
    setPendingOptionId(optionId);

    try {
      const response = alreadySelected
        ? await http.delete<PollData>(`/api/polls/${state.id}/vote`, { data: { optionId } })
        : await http.post<PollData>(`/api/polls/${state.id}/vote`, { optionId });

      if (response.data) {
        setState((current) => ({
          ...current,
          ...response.data,
          options: response.data.options ?? current.options,
        }));
      }
    } catch (error) {
      console.log(error);
      toast.error("Не удалось обновить голос");
    } finally {
      setPendingOptionId(null);
    }
  };

  if (!options.length) return null;

  return (
    <div className="mt-2 w-full max-w-xl rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/50">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{state.question}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {state.multiple ? "Можно выбрать несколько вариантов" : "Один вариант"} · {totalVotes} {totalVotes === 1 ? "голос" : "голосов"}
          </p>
        </div>
        {isClosed && (
          <span className="rounded-sm bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            закрыт
          </span>
        )}
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const votes = state.votes.filter((vote) => vote.optionId === option.id).length;
          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const active = selected.has(option.id);
          const Icon = state.multiple
            ? active ? SquareCheck : Square
            : active ? CheckCircle2 : Circle;

          return (
            <button
              key={option.id}
              type="button"
              disabled={!!pendingOptionId || isClosed}
              onClick={() => toggleVote(option.id)}
              className={cn(
                "relative w-full overflow-hidden rounded-md border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-70",
                active
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500/60 dark:bg-indigo-500/10 dark:text-indigo-200"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
              )}
            >
              <span
                className="absolute inset-y-0 left-0 bg-indigo-500/10 transition-[width]"
                style={{ width: `${percent}%` }}
              />
              <span className="relative flex items-center gap-2">
                {pendingOptionId === option.id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 shrink-0" />
                )}
                <span className="min-w-0 flex-1 break-words">{option.text}</span>
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                  {votes} · {percent}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
