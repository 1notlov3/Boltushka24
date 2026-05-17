"use client";

import axios, { AxiosError } from "axios";
import { toast } from "sonner";

type RouterLike = {
  push: (href: string) => void;
};

let routerRef: RouterLike | null = null;

export const bindHttpRouter = (router: RouterLike | null) => {
  routerRef = router;
};

export const http = axios.create();

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    const status = error.response?.status;

    if (status === 401) {
      if (routerRef) {
        routerRef.push("/sign-in");
      } else if (typeof window !== "undefined") {
        window.location.assign("/sign-in");
      }
    } else if (status === 429) {
      const retryAfter = error.response?.headers["retry-after"];
      toast.error(`Слишком много запросов. ${retryAfter ? `Повторите через ${retryAfter} с` : "Попробуйте позже"}`);
    } else if (status && status >= 500) {
      toast.error("Сервис недоступен, попробуйте ещё раз");
    } else if (!error.response) {
      toast.error("Нет соединения");
    }

    return Promise.reject(error);
  },
);
