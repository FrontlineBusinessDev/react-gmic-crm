import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  accept?: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}

/** Drag-and-drop upload target with a click-to-browse fallback — the single shared
 * upload UI reused everywhere a raw <input type="file"> used to live. */
export function FileDropZone({
  accept,
  multiple,
  onFilesSelected,
  disabled,
  label = "Drag & drop a file here, or click to browse",
  hint,
  className,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFilesSelected(Array.from(fileList));
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
        dragOver ? "border-brand-blue-400 bg-brand-blue-50" : "border-ink-200 bg-ink-50/60",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-brand-blue-300 hover:bg-brand-blue-50/50",
        className
      )}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Upload className={cn("h-5 w-5", dragOver ? "text-brand-blue-500" : "text-ink-400")} />
      <p className="text-sm font-medium text-ink-700">{label}</p>
      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
