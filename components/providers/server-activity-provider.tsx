"use client";

import { UserStatus } from "@prisma/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useIdle } from "@/hooks/use-idle";
import { getSupabaseBrowser } from "@/lib/supabase";

type PresencePayload = {
  memberId: string;
  profileId: string;
  name: string;
  imageUrl: string;
  status: UserStatus;
};

export type TypingUser = {
  chatId: string;
  memberId: string;
  name: string;
  imageUrl?: string | null;
};

type TypingEntry = TypingUser & {
  expiresAt: number;
};

type CurrentPresenceMember = {
  memberId: string;
  profileId: string;
  name: string;
  imageUrl: string;
  status: UserStatus;
};

type PresenceContextValue = {
  members: Record<string, PresencePayload>;
  onlineCount: number;
  currentStatus: UserStatus;
};

type TypingContextValue = {
  typingByChatId: Record<string, TypingUser[]>;
};

const PresenceContext = createContext<PresenceContextValue>({
  members: {},
  onlineCount: 0,
  currentStatus: UserStatus.OFFLINE,
});
const TypingContext = createContext<TypingContextValue>({
  typingByChatId: {},
});

const TYPING_EVENT = "typing";
const TYPING_TTL = 3500;

function flattenPresenceState(state: Record<string, PresencePayload[]>) {
  const entries = Object.values(state)
    .flat()
    .filter((item) => item.status !== UserStatus.INVISIBLE && item.status !== UserStatus.OFFLINE);

  return Object.fromEntries(entries.map((item) => [item.memberId, item]));
}

function toTypingUsers(entries: Record<string, TypingEntry[]>) {
  return Object.fromEntries(
    Object.entries(entries).map(([chatId, items]) => [
      chatId,
      items
        .filter((item) => item.expiresAt > Date.now())
        .map(({ expiresAt: _expiresAt, ...item }) => item),
    ]),
  );
}

interface ServerActivityProviderProps {
  serverId: string;
  currentMember: CurrentPresenceMember;
  children: React.ReactNode;
}

export function ServerActivityProvider({
  serverId,
  currentMember,
  children,
}: ServerActivityProviderProps) {
  const { status } = useIdle(currentMember.status);
  const [members, setMembers] = useState<Record<string, PresencePayload>>({});
  const [typingByChatId, setTypingByChatId] = useState<Record<string, TypingUser[]>>({});
  const typingEntriesRef = useRef<Record<string, TypingEntry[]>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null>(null);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const pruneTyping = useCallback(() => {
    typingEntriesRef.current = Object.fromEntries(
      Object.entries(typingEntriesRef.current)
        .map(([chatId, entries]) => [chatId, entries.filter((entry) => entry.expiresAt > Date.now())] as const)
        .filter(([, entries]) => entries.length > 0),
    );
    setTypingByChatId(toTypingUsers(typingEntriesRef.current));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const presenceChannel = supabase.channel(`presence:server:${serverId}`, {
      config: {
        presence: {
          key: currentMember.memberId,
        },
      },
    });

    channelRef.current = presenceChannel;
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        setMembers(flattenPresenceState(presenceChannel.presenceState<PresencePayload>()));
      })
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === "SUBSCRIBED" && statusRef.current !== UserStatus.INVISIBLE) {
          void presenceChannel.track({
            ...currentMember,
            status: statusRef.current,
          });
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(presenceChannel);
    };
  }, [currentMember, serverId]);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;

    if (status === UserStatus.INVISIBLE) {
      void channel.untrack();
      return;
    }

    void channel.track({
      ...currentMember,
      status,
    });
  }, [currentMember, status]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const typingChannel = supabase.channel(`typing:server:${serverId}`, {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    typingChannel.on("broadcast", { event: TYPING_EVENT }, (event: { payload: TypingUser }) => {
      const payload = event.payload;
      if (!payload?.chatId || !payload.memberId || payload.memberId === currentMember.memberId) return;

      typingEntriesRef.current = {
        ...typingEntriesRef.current,
        [payload.chatId]: [
          ...(typingEntriesRef.current[payload.chatId] ?? []).filter((item) => item.memberId !== payload.memberId),
          {
            ...payload,
            expiresAt: Date.now() + TYPING_TTL,
          },
        ],
      };
      setTypingByChatId(toTypingUsers(typingEntriesRef.current));
    });
    typingChannel.subscribe();

    const interval = setInterval(pruneTyping, 1000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(typingChannel);
    };
  }, [currentMember.memberId, pruneTyping, serverId]);

  const presenceValue = useMemo<PresenceContextValue>(() => ({
    members,
    onlineCount: Object.keys(members).length,
    currentStatus: status,
  }), [members, status]);

  const typingValue = useMemo<TypingContextValue>(() => ({
    typingByChatId,
  }), [typingByChatId]);

  return (
    <PresenceContext.Provider value={presenceValue}>
      <TypingContext.Provider value={typingValue}>
        {children}
      </TypingContext.Provider>
    </PresenceContext.Provider>
  );
}

export function useServerPresence() {
  return useContext(PresenceContext);
}

export function useMemberPresence(memberId: string) {
  const { members } = useServerPresence();
  return members[memberId] ?? null;
}

export function useServerTyping(chatId: string) {
  const { typingByChatId } = useContext(TypingContext);
  return typingByChatId[chatId] ?? [];
}

export function useServerOnlineCount(serverId: string) {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`presence:server-online-watch:${serverId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(flattenPresenceState(channel.presenceState<PresencePayload>())).length);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId]);

  return onlineCount;
}
