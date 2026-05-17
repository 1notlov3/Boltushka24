"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { bindHttpRouter } from "@/lib/http";

export const HttpProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  useEffect(() => {
    bindHttpRouter(router);
    return () => bindHttpRouter(null);
  }, [router]);

  return children;
};
