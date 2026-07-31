"use client";

import { useRef, useState } from "react";
import { UploadCloud, Paperclip, X } from "lucide-react";
import { Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface Props {
  prdText: string;
  onPrdTextChange: (text: string) => void;
  attachedFileName: string | null;
  attachedFileUrl?: string | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
}

export function PrdField({
  prdText,
  onPrdTextChange,
  attachedFileName,
  attachedFileUrl,
  onFileSelect,
  onFileRemove,
  disabled,
}: Props) {
  const [mode, setMode] = useState<"upload" | "paste">(prdText ? "paste" : "upload");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }

  if (attachedFileName) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-togo-border bg-togo-surface px-4 py-3">
        {attachedFileUrl ? (
          <a
            href={attachedFileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-togo-blue hover:underline min-w-0 truncate"
          >
            <Paperclip size={14} className="shrink-0" /> {attachedFileName}
          </a>
        ) : (
          <span className="flex items-center gap-2 text-sm text-togo-blue min-w-0 truncate">
            <Paperclip size={14} className="shrink-0" /> {attachedFileName}
          </span>
        )}
        <button
          type="button"
          onClick={onFileRemove}
          disabled={disabled}
          className="ml-auto text-togo-faint hover:text-[#EF4444] transition-colors shrink-0"
          title="Remove file"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div>
      {mode === "upload" ? (
        <>
          <label
            htmlFor="prd-file-drop"
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors",
              dragActive ? "border-togo-blue bg-togo-blue-muted" : "border-togo-border bg-togo-surface hover:border-togo-blue"
            )}
          >
            <UploadCloud size={28} className={dragActive ? "text-togo-blue" : "text-togo-faint"} />
            <span className="text-sm font-semibold text-togo-white">Drag &amp; Drop to Upload File</span>
            <span className="text-xs text-togo-faint">or click to browse (PDF, doc, etc.)</span>
            <input
              ref={fileInputRef}
              id="prd-file-drop"
              type="file"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelect(file);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
          </label>

          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-togo-border" />
            <span className="text-xs font-semibold text-togo-faint">OR</span>
            <div className="flex-1 h-px bg-togo-border" />
          </div>

          <button
            type="button"
            onClick={() => setMode("paste")}
            className="w-full rounded-md border border-togo-border bg-togo-surface py-2 text-sm font-semibold text-togo-blue hover:border-togo-blue transition-colors"
          >
            Paste
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <Textarea
            rows={3}
            autoFocus
            value={prdText}
            onChange={(e) => onPrdTextChange(e.target.value)}
            placeholder="Paste a link to the PRD doc, or the requirements themselves"
          />
          <button
            type="button"
            onClick={() => setMode("upload")}
            className="text-xs text-togo-blue hover:underline"
          >
            Attach a file instead
          </button>
        </div>
      )}
    </div>
  );
}
