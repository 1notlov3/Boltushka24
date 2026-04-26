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
      className="p-0 flex gap-0 w-[88%] sm:max-w-md"
      onOpenAutoFocus={(e) => e.preventDefault()}
      onCloseAutoFocus={(e) => e.preventDefault()}
    >
      {children}
    </SheetContent>
  );
};
