"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  ExternalLink,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface CVUploaderProps {
  value: string; // current cvUrl
  onChange: (next: string) => void;
  // Used to namespace the blob key so files are easy to associate with a
  // candidate when browsing the Vercel Storage dashboard.
  candidateId?: string;
  disabled?: boolean;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

export function CVUploader({ value, onChange, candidateId, disabled }: CVUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filename = value ? decodeURIComponent(value.split("/").pop() || "") : "";
  // Strip the candidate-id prefix so the displayed name is the original file
  const displayName = filename.replace(/^[a-f0-9]{6,}-/, "");

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("הקובץ גדול מדי (מקסימום 10MB)");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Path: cv/{candidateId-or-new}/{timestamp}-{filename}
      // Storing under cv/ keeps everything grouped in Vercel's Storage dashboard.
      const idPart = candidateId || "new";
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `cv/${idPart}/${Date.now()}-${safeName}`;

      const blob = await upload(path, file, {
        access: "public",
        handleUploadUrl: "/api/cv/upload-token",
        contentType: file.type,
        onUploadProgress: (e) => setProgress(Math.round(e.percentage)),
      });

      // If replacing, delete the old file (best-effort, fire and forget)
      if (value && value !== blob.url) {
        fetch("/api/cv/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value }),
        }).catch(() => {});
      }

      onChange(blob.url);
      toast.success("קורות החיים הועלו בהצלחה");
    } catch (e) {
      const msg = (e as Error).message;
      console.error("CV upload failed:", e);
      toast.error(`העלאה נכשלה: ${msg}`);
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    if (!confirm("למחוק את קובץ קורות החיים?")) return;
    try {
      await fetch("/api/cv/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
    } catch {
      /* ignore — even if the delete fails the URL is cleared from the form */
    }
    onChange("");
    toast.success("קובץ נמחק");
  };

  // Has uploaded file
  if (value) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md border border-gray-200 bg-gray-50/50">
        <FileText className="size-5 text-[#2563EB] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate" dir="ltr">
            {displayName || "קורות חיים"}
          </p>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline"
          >
            <ExternalLink className="size-3" />
            פתח בלשונית חדשה
          </a>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="text-xs"
        >
          החלף
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleRemove}
          disabled={disabled || uploading}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="size-4" />
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    );
  }

  // No file — drag/drop zone
  return (
    <div>
      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`
          flex flex-col items-center justify-center gap-2 p-6 rounded-md border-2 border-dashed
          transition-colors cursor-pointer text-center
          ${
            dragOver
              ? "border-[#2563EB] bg-blue-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }
          ${disabled || uploading ? "opacity-60 pointer-events-none" : ""}
        `}
      >
        {uploading ? (
          <>
            <Loader2 className="size-6 text-[#2563EB] animate-spin" />
            <p className="text-sm text-gray-600">מעלה... {progress}%</p>
            <div className="w-full max-w-[200px] h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2563EB] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <Upload className="size-6 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                לחצו או גררו קובץ קורות חיים
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                PDF / Word / תמונה — עד 10MB
              </p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      {value === "" && (
        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <AlertCircle className="size-3" />
          הקובץ יישמר ב-Vercel Blob תחת תיקיית cv/
        </p>
      )}
    </div>
  );
}
