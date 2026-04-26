"use client";

import { FileIcon, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { getSupabaseBrowser, UPLOAD_BUCKET } from "@/lib/supabase";

interface FileUploadProps {
  onChange: (url?: string) => void;
  value: string;
  endpoint: "messageFile" | "serverImage";
}

const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const ALLOWED_MESSAGE_FILE = [...ALLOWED_IMAGE, "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

export const FileUpload = ({ onChange, value, endpoint }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = endpoint === "messageFile" ? ALLOWED_MESSAGE_FILE.join(",") : ALLOWED_IMAGE.join(",");
  const fileType = value?.split(".").pop()?.toLowerCase();

  if (value && fileType !== "pdf") {
    return (
      <div className="relative h-20 w-20">
        <Image fill src={value} alt="Upload" className="rounded-full object-cover" sizes="80px" />
        <button
          onClick={() => onChange("")}
          className="bg-rose-500 text-white p-1 rounded-full absolute top-0 right-0 shadow-sm"
          type="button"
          aria-label="Удалить файл"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (value && fileType === "pdf") {
    return (
      <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10">
        <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400" />
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline truncate max-w-[200px]"
        >
          {value.split("/").pop()}
        </a>
        <button
          onClick={() => onChange("")}
          className="bg-rose-500 text-white p-1 rounded-full absolute -top-2 -right-2 shadow-sm"
          type="button"
          aria-label="Удалить файл"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const handleFiles = async (files: FileList | null) => {
    setError(null);
    if (!files || files.length === 0) return;
    const file = files[0];

    const allowed = endpoint === "messageFile" ? ALLOWED_MESSAGE_FILE : ALLOWED_IMAGE;
    if (!allowed.includes(file.type)) {
      setError(`Недопустимый формат: ${file.type || "неизвестный"}`);
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Файл больше 10 МБ");
      return;
    }

    setUploading(true);
    try {
      const supabase = getSupabaseBrowser();
      const ext = file.name.split(".").pop() || "bin";
      const path = `${endpoint}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(UPLOAD_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      console.error("Upload error:", e);
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-6 py-4 text-center hover:bg-zinc-100/80 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        ) : (
          <Upload className="h-6 w-6 text-indigo-500" />
        )}
        <div className="h-9 px-4 py-2 bg-indigo-500 text-white rounded-md text-sm font-medium hover:bg-indigo-500/90">
          {uploading ? "Загрузка..." : "Выбрать файл"}
        </div>
        <p className="text-xs text-zinc-500">
          {endpoint === "messageFile" ? "PNG, JPG, WEBP, GIF или PDF · до 10 МБ" : "PNG, JPG, WEBP или GIF · до 10 МБ"}
        </p>
      </button>
      {error && <p className="mt-2 text-xs text-rose-500 text-center">{error}</p>}
    </div>
  );
};
