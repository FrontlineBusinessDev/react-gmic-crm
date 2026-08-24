import { useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileDropZone } from "@/components/shared/file-drop-zone";
import type { JobNoteEntry } from "@/types";

interface JobNotesPanelProps {
  entries: JobNoteEntry[];
  onAddNote: (text: string, photos: string[]) => void;
}

/** Job notes/photos log — open to both admins and technicians, appended (never overwritten). */
export function JobNotesPanel({ entries, onAddNote }: JobNotesPanelProps) {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  function handleFiles(files: File[]) {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...urls]);
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
    URL.revokeObjectURL(url);
  }

  function submit() {
    if (!text.trim() && photos.length === 0) return;
    onAddNote(text.trim(), photos);
    setText("");
    setPhotos([]);
  }

  return (
    <div className="space-y-3">
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries
            .slice()
            .reverse()
            .map((entry) => (
              <div key={entry.id} className="rounded-lg bg-ink-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink-800">{entry.authorName}</p>
                  <p className="shrink-0 text-xs text-ink-400">
                    {new Date(entry.timestamp).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                {entry.text && <p className="mt-1 whitespace-pre-wrap text-ink-700">{entry.text}</p>}
                {entry.photos && entry.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {entry.photos.map((url, i) => (
                      <img
                        key={url + i}
                        src={url}
                        alt="Job photo"
                        className="h-16 w-16 rounded-md border border-ink-100 object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-ink-100 p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note for this job..."
          rows={2}
        />
        <FileDropZone
          accept="image/*"
          multiple
          onFilesSelected={handleFiles}
          label="Drag & drop photos here, or click to browse"
        />
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {photos.map((url) => (
              <div key={url} className="group relative">
                <img
                  src={url}
                  alt="New upload"
                  className="h-16 w-16 rounded-md border border-ink-100 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-ink-800 p-0.5 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button
            variant="brand"
            size="sm"
            disabled={!text.trim() && photos.length === 0}
            onClick={submit}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" /> Add Note
          </Button>
        </div>
      </div>
    </div>
  );
}
