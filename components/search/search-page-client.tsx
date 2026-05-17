"use client";

import { format } from "date-fns";
import { CalendarDays, Hash, Search, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchResult = {
  id: string;
  type: "channel" | "conversation";
  title: string;
  content: string;
  createdAt: string;
  url: string;
  author: {
    name: string;
    imageUrl: string;
  };
};

export function SearchPageClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [serverId, setServerId] = useState(params.get("serverId") ?? "");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [from, setFrom] = useState(params.get("from")?.slice(0, 10) ?? "");
  const [to, setTo] = useState(params.get("to")?.slice(0, 10) ?? "");
  const [author, setAuthor] = useState(params.get("author") ?? "");
  const [items, setItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSearch = useCallback(async () => {
    if (!serverId || !q.trim()) return;
    setLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams({ serverId, q: q.trim() });
      if (from) searchParams.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
      if (to) searchParams.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
      if (author.trim()) searchParams.set("author", author.trim());
      const response = await fetch(`/api/search?${searchParams.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Search failed");
      const payload = await response.json() as { items: SearchResult[] };
      setItems(payload.items);
      router.replace(`/search?${searchParams.toString()}`);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Ошибка поиска");
    } finally {
      setLoading(false);
    }
  }, [author, from, q, router, serverId, to]);

  useEffect(() => {
    if (serverId && q.trim()) {
      void runSearch();
    }
  }, [q, runSearch, serverId]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch();
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col gap-4 bg-white p-4 text-zinc-900 dark:bg-[#313338] dark:text-zinc-100">
      <form onSubmit={onSubmit} className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[1.25fr_2fr_1fr_1fr_1.25fr_auto]">
        <Input value={serverId} onChange={(event) => setServerId(event.target.value)} placeholder="ID сервера" />
        <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Поиск сообщений" />
        <Input value={from} onChange={(event) => setFrom(event.target.value)} type="date" aria-label="Дата от" />
        <Input value={to} onChange={(event) => setTo(event.target.value)} type="date" aria-label="Дата до" />
        <Input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="ID автора" />
        <Button type="submit" variant="primary" disabled={loading || !serverId || !q.trim()}>
          <Search className="mr-2 h-4 w-4" />
          Искать
        </Button>
      </form>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <div className="space-y-2">
        {loading && <p className="text-sm text-zinc-500">Поиск...</p>}
        {!loading && q.trim() && !items.length && !error && (
          <p className="text-sm text-zinc-500">Ничего не найдено</p>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(item.url)}
            className="w-full rounded-md border border-zinc-200 p-3 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {item.type === "channel" ? <Hash className="h-4 w-4" /> : <User className="h-4 w-4" />}
              <span className="min-w-0 truncate">{item.title} · {item.author.name}</span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-normal text-zinc-500">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(new Date(item.createdAt), "dd.MM.yyyy HH:mm")}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{item.content}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
