"use client";

import { useClerk } from "@clerk/nextjs";
import { ChannelType } from "@prisma/client";
import { Hash, LogOut, MessageCirclePlus, Moon, PlusCircle, Search, Settings, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useModal } from "@/hooks/use-modal-store";

type DestinationPayload = {
  channels: Array<{
    id: string;
    name: string;
    type: ChannelType;
    url: string;
  }>;
  members: Array<{
    id: string;
    name: string;
    url: string;
  }>;
};

function useActiveServerId() {
  const params = useParams();
  const pathname = usePathname();
  const paramsServerId = typeof params?.serverId === "string" ? params.serverId : null;
  const pathServerId = pathname?.match(/\/servers\/([^/]+)/)?.[1] ?? null;

  return paramsServerId ?? pathServerId;
}

export function CommandPalette() {
  const router = useRouter();
  const serverId = useActiveServerId();
  const { onOpen } = useModal();
  const { signOut } = useClerk();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [destinations, setDestinations] = useState<DestinationPayload>({ channels: [], members: [] });

  const trimmedQuery = query.trim();
  const textChannels = useMemo(() => (
    destinations.channels.filter((channel) => channel.type === ChannelType.TEXT)
  ), [destinations.channels]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || !serverId) {
      setDestinations({ channels: [], members: [] });
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (trimmedQuery) params.set("q", trimmedQuery);
        const response = await fetch(`/api/servers/${serverId}/destinations?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Destinations failed");
        setDestinations(await response.json() as DestinationPayload);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[COMMAND_DESTINATIONS]", error);
        }
      }
    }, 150);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, serverId, trimmedQuery]);

  const run = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  const searchMessages = () => {
    if (!serverId || !trimmedQuery) return;
    run(() => router.push(`/search?serverId=${serverId}&q=${encodeURIComponent(trimmedQuery)}`));
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Поиск, переходы и действия"
      />
      <CommandList>
        <CommandEmpty>Ничего не найдено</CommandEmpty>
        {serverId && (
          <CommandGroup heading="Навигация">
            {trimmedQuery && (
              <CommandItem onSelect={searchMessages}>
                <Search className="mr-2 h-4 w-4" />
                Искать сообщения: {trimmedQuery}
                <CommandShortcut>Enter</CommandShortcut>
              </CommandItem>
            )}
            {textChannels.map((channel) => (
              <CommandItem key={channel.id} onSelect={() => run(() => router.push(channel.url))}>
                <Hash className="mr-2 h-4 w-4" />
                {channel.name}
              </CommandItem>
            ))}
            {destinations.members.map((member) => (
              <CommandItem key={member.id} onSelect={() => run(() => router.push(member.url))}>
                <User className="mr-2 h-4 w-4" />
                {member.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading="Действия">
          <CommandItem onSelect={() => run(() => onOpen("createServer"))}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Создать сообщество
          </CommandItem>
          {serverId && (
            <CommandItem onSelect={() => run(() => onOpen("createChannel"))}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Создать канал
            </CommandItem>
          )}
          {serverId && (
            <CommandItem onSelect={() => run(() => onOpen("createGroupConversation", { serverId }))}>
              <MessageCirclePlus className="mr-2 h-4 w-4" />
              Создать групповой чат
            </CommandItem>
          )}
          <CommandItem onSelect={() => run(() => onOpen("userSettings"))}>
            <Settings className="mr-2 h-4 w-4" />
            Настройки приложения
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
            {resolvedTheme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Переключить тему
          </CommandItem>
          <CommandItem onSelect={() => run(() => { void signOut({ redirectUrl: "/sign-in" }); })}>
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
