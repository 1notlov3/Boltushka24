"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Bookmark, LogOut, Settings, SlidersHorizontal } from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useModal } from "@/hooks/use-modal-store";

export const UserMenu = () => {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { onOpen } = useModal();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar className="h-[48px] w-[48px]">
          <AvatarImage src={user.imageUrl} />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuItem
          onClick={() => openUserProfile()}
          className="cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Настройки аккаунта
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onOpen("userSettings")}
          className="cursor-pointer"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Настройки приложения
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onOpen("notificationCenter")}
          className="cursor-pointer"
        >
          <Bell className="h-4 w-4 mr-2" />
          Уведомления
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onOpen("savedMessages")}
          className="cursor-pointer"
        >
          <Bookmark className="h-4 w-4 mr-2" />
          Избранное
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="cursor-pointer text-red-600"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
