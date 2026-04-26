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

type Listener = (payload: any) => void;

type RealtimeSocket = {
  on: (topic: string, listener: Listener) => void;
  off: (topic: string, listener?: Listener) => void;
  emit: (topic: string, payload: any) => void;
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
  const channelsRef = useRef<Map<string, { channel: RealtimeChannel; listener: Listener }>>(new Map());
  const aliveRef = useRef(0);

  const socket: RealtimeSocket = useMemo(() => {
    const supabase = typeof window !== "undefined" ? getSupabaseBrowser() : null;

    return {
      on(topic, listener) {
        if (!supabase) return;
        const existing = channelsRef.current.get(topic);
        if (existing) {
          supabase.removeChannel(existing.channel);
          channelsRef.current.delete(topic);
        }
        const channel = supabase.channel(topic, { config: { broadcast: { self: true } } });
        channel.on("broadcast", { event: REALTIME_BROADCAST_EVENT }, (msg: { payload: unknown }) => {
          (listener as Listener)(msg.payload);
        });
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            aliveRef.current += 1;
            setIsConnected(true);
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            aliveRef.current = Math.max(0, aliveRef.current - 1);
            if (aliveRef.current === 0) setIsConnected(false);
          }
        });
        channelsRef.current.set(topic, { channel, listener });
      },
      off(topic, _listener) {
        if (!supabase) return;
        const entry = channelsRef.current.get(topic);
        if (entry) {
          supabase.removeChannel(entry.channel);
          channelsRef.current.delete(topic);
          aliveRef.current = Math.max(0, aliveRef.current - 1);
          if (aliveRef.current === 0) setIsConnected(false);
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
    const supabase = typeof window !== "undefined" ? getSupabaseBrowser() : null;
    const channels = channelsRef.current;
    return () => {
      if (!supabase) return;
      channels.forEach(({ channel }) => {
        supabase.removeChannel(channel);
      });
      channels.clear();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
