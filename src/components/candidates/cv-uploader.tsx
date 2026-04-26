"use client";

import { useRef, useState } from "react";
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
  value: string; // current cvUrl (Drive webViewLink)
  onChange: (next: string) => void;
  // Used to prefix the filename in Drive so files are easy to associate
  // with a candidate when browsing the Drive folder.
  candidateId?: string;
  disabled?: boolean;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

interface UploadResult {
  id: string;
  name: string;
  webViewLink: string;
  downloadLink: string;
}

async function uploadToServer(
  file: File,
  candidateId: string | undefined,
  onProgress: (pct: number) => void
): Promise<UploadResult> {
  // Use XHR (not fetch) to get upload progress events
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    if (candidateId) form.append("candidateId", candidateId);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      try {
        const res = JSON.parse(xhr.responseText) as {
          success: boolean;
          data?: UploadResult;
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300 && res.success && res.data) {
          resolve(res.data);
        } else {
          reject(new Error(res.error || `שגיאה ${xhr.status}`));
        }
      } catch {
        reject(new Error(`תגובה לא תקינה מהשרת (${xhr.status})`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("שגיאת רשת")));
    xhr.addEventListener("abort", () => reject(new Error("בוטל")));
    xhr.open("POST", "/api/cv/upload");
    xhr.send(form);
  });
}

export function CVUploader({ value, onChange, candidateId, disabled }: CVUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("הקובץ גדול מדי (מקסימום 10MB)");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadToServer(file, candidateId, setProgress);

      // Replacing — best-effort delete the old file from Drive
      if (value && value !== result.webViewLink) {
        fetch("/api/cv/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value }),
        }).catch(() => {});
      }

      onChange(result.webViewLink);
      toast.success("קורות החיים הועלו לדרייב בהצלחה");
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
      /* form clears either way */
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
          <p className="text-sm font-medium text-gray-900 truncate">קורות חיים</p>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline"
          >
            <ExternalLink className="size-3" />
            פתח ב-Google Drive
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
            <p className="text-sm text-gray-600">מעלה לדרייב... {progress}%</p>
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
      <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
        <AlertCircle className="size-3" />
        הקובץ יישמר בתיקיית Google Drive של AL
      </p>
    </div>
  );
}
