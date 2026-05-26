"use client";

import { Compass, Home, Menu, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

const links = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Обзор", icon: Compass },
];

export const MainMobileBar = () => {
  const pathname = usePathname();
  const { onOpen } = useModal();

  if (pathname?.startsWith("/servers/")) {
    return null;
  }

  return (
    <div className="md:hidden sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur dark:border-white/10 dark:bg-[#313338]/95">
      <div className="flex h-12 items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-sm">
          <Menu className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-zinc-900 dark:text-zinc-100">Boltushka24</p>
          <div className="mt-1 flex gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-zinc-500 transition",
                    active && "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="primary"
          className="h-10 w-10 shrink-0 rounded-2xl"
          aria-label="Создать сообщество"
          onClick={() => onOpen("createServer")}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
