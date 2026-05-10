import { useState, useEffect, useRef } from 'react';
import { getStore, updateStore } from '../store/libraryStore';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/* ─── Note Editor ──────────────────────────────────────────── */
function NoteEditor({ note, room, library, onBack, onSave }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saved, setSaved] = useState(true);
  const debounceRef = useRef(null);

  const triggerSave = (t, c) => {
    setSaved(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSave(note.id, t, c);
      setSaved(true);
    }, 600);
  };

  const handleBack = () => {
    clearTimeout(debounceRef.current);
    onSave(note.id, title, content);
    onBack();
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Editor header */}
      <header className="sticky top-0 z-10 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="w-9 h-9 rounded-xl bg-[var(--code-bg)] flex items-center justify-center text-base text-[var(--text-h)] hover:opacity-70 transition-opacity"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--text)] opacity-50 truncate">
            {library.icon} {library.name} › {room.icon} {room.name}
          </p>
        </div>
        <span className={`text-xs transition-opacity ${saved ? 'opacity-30' : 'opacity-70'} text-[var(--text)]`}>
          {saved ? 'Saved' : 'Saving…'}
        </span>
      </header>

      {/* Editor body */}
      <div className="flex-1 flex flex-col px-5 pt-5 pb-24">
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); triggerSave(e.target.value, content); }}
          placeholder="Untitled"
          className="w-full text-2xl font-bold text-[var(--text-h)] bg-transparent outline-none border-none placeholder:text-[var(--text)] placeholder:opacity-25 mb-3"
        />

        {/* Accent divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: room.accent }}
          />
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); triggerSave(title, e.target.value); }}
          placeholder="Start writing…"
          className="flex-1 min-h-[65vh] w-full text-[15px] text-[var(--text)] bg-transparent outline-none border-none resize-none placeholder:text-[var(--text)] placeholder:opacity-25 leading-[1.8]"
        />
      </div>

      {/* Word count footer */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-3 bg-[var(--bg)]/80 backdrop-blur-sm border-t border-[var(--border)] flex justify-center">
        <p className="text-xs text-[var(--text)] opacity-30">
          {wordCount(content)} words · {content.length} characters
        </p>
      </div>
    </div>
  );
}

/* ─── Notes View ───────────────────────────────────────────── */
export default function NotesView({ room, library, onBack }) {
  const [notes, setNotes] = useState(() =>
    (getStore().notes || [])
      .filter((n) => n.roomId === room.id)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  );
  const [editingNote, setEditingNote] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');

  const persistNotes = (updated) => {
    setNotes(updated);
    const all = getStore().notes || [];
    const others = all.filter((n) => n.roomId !== room.id);
    updateStore({ notes: [...others, ...updated] });
  };

  const handleCreate = () => {
    const n = {
      id: genId(),
      roomId: room.id,
      libraryId: library.id,
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [n, ...notes];
    persistNotes(updated);
    setEditingNote(n);
  };

  const handleSave = (id, title, content) => {
    const updated = notes.map((n) =>
      n.id === id ? { ...n, title, content, updatedAt: new Date().toISOString() } : n
    );
    persistNotes(updated);
    if (editingNote?.id === id) {
      setEditingNote((prev) => ({ ...prev, title, content }));
    }
  };

  const handleDelete = (id) => {
    persistNotes(notes.filter((n) => n.id !== id));
    setDeleteConfirm(null);
  };

  const filtered = search.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  if (editingNote) {
    return (
      <NoteEditor
        note={editingNote}
        room={room}
        library={library}
        onBack={() => setEditingNote(null)}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-[var(--code-bg)] flex items-center justify-center text-base text-[var(--text-h)] hover:opacity-70 transition-opacity"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-[var(--text-h)] leading-tight flex items-center gap-1.5 truncate">
            <span>{room.icon}</span> {room.name}
          </h1>
          <p className="text-xs text-[var(--text)] opacity-50 truncate">
            {library.icon} {library.name}
          </p>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="px-4 pt-3 pb-0 flex items-center gap-1.5 text-xs text-[var(--text)] opacity-50">
        <span>Libraries</span><span>›</span>
        <span>{library.name}</span><span>›</span>
        <span className="text-[var(--text-h)] opacity-80 font-medium">{room.name}</span>
      </div>

      <main className="flex-1 px-4 py-4 pb-28">
        {notes.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center min-h-[55vh] gap-4 text-center">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
              style={{ background: `${room.accent}20` }}
            >
              {room.icon}
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-h)]">No notes yet</p>
              <p className="text-sm text-[var(--text)] opacity-50 mt-1 max-w-[220px]">
                Tap + to write your first note in {room.name}
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="px-6 py-3 rounded-2xl text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: room.accent }}
            >
              + Write a note
            </button>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="relative mb-4">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm opacity-40">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] text-sm text-[var(--text-h)] placeholder:text-[var(--text)] placeholder:opacity-40 outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            {/* Note list */}
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-[var(--text)] opacity-40 mt-12">No notes match your search.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filtered.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setEditingNote(note)}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-4 cursor-pointer active:scale-[0.98] transition-transform group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Accent line */}
                      <div
                        className="w-1 h-full min-h-[2.5rem] rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: room.accent }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm mb-1 ${note.title ? 'text-[var(--text-h)]' : 'text-[var(--text)] opacity-30'}`}>
                          {note.title || 'Untitled'}
                        </p>
                        {note.content ? (
                          <p className="text-xs text-[var(--text)] opacity-60 line-clamp-2 leading-relaxed">
                            {note.content}
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--text)] opacity-25 italic">Empty note</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-[var(--text)] opacity-30">{timeAgo(note.updatedAt)}</span>
                          {wordCount(note.content) > 0 && (
                            <span className="text-xs text-[var(--text)] opacity-30">
                              {wordCount(note.content)} words
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete */}
                      {deleteConfirm === note.id ? (
                        <div className="flex flex-col gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--code-bg)] text-[var(--text)] text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(note.id); }}
                          className="opacity-0 group-hover:opacity-40 focus:opacity-40 active:opacity-60 text-[var(--text)] transition-opacity text-sm flex-shrink-0 mt-0.5"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={handleCreate}
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full text-white shadow-xl text-2xl flex items-center justify-center active:scale-90 transition-transform hover:opacity-90 z-10"
        style={{ backgroundColor: room.accent }}
      >
        +
      </button>
    </div>
  );
}
