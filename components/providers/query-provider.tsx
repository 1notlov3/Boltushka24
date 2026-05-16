"use client";

import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export const QueryProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )
}