"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  const initials = ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase()
    || user.username?.[0]?.toUpperCase()
    || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Меню пользователя">
        <Avatar className="h-[48px] w-[48px]">
          <AvatarImage src={user.imageUrl} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
