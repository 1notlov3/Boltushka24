"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { getSupabaseBrowser } from "@/lib/supabase";
import { REALTIME_BROADCAST_EVENT } from "@/lib/realtime";

type Listener = {
  bivarianceHack(payload: unknown): void;
}["bivarianceHack"];
type ChannelEntry = {
  channel: RealtimeChannel;
  listeners: Set<Listener>;
  subscribed: boolean;
};

type RealtimeSocket = {
  on: (topic: string, listener: Listener) => void;
  off: (topic: string, listener?: Listener) => void;
  emit: (topic: string, payload: unknown) => void;
};

type SocketContextType = {
  socket: RealtimeSocket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const channelsRef = useRef<Map<string, ChannelEntry>>(new Map());
  const hadConnectionRef = useRef(false);

  const syncConnectedState = () => {
    const connected = Array.from(channelsRef.current.values()).some((entry) => entry.subscribed);
    setIsConnected(connected);
    return connected;
  };

  const socket: RealtimeSocket = useMemo(() => {
    let supabase: ReturnType<typeof getSupabaseBrowser> = null;
    try {
      supabase = typeof window !== "undefined" ? getSupabaseBrowser() : null;
    } catch (e) {
      console.warn("[SocketProvider] Supabase client unavailable, realtime disabled", e);
    }

    return {
      on(topic, listener) {
        if (!supabase) return;
        const existing = channelsRef.current.get(topic);
        if (existing) {
          existing.listeners.add(listener);
          return;
        }

        const channel = supabase.channel(topic, { config: { broadcast: { self: true } } });
        channel.on("broadcast", { event: REALTIME_BROADCAST_EVENT }, (msg: { payload: unknown }) => {
          const entry = channelsRef.current.get(topic);
          if (!entry) return;
          entry.listeners.forEach((topicListener) => topicListener(msg.payload));
        });

        const entry: ChannelEntry = {
          channel,
          listeners: new Set([listener]),
          subscribed: false,
        };
        channelsRef.current.set(topic, entry);

        channel.subscribe((status) => {
          const current = channelsRef.current.get(topic);
          if (!current) return;

          if (status === "SUBSCRIBED") {
            const wasConnected = Array.from(channelsRef.current.values()).some((item) => item.subscribed);
            current.subscribed = true;
            const connected = syncConnectedState();

            if (connected && hadConnectionRef.current && !wasConnected) {
              window.dispatchEvent(new CustomEvent("rt:reconnect"));
            }

            hadConnectionRef.current = true;
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            current.subscribed = false;
            syncConnectedState();
          }
        });
      },
      off(topic, listener) {
        if (!supabase) return;
        const entry = channelsRef.current.get(topic);
        if (!entry) return;

        if (listener) {
          entry.listeners.delete(listener);
        } else {
          entry.listeners.clear();
        }

        if (entry.listeners.size === 0) {
          entry.subscribed = false;
          supabase.removeChannel(entry.channel);
          channelsRef.current.delete(topic);
          syncConnectedState();
        }
      },
      emit(topic, payload) {
        if (!supabase) return;
        const entry = channelsRef.current.get(topic);
        if (!entry) {
          console.warn(`[socket] emit on unsubscribed topic: ${topic}`);
          return;
        }
        entry.channel.send({ type: "broadcast", event: REALTIME_BROADCAST_EVENT, payload });
      },
    };
  }, []);

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseBrowser> = null;
    try {
      supabase = typeof window !== "undefined" ? getSupabaseBrowser() : null;
    } catch {
      // Already warned in useMemo above
    }
    const channels = channelsRef.current;
    return () => {
      if (!supabase) return;
      channels.forEach(({ channel }) => {
        supabase!.removeChannel(channel);
      });
      channels.clear();
      setIsConnected(false);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
