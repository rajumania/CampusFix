import { useState } from 'react';
import { initials, timeAgo } from '../utils/format.js';

export function CommentThread({ comments, canComment, onSubmit }) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);

  const send = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setPending(true);
    try {
      await onSubmit(value);
      setText('');
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <h2 className="mb-3 font-semibold text-ink">Discussion</h2>

      {comments.length === 0 ? (
        <p className="mb-4 text-sm text-slate-400">No messages on this complaint yet.</p>
      ) : (
        <ul className="mb-5 space-y-3">
          {comments.map((comment) => (
            <li key={comment._id} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {initials(comment.author?.name)}
              </span>
              <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">
                  {comment.author?.name || 'Unknown'}
                  {comment.author?.role && (
                    <span className="ml-1 font-normal text-slate-400 capitalize">{comment.author.role}</span>
                  )}
                </p>
                <p className="mt-1 text-sm break-words whitespace-pre-wrap text-slate-700">{comment.text}</p>
                <p className="mt-1 text-xs text-slate-400">{timeAgo(comment.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <form onSubmit={send} className="flex gap-2">
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add an update or ask for more detail…"
            maxLength={800}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={pending || !text.trim()}>
            Post
          </button>
        </form>
      ) : (
        <p className="text-xs text-slate-400">You are not a participant in this complaint, so the thread is read-only.</p>
      )}
    </div>
  );
}

export function ImageGallery({ images, title }) {
  const [active, setActive] = useState(null);

  if (!images.length) {
    return (
      <div>
        <h2 className="mb-3 font-semibold text-ink">Photographs</h2>
        <p className="text-sm text-slate-400">No photographs were attached to this complaint.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-ink">Photographs</h2>
        <span className="text-xs text-slate-400">{images.length} attached</span>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, index) => (
          <li key={image.publicId}>
            <button
              type="button"
              onClick={() => setActive(index)}
              className="block w-full overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-2 hover:ring-brand-400"
            >
              <img src={image.url} alt={`${title} evidence ${index + 1}`} className="h-28 w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {active !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <img
            src={images[active].url}
            alt={`${title} enlarged`}
            className="max-h-[85vh] max-w-full rounded-lg bg-white object-contain"
          />
          <button type="button" className="btn-secondary absolute top-4 right-4" onClick={() => setActive(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
