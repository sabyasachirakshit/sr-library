import { useState, useEffect, useRef } from 'react';
import { getStore, updateStore } from '../store/libraryStore';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
function wordCount(t) { return t.trim() ? t.trim().split(/\s+/).length : 0; }
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function compressImage(dataUrl, maxPx = 900, q = 0.75) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const c = document.createElement('canvas');
      c.width = img.width * ratio; c.height = img.height * ratio;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', q));
    };
    img.src = dataUrl;
  });
}

/* ── Search highlight ─────────────────────────────────────── */
function Hl({ text, q }) {
  if (!q.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escRe(q)})`, 'gi'));
  const low = q.toLowerCase();
  return <>{parts.map((p, i) => p.toLowerCase() === low
    ? <mark key={i} className="bg-yellow-300/80 text-[var(--text-h)] rounded-sm px-0.5 not-italic">{p}</mark>
    : p)}</>;
}

/* ── Fixed button stack  ← above primary ─────────────────── */
function FloatStack({ onBack, onPrimary, primaryLabel, accentColor, bottom = 24 }) {
  return (
    <div style={{ bottom }} className="fixed right-5 flex flex-col items-center gap-3 z-20">
      <button onClick={onBack}
        className="w-12 h-12 rounded-full bg-[var(--code-bg)] border border-[var(--border)] shadow-md text-[var(--text-h)] text-base flex items-center justify-center active:scale-90 transition-transform hover:opacity-70">
        ←
      </button>
      {onPrimary && (
        <button onClick={onPrimary}
          className="w-14 h-14 rounded-full text-white shadow-xl text-2xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: accentColor }}>
          {primaryLabel}
        </button>
      )}
    </div>
  );
}

/* ── Breadcrumb header ────────────────────────────────────── */
function ViewHeader({ library, room, right, extra }) {
  return (
    <header className="sticky top-0 z-10 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="min-w-0 flex-1 mr-2">
          <h1 className="text-base font-bold text-[var(--text-h)] leading-tight flex items-center gap-1.5 truncate">
            <span>{room.icon}</span> {room.name}
          </h1>
          <p className="text-xs text-[var(--text)] opacity-50 truncate">
            {library.icon} {library.name}
          </p>
        </div>
        {right}
      </div>
      {extra}
    </header>
  );
}

/* ── Inline image + text renderer ─────────────────────────── */
function ContentWithImages({ content, images, search }) {
  const imgMap = Object.fromEntries((images || []).map((im) => [im.id, im]));
  const parts = content.split(/(\[image:[a-z0-9]+\])/gi);
  return (
    <div className="text-[15px] text-[var(--text)] leading-[1.9]">
      {parts.map((part, i) => {
        const m = part.match(/^\[image:([a-z0-9]+)\]$/i);
        if (m) {
          const im = imgMap[m[1]];
          return im
            ? <img key={i} src={im.dataUrl} alt="" className="w-full rounded-2xl my-4 border border-[var(--border)] block" />
            : null;
        }
        return part
          ? <span key={i} className="whitespace-pre-wrap">{search ? <Hl text={part} q={search} /> : part}</span>
          : null;
      })}
    </div>
  );
}

/* ── Note Editor ──────────────────────────────────────────── */
function NoteEditor({ note, room, library, onBack, onSave }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [images, setImages] = useState(note.images || []);
  const [saved, setSaved] = useState(true);
  const [uploading, setUploading] = useState(false);
  const debRef = useRef(null);
  const fileRef = useRef(null);
  const taRef = useRef(null);

  const save = (t, c, imgs) => {
    setSaved(false);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { onSave(note.id, t, c, imgs); setSaved(true); }, 600);
  };

  const handleBack = () => {
    clearTimeout(debRef.current);
    const referenced = new Set([...content.matchAll(/\[image:([a-z0-9]+)\]/gi)].map((m) => m[1]));
    const cleanedImgs = images.filter((im) => referenced.has(im.id));
    onSave(note.id, title, content, cleanedImgs);
    onBack();
  };
  useEffect(() => () => clearTimeout(debRef.current), []);

  const handleImage = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const fr = new FileReader();
    fr.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result);
      const id = genId();
      const newImg = { id, dataUrl: compressed };
      const newImgs = [...images, newImg];
      setImages(newImgs);
      const ta = taRef.current;
      const pos = ta ? ta.selectionStart : content.length;
      const marker = `\n[image:${id}]\n`;
      const newC = content.slice(0, pos) + marker + content.slice(pos);
      setContent(newC);
      save(title, newC, newImgs);
      setUploading(false);
      requestAnimationFrame(() => {
        if (ta) { ta.selectionStart = ta.selectionEnd = pos + marker.length; ta.focus(); }
      });
    };
    fr.readAsDataURL(file);
    e.target.value = '';
  };

  const strippedContent = content.replace(/\[image:[a-z0-9]+\]/gi, '');
  const imgCount = [...content.matchAll(/\[image:[a-z0-9]+\]/gi)].length;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <ViewHeader library={library} room={room}
        right={
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => fileRef.current.click()} disabled={uploading} title="Insert image at cursor"
              className="w-9 h-9 rounded-xl bg-[var(--code-bg)] flex items-center justify-center text-base hover:opacity-70 transition-opacity disabled:opacity-30">
              {uploading ? '⏳' : '🖼'}
            </button>
            <span className={`text-xs text-[var(--text)] transition-opacity ${saved ? 'opacity-30' : 'opacity-60'}`}>
              {saved ? 'Saved' : 'Saving…'}
            </span>
          </div>
        } />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImage} />

      <div className="flex-1 flex flex-col px-5 pt-5 pb-16">
        <input autoFocus type="text" value={title}
          onChange={(e) => { setTitle(e.target.value); save(e.target.value, content, images); }}
          placeholder="Untitled"
          className="w-full text-2xl font-bold text-[var(--text-h)] bg-transparent outline-none border-none placeholder:text-[var(--text)] placeholder:opacity-25 mb-3" />
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: room.accent }} />
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <textarea ref={taRef} value={content}
          onChange={(e) => { setContent(e.target.value); save(title, e.target.value, images); }}
          placeholder="Start writing… tap 🖼 in the header to insert an image at cursor position"
          className="flex-1 min-h-[55vh] w-full text-[15px] text-[var(--text)] bg-transparent outline-none border-none resize-none placeholder:text-[var(--text)] placeholder:opacity-20 leading-[1.8]" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 h-10 px-5 bg-[var(--bg)]/90 backdrop-blur-sm border-t border-[var(--border)] flex items-center justify-center pointer-events-none">
        <p className="text-xs text-[var(--text)] opacity-30">
          {wordCount(strippedContent)} words · {strippedContent.length} chars
          {imgCount > 0 && ` · ${imgCount} image${imgCount > 1 ? 's' : ''}`}
        </p>
      </div>

      <FloatStack onBack={handleBack} accentColor={room.accent} bottom={56} />
    </div>
  );
}

/* ── Note Reader ──────────────────────────────────────────── */
function NoteReader({ note, room, library, search: outerSearch, onBack, onEdit }) {
  const [search, setSearch] = useState(outerSearch || '');
  const rawText = note.content.replace(/\[image:[a-z0-9]+\]/gi, '');
  const imgCount = (note.images || []).length;
  const matchCount = search.trim()
    ? ((note.title + '\n' + rawText).match(new RegExp(escRe(search), 'gi')) || []).length
    : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <ViewHeader library={library} room={room} right={null}
        extra={
          <div className="px-4 pb-2.5">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-40">🔍</span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Find in note…"
                className="w-full pl-7 pr-8 py-2 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] text-xs text-[var(--text-h)] placeholder:text-[var(--text)] placeholder:opacity-40 outline-none focus:border-[var(--accent)] transition-colors" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text)] opacity-40 hover:opacity-70">✕</button>
              )}
            </div>
            {search.trim() && (
              <p className="text-xs mt-1.5 px-1" style={{ color: matchCount > 0 ? 'var(--accent)' : 'var(--text)', opacity: matchCount > 0 ? 0.7 : 0.4 }}>
                {matchCount > 0 ? `${matchCount} match${matchCount > 1 ? 'es' : ''} found` : 'No matches'}
              </p>
            )}
          </div>
        } />

      <article className="flex-1 px-5 pt-6 pb-16">
        <h1 className="text-2xl font-bold text-[var(--text-h)] mb-3 leading-tight">
          {note.title
            ? (search ? <Hl text={note.title} q={search} /> : note.title)
            : <span className="opacity-30 italic">Untitled</span>}
        </h1>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: room.accent }} />
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {note.content
          ? <ContentWithImages content={note.content} images={note.images} search={search} />
          : <p className="text-sm text-[var(--text)] opacity-30 italic">This note is empty.</p>}
      </article>

      <div className="fixed bottom-0 left-0 right-0 z-10 h-10 px-5 bg-[var(--bg)]/90 backdrop-blur-sm border-t border-[var(--border)] flex items-center justify-center gap-4">
        <span className="text-xs text-[var(--text)] opacity-35">Updated {timeAgo(note.updatedAt)}</span>
        {wordCount(rawText) > 0 && <span className="text-xs text-[var(--text)] opacity-35">{wordCount(rawText)} words</span>}
        {imgCount > 0 && <span className="text-xs text-[var(--text)] opacity-35">{imgCount} image{imgCount > 1 ? 's' : ''}</span>}
      </div>

      <FloatStack onBack={onBack} onPrimary={onEdit} primaryLabel="✏️" accentColor={room.accent} bottom={56} />
    </div>
  );
}

/* ── Notes List View (default export) ────────────────────── */
export default function NotesView({ room, library, onBack }) {
  const [notes, setNotes] = useState(() =>
    (getStore().notes || []).filter((n) => n.roomId === room.id)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  );
  const [mode, setMode] = useState('list'); // list | read | edit
  const [activeNote, setActiveNote] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');

  const persist = (updated) => {
    setNotes(updated);
    const all = getStore().notes || [];
    updateStore({ notes: [...all.filter((n) => n.roomId !== room.id), ...updated] });
  };

  const handleCreate = () => {
    const n = { id: genId(), roomId: room.id, libraryId: library.id, title: '', content: '', images: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    persist([n, ...notes]);
    setActiveNote(n); setMode('edit');
  };

  const handleSave = (id, title, content, images) => {
    const updated = notes.map((n) => n.id === id ? { ...n, title, content, images: images ?? n.images, updatedAt: new Date().toISOString() } : n);
    persist(updated);
    setActiveNote((prev) => prev?.id === id ? { ...prev, title, content, images: images ?? prev.images } : prev);
  };

  const handleDelete = (id) => { persist(notes.filter((n) => n.id !== id)); setDeleteConfirm(null); };

  const openRead = (note) => { setActiveNote(note); setMode('read'); };
  const openEdit = (note) => { setActiveNote(note); setMode('edit'); };

  const filtered = search.trim()
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    : notes;

  if (mode === 'edit' && activeNote)
    return <NoteEditor note={activeNote} room={room} library={library} onBack={() => { setMode(notes.find(n => n.id === activeNote.id)?.content !== undefined ? 'read' : 'list'); }} onSave={handleSave} />;

  if (mode === 'read' && activeNote)
    return <NoteReader note={notes.find(n => n.id === activeNote.id) || activeNote} room={room} library={library} search={search} onBack={() => setMode('list')} onEdit={() => openEdit(activeNote)} />;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <ViewHeader library={library} room={room} right={null} />

      <main className="flex-1 px-4 py-4 pb-36">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[55vh] gap-4 text-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl" style={{ background: `${room.accent}20` }}>{room.icon}</div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-h)]">No notes yet</p>
              <p className="text-sm text-[var(--text)] opacity-50 mt-1 max-w-[220px]">Tap + to write your first note in {room.name}</p>
            </div>
            <button onClick={handleCreate} className="px-6 py-3 rounded-2xl text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all" style={{ backgroundColor: room.accent }}>
              + Write a note
            </button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm opacity-40">🔍</span>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notes…"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] text-sm text-[var(--text-h)] placeholder:text-[var(--text)] placeholder:opacity-40 outline-none focus:border-[var(--accent)] transition-colors" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text)] opacity-40 hover:opacity-70">✕</button>
                )}
              </div>
              {search.trim() && (
                <p className="text-xs mt-1.5 px-1" style={{ color: filtered.length > 0 ? 'var(--accent)' : 'var(--text)', opacity: filtered.length > 0 ? 0.7 : 0.4 }}>
                  {filtered.length > 0 ? `${filtered.length} note${filtered.length > 1 ? 's' : ''} found` : 'No notes found'}
                </p>
              )}
            </div>

            {filtered.length === 0
              ? <p className="text-center text-sm text-[var(--text)] opacity-40 mt-12">No notes match "{search}"</p>
              : (
                <div className="flex flex-col gap-2.5">
                  {filtered.map((note) => (
                    <div key={note.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden">
                      <div className="flex items-stretch">
                        {/* Accent bar */}
                        <div className="w-1 flex-shrink-0" style={{ backgroundColor: room.accent }} />

                        {/* Note body — click opens read */}
                        <div onClick={() => openRead(note)} className="flex-1 min-w-0 px-3.5 py-3.5 cursor-pointer active:bg-[var(--code-bg)] transition-colors">
                          <p className={`font-semibold text-sm mb-1 leading-tight ${note.title ? 'text-[var(--text-h)]' : 'text-[var(--text)] opacity-30'}`}>
                            {note.title ? <Hl text={note.title} q={search} /> : 'Untitled'}
                          </p>
                          {(() => { const preview = note.content.replace(/\[image:[a-z0-9]+\]/gi, '').trim(); return preview
                            ? <p className="text-xs text-[var(--text)] opacity-55 line-clamp-2 leading-relaxed"><Hl text={preview} q={search} /></p>
                            : <p className="text-xs text-[var(--text)] opacity-25 italic">Empty note</p>; })()}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-[var(--text)] opacity-30">{timeAgo(note.updatedAt)}</span>
                            {wordCount(note.content.replace(/\[image:[a-z0-9]+\]/gi, '')) > 0 && <span className="text-xs text-[var(--text)] opacity-30">{wordCount(note.content.replace(/\[image:[a-z0-9]+\]/gi, ''))} words</span>}
                            {note.images?.length > 0 && <span className="text-xs text-[var(--text)] opacity-30">🖼 {note.images.length}</span>}
                          </div>
                        </div>

                        {/* Edit + Delete */}
                        <div className="flex flex-col border-l border-[var(--border)] flex-shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(note); }}
                            className="flex-1 px-3 flex items-center justify-center text-base text-[var(--text)] hover:bg-[var(--code-bg)] transition-colors border-b border-[var(--border)]"
                            title="Edit">
                            ✏️
                          </button>
                          {deleteConfirm === note.id ? (
                            <div className="flex flex-col flex-1" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => handleDelete(note.id)} className="flex-1 px-3 flex items-center justify-center text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors border-b border-[var(--border)]">✓</button>
                              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-3 flex items-center justify-center text-xs text-[var(--text)] hover:bg-[var(--code-bg)] transition-colors">✕</button>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(note.id); }}
                              className="flex-1 px-3 flex items-center justify-center text-base text-[var(--text)] hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              title="Delete">
                              🗑
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </>
        )}
      </main>

      <FloatStack onBack={onBack} onPrimary={handleCreate} primaryLabel="+" accentColor={room.accent} />
    </div>
  );
}
