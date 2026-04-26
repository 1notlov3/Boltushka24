import { Menu } from "lucide-react"

import {
  Sheet,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { ServerSidebar } from "@/components/server/server-sidebar";
import { MobileSheetContent } from "@/components/mobile-sheet-content";

export const MobileToggle = ({
  serverId
}: {
  serverId: string;
}) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-11 w-11 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label="Открыть меню"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <MobileSheetContent>
        <SheetTitle className="sr-only">Меню навигации</SheetTitle>
        <SheetDescription className="sr-only">Список серверов и каналов</SheetDescription>
        <div className="w-[72px] shrink-0">
          <NavigationSidebar />
        </div>
        <ServerSidebar serverId={serverId} />
      </MobileSheetContent>
    </Sheet>
  )
}