import {Channel, ChannelType, Server } from "@prisma/client";
import { create } from "zustand";


export type ModalType =
  | "createServer"
  | "invite"
  | "editServer"
  | "members"
  | "roles"
  | "forwardMessage"
  | "createChannel"
  | "createCategory"
  | "leaveServer"
  | "deleteServer"
  | "deleteChannel"
  | "editChannel"
  | "messageFile"
  | "deleteMessage"
  | "messageSearch"
  | "pinnedMessages"
  | "savedMessages"
  | "notificationCenter"
  | "userSettings"
  | "watchTogether"
  | "userRating";

interface ModalData {
  server?: Server;
  channel?: Channel;
  channelType?: ChannelType;
  categoryId?: string | null;
  chatId?: string;
  chatType?: "channel" | "conversation";
  serverId?: string;
  channelId?: string;
  conversationId?: string;
  apiUrl?: string;
  query?: Record<string, any>;
  message?: {
    id: string;
    content: string;
    fileUrl: string | null;
  };
}

interface ModalStore {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ type: null, isOpen: false })
}));
