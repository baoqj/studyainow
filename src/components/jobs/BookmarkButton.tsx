import { Bookmark } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setJobBookmark } from '../../lib/jobs';

export function BookmarkButton({
  jobSlug,
  bookmarked: initialBookmarked,
  saveLabel,
  removeLabel,
  onChange,
  showLabel = false,
  className = '',
}: {
  jobSlug: string;
  bookmarked: boolean;
  saveLabel: string;
  removeLabel: string;
  onChange?: (bookmarked: boolean) => void;
  showLabel?: boolean;
  className?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [saving, setSaving] = useState(false);

  useEffect(() => setBookmarked(initialBookmarked), [initialBookmarked]);

  async function toggle() {
    if (saving) return;
    const next = !bookmarked;
    setSaving(true);
    try {
      const result = await setJobBookmark(jobSlug, next);
      setBookmarked(result.bookmarked);
      onChange?.(result.bookmarked);
    } catch (error) {
      if (error instanceof Error && /Authentication required/i.test(error.message)) {
        navigate(`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const label = bookmarked ? removeLabel : saveLabel;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={bookmarked}
      disabled={saving}
      onClick={toggle}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
        bookmarked
          ? 'border-primary bg-primary text-on-primary hover:bg-primary/90'
          : 'border-outline-variant bg-surface-container-lowest text-primary hover:border-primary hover:bg-primary-container/35'
      } ${className}`}
    >
      <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
      {showLabel && <span>{label}</span>}
    </button>
  );
}
