"use client";

import { FileIcon, X } from "lucide-react";
import Image from "next/image";
import { CldUploadButton } from "next-cloudinary";

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
  const fileType = value?.split(".").pop();

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
    <CldUploadButton
      onSuccess={(result: any) => {
        onChange(result?.info?.secure_url);
      }}
      options={{
        maxFiles: 1,
        resourceType: endpoint === "messageFile" ? "auto" : "image",
        clientAllowedFormats: endpoint === "messageFile" ? ["png", "jpg", "jpeg", "pdf"] : ["png", "jpg", "jpeg"]
      }}
      uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
    >
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-6 py-4 text-center cursor-pointer hover:bg-zinc-100/50 transition">
        <div className="relative flex items-center justify-center">
            {/* Visual button placeholder since CldUploadButton wraps the whole area */}
            <div className="h-10 px-4 py-2 bg-indigo-500 text-white rounded-md text-sm font-medium hover:bg-indigo-500/90">
               Загрузить
            </div>
        </div>
        <p className="text-xs text-zinc-500">
          {endpoint === "messageFile" ? "PNG/JPG или PDF" : "PNG/JPG"}
        </p>
      </div>
    </CldUploadButton>
  )
}
