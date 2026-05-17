"use client";

import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { UnreadTitleProvider } from "@/components/providers/unread-title-provider";

export const QueryProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <UnreadTitleProvider />
      <Toaster />
    </QueryClientProvider>
  )
}
