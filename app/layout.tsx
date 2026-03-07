import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>
            {children}
        </TooltipProvider>
      </body>
    </html>
  );
}