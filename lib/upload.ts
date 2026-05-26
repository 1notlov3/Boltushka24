"use client";

import { getSupabaseBrowser, UPLOAD_BUCKET } from "@/lib/supabase";

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"] as const;
export const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a"] as const;
export const ALLOWED_MESSAGE_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES, "application/pdf"] as const;
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

export type UploadKind = "messageFile" | "serverImage" | "voice";

export function fileExtensionFromUrl(url: string) {
  try {
    return new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
  } catch {
    return url.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  }
}

export function isImageUrl(url: string) {
  return ["png", "jpg", "jpeg", "webp", "gif"].includes(fileExtensionFromUrl(url));
}

export function isAudioUrl(url: string) {
  return ["webm", "ogg", "m4a", "mp3"].includes(fileExtensionFromUrl(url));
}

export function validateUploadFile(file: File, allowedTypes: readonly string[]) {
  if (!allowedTypes.includes(file.type)) {
    return `Недопустимый формат: ${file.type || "неизвестный"}`;
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return "Файл больше 10 МБ";
  }

  return null;
}

export async function uploadToSupabase(file: File | Blob, kind: UploadKind, fileName?: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    throw new Error("Загрузка недоступна — Supabase не настроен");
  }
  const ext = fileName?.split(".").pop() || file.type.split("/").pop()?.replace("mpeg", "mp3") || "bin";
  const path = `${kind}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
