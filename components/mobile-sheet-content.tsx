"use client";

import { ReactNode } from "react";
import { SheetContent } from "@/components/ui/sheet";

interface MobileSheetContentProps {
  children: ReactNode;
}

export const MobileSheetContent = ({ children }: MobileSheetContentProps) => {
  return (
    <SheetContent
      side="left"
      className="p-0 flex gap-0 w-[calc(100vw-0.5rem)] max-w-[312px] sm:max-w-md pb-[env(safe-area-inset-bottom)]"
      onOpenAutoFocus={(e) => e.preventDefault()}
      onCloseAutoFocus={(e) => e.preventDefault()}
    >
      {children}
    </SheetContent>
  );
};
