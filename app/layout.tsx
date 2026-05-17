import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ruRU as ruRULoc } from "@clerk/localizations";

const ruRU = ruRULoc as unknown as Parameters<typeof ClerkProvider>[0]["localization"];
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";
import { ModalProvider } from "@/components/providers/modal-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { HttpProvider } from "@/components/providers/http-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { OutboxProvider } from "@/components/providers/outbox-provider";
import { CommandPalette } from "@/components/command-palette";

const font = Open_Sans({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Болтушка 24",
  description: "Чат, голос и видео в одном месте",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={ruRU}>
      <html lang="ru" suppressHydrationWarning>
        <body className={cn(
            font.className,
            "bg-white dark:bg-[#313338]"
          )}>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="boltushka-theme">
              <SocketProvider>
                <TooltipProvider>
                  <ModalProvider />
                  <CommandPalette />
                  <ServiceWorkerProvider />
                  <HttpProvider>
                    <QueryProvider>
                      <OutboxProvider>
                        {children}
                      </OutboxProvider>
                    </QueryProvider>
                  </HttpProvider>
                </TooltipProvider>
              </SocketProvider>
            </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
