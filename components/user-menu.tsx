"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";

export const UserMenu = () => {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-500 rounded-full"
          aria-label="Меню пользователя"
        >
          <Avatar className="h-[48px] w-[48px]">
            <AvatarImage src={user.imageUrl} alt="" />
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
