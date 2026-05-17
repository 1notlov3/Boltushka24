"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

import { useGlobalUnread } from "@/hooks/use-unread";

const BASE_TITLE = "Болтушка 24";

export const UnreadTitleProvider = () => {
  const { isSignedIn } = useAuth();
  const { data } = useGlobalUnread(isSignedIn ?? false);
  const total = data?.total ?? 0;

  useEffect(() => {
    document.title = total > 0 ? `(${total}) ${BASE_TITLE}` : BASE_TITLE;
  }, [total]);

  return null;
};
