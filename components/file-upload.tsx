"use client";

import { FileIcon, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onChange: (url?: string) => void;
  value: string;
  endpoint: "messageFile" | "serverImage"
}

export const FileUpload = ({
  onChange,
  value,
  endpoint
}: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileType = value?.split(".").pop();
  const isMessageFile = endpoint === "messageFile";
  const accept = isMessageFile ? "image/*,application/pdf" : "image/*";

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error("Cloudinary env vars are missing");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const resourceType = isMessageFile ? "auto" : "image";
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onChange(data.secure_url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  if (value && fileType !== "pdf") {
    return (
      <div className="relative h-20 w-20">
        <Image
          fill
          src={value}
          alt="Upload"
          className="rounded-full"
        />
        <button
          onClick={() => onChange("")}
          className="bg-rose-500 text-white p-1 rounded-full absolute top-0 right-0 shadow-sm"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  if (value && fileType === "pdf") {
    return (
      <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10">
        <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400" />
        <a 
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
        >
          {value}
        </a>
        <button
          onClick={() => onChange("")}
          className="bg-rose-500 text-white p-1 rounded-full absolute -top-2 -right-2 shadow-sm"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-6 py-4 text-center">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />
      <Button
        type="button"
        variant="primary"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "Загрузка..." : "Загрузить"}
      </Button>
      <p className="text-xs text-zinc-500">
        {isMessageFile ? "PNG/JPG или PDF" : "PNG/JPG"}
      </p>
    </div>
  )
}
