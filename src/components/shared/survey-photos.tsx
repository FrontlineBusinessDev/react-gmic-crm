/** Renders survey report photos — real thumbnails for uploaded object URLs, a labeled chip for legacy mock filenames. */
function isImageUrl(value: string) {
  return value.startsWith("blob:") || value.startsWith("data:") || value.startsWith("http");
}

export function SurveyPhotoGrid({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {photos.map((p, i) =>
        isImageUrl(p) ? (
          <img key={p + i} src={p} alt={`Survey photo ${i + 1}`} className="h-14 w-14 rounded-md border border-ink-100 object-cover shadow-sm" />
        ) : (
          <span key={p + i} className="rounded-md bg-white px-2 py-1 text-[10px] text-ink-500 shadow-sm">📷 {p}</span>
        )
      )}
    </div>
  );
}
