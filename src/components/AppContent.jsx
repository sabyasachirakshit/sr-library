import { useState, useRef, useMemo } from 'react';
import { getStore, updateStore, exportStore, importStore } from '../store/libraryStore';
import RoomsView from './RoomsView';
import NotesView from './NotesView';
import ArchivesView from './ArchivesView';

const ACCENT_COLORS = [
  '#9333ea', '#2563eb', '#16a34a', '#ea580c', '#db2777',
  '#dc2626', '#0d9488', '#ca8a04', '#0891b2', '#65a30d',
];

const ICONS = [
  '📚', '🎓', '💼', '🏠', '❤️', '🔬', '🎨', '🎵',
  '💡', '🌍', '⚡', '🛠️', '✍️', '🧪', '🏋️', '🍳',
  '🌱', '💰', '🎮', '📝', '🚀', '🎯', '🌸', '🔐',
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

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


function GlobalSearchModal({ onClose, onOpenLibrary, onOpenRoom, onOpenNote }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const store = getStore();
    const libs = store.libraries || [];
    const allRooms = store.rooms || [];
    const allNotes = store.notes || [];
    const out = [];
    libs.forEach((lib) => {
      if (lib.name.toLowerCase().includes(q))
        out.push({ type: 'library', lib, key: lib.id });
    });
    allRooms.forEach((room) => {
      if (!room.name.toLowerCase().includes(q)) return;
      const lib = libs.find((l) => l.id === room.libraryId) || null;
      if (!lib) return; // can't navigate without a library
      out.push({ type: 'room', room, lib, key: room.id });
    });
    allNotes.forEach((note) => {
      const raw = (note.content || '').replace(/\[image:[a-z0-9]+\]/gi, '');
      const titleMatch = (note.title || '').toLowerCase().includes(q);
      const contentMatch = raw.toLowerCase().includes(q);
      if (!titleMatch && !contentMatch) return;
      const room = allRooms.find((r) => r.id === note.roomId) || null;
      // fall back: resolve libraryId through the room when note.libraryId is missing
      const libId = note.libraryId || room?.libraryId;
      const lib = libs.find((l) => l.id === libId) || null;
      if (!room || !lib) return; // can't navigate without both
      out.push({ type: 'note', note, room, lib, raw, contentMatch, key: note.id });
    });
    return out;
  }, [query]);

  const getSnippet = (text, q) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text.slice(0, 80) + (text.length > 80 ? '…' : '');
    const s = Math.max(0, idx - 20);
    const e = Math.min(text.length, idx + q.length + 60);
    return (s > 0 ? '…' : '') + text.slice(s, e) + (e < text.length ? '…' : '');
  };

  const TYPE_COLOR = { library: '#9333ea', room: '#2563eb', note: '#16a34a' };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
        <span className="text-lg opacity-40">🔍</span>
        <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search libraries, rooms, notes…"
          className="flex-1 bg-transparent outline-none text-[var(--text-h)] text-[15px] placeholder:text-[var(--text)] placeholder:opacity-30" />
        {query && <button onClick={() => setQuery('')} className="text-xs text-[var(--text)] opacity-40 hover:opacity-80">✕</button>}
        <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] text-[var(--text)] hover:opacity-70 transition-opacity">Done</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
            <span className="text-5xl opacity-20">🔍</span>
            <p className="text-sm text-[var(--text)] opacity-40">Search across all libraries, rooms and notes</p>
          </div>
        ) : results.length === 0 ? (
          <p className="text-center text-sm text-[var(--text)] opacity-40 mt-16">No results for “{query}”</p>
        ) : (
          <>
            <p className="text-xs text-[var(--text)] opacity-40 mb-3">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            <div className="flex flex-col gap-2">
              {results.map((r) => (
                <button key={r.key}
                  onClick={() => {
                    if (r.type === 'library') onOpenLibrary(r.lib);
                    else if (r.type === 'room') onOpenRoom(r.room, r.lib);
                    else onOpenNote(r.note, r.room, r.lib);
                  }}
                  className="w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden hover:bg-[var(--code-bg)] transition-colors active:scale-[0.98]">
                  <div className="flex items-stretch">
                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: TYPE_COLOR[r.type] }} />
                    <div className="flex-1 min-w-0 px-4 py-3">
                      <p className="text-[10px] text-[var(--text)] opacity-40 truncate mb-1">
                        {r.type === 'library' && 'Library'}
                        {r.type === 'room' && `${r.lib.icon} ${r.lib.name}  ›  Room`}
                        {r.type === 'note' && `${r.lib.icon} ${r.lib.name}  ›  ${r.room.icon} ${r.room.name}  ›  Note`}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">
                          {r.type === 'library' ? r.lib.icon : r.type === 'room' ? r.room.icon : '📝'}
                        </span>
                        <span className="font-semibold text-sm text-[var(--text-h)] truncate">
                          {r.type === 'library' ? r.lib.name : r.type === 'room' ? r.room.name : (r.note.title || 'Untitled')}
                        </span>
                      </div>
                      {r.type === 'note' && r.contentMatch && (
                        <p className="text-xs text-[var(--text)] opacity-45 mt-1 line-clamp-2 leading-relaxed">
                          {getSnippet(r.raw, query)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center px-3 text-[var(--text)] opacity-25 text-sm flex-shrink-0">›</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LibraryCard({ lib, noteCount, roomCount, onDelete, onOpen, onEdit, onArchive }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setMenuOpen((v) => !v);
    setConfirmDelete(false);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(lib.id);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    setConfirmDelete(false);
  };

  return (
    <div onClick={onOpen} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] cursor-pointer active:scale-[0.97] transition-transform relative select-none">
      {/* Coloured header */}
      <div
        className="h-36 flex items-center justify-center relative rounded-t-2xl overflow-hidden"
        style={lib.coverImage ? {} : { background: `linear-gradient(135deg, ${lib.accent}38, ${lib.accent}18)` }}
      >
        {lib.coverImage
          ? <img src={lib.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : <span className="text-4xl z-10">{lib.icon}</span>}

        {/* Options button */}
        <button
          onClick={handleMenuClick}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-[var(--text-h)] text-base leading-none font-bold z-20"
        >
          ···
        </button>
      </div>

        {/* Dropdown — outside banner so it isn't clipped */}
        {menuOpen && (
          <div
            className="absolute top-8 right-2 z-50 bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden min-w-[150px]"
            onClick={(e) => e.stopPropagation()}
          >
            {!confirmDelete ? (
              <>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(lib); }}
                  className="w-full px-4 py-3 text-sm text-[var(--text-h)] text-left hover:bg-[var(--code-bg)] transition-colors border-b border-[var(--border)]">
                  ✏️ Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchive(lib); }}
                  className="w-full px-4 py-3 text-sm text-[var(--text-h)] text-left hover:bg-[var(--code-bg)] transition-colors border-b border-[var(--border)]">
                  📦 Archive
                </button>
                <button onClick={handleDeleteClick}
                  className="w-full px-4 py-3 text-sm text-red-500 text-left hover:bg-red-500/10 transition-colors">
                  🗑 Delete library
                </button>
              </>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                <p className="text-xs text-[var(--text)] text-center leading-snug">
                  Delete <strong className="text-[var(--text-h)]">{lib.name}</strong>?
                </p>
                <button
                  onClick={handleDeleteClick}
                  className="w-full py-2 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full py-2 rounded-xl bg-[var(--code-bg)] text-[var(--text)] text-xs hover:opacity-70 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

      {/* Card body */}
      <div className="px-3.5 py-3">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: lib.accent }}
          />
          <h3 className="font-semibold text-[var(--text-h)] truncate text-sm">{lib.name}</h3>
        </div>
        <p className="text-xs text-[var(--text)] opacity-50 pl-4">
          {roomCount} {roomCount === 1 ? 'room' : 'rooms'} · {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </p>
      </div>
    </div>
  );
}

function EditLibraryModal({ lib, onClose, onEdit }) {
  const [name, setName] = useState(lib.name);
  const [icon, setIcon] = useState(lib.icon);
  const [color, setColor] = useState(lib.accent);
  const [coverImage, setCoverImage] = useState(lib.coverImage || null);
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const fr = new FileReader();
    fr.onload = async (ev) => { setCoverImage(await compressImage(ev.target.result)); setUploading(false); };
    fr.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm modal-fade-in" />
      <div className="relative w-full sm:max-w-md bg-[var(--bg)] rounded-t-3xl sm:rounded-3xl z-10 modal-slide-up overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-[var(--border)] rounded-full" /></div>
        <div className="px-6 pt-4 pb-8 max-h-[85vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-[var(--text-h)] mb-6">Edit Library</h2>
          <div className="w-full h-20 rounded-2xl mb-6 flex items-center justify-center text-3xl overflow-hidden relative"
            style={coverImage ? {} : { background: `linear-gradient(135deg, ${color}40, ${color}20)` }}>
            {coverImage ? <img src={coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" /> : icon}
          </div>
          <div className="mb-5">
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">Cover Image <span className="normal-case font-normal opacity-40">(optional)</span></label>
            {coverImage ? (
              <div className="relative w-full h-20 rounded-xl overflow-hidden">
                <img src={coverImage} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setCoverImage(null)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors">✕</button>
              </div>
            ) : (
              <button onClick={() => imgRef.current.click()} disabled={uploading} className="w-full py-3 rounded-xl bg-[var(--code-bg)] border border-dashed border-[var(--border)] text-sm text-[var(--text)] opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 disabled:opacity-30">
                {uploading ? '⏳ Compressing…' : '🖼 Upload cover image'}
              </button>
            )}
            <input ref={imgRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
          </div>
          <div className="mb-5">
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">Name</label>
            <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && onEdit({ name: name.trim(), icon, accent: color, coverImage })} maxLength={32}
              className="w-full px-4 py-3 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] text-[var(--text-h)] placeholder:text-[var(--text)] placeholder:opacity-40 outline-none focus:border-[var(--accent)] transition-colors text-sm" />
          </div>
          <div className="mb-5">
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button key={ic} onClick={() => setIcon(ic)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    icon === ic ? 'scale-110 border-2 border-[var(--accent)] bg-[var(--accent-bg)]' : 'border-2 border-transparent bg-[var(--code-bg)]'
                  }`}>{ic}</button>
              ))}
            </div>
          </div>
          <div className="mb-7">
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">Color</label>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full transition-transform"
                  style={{ backgroundColor: c, transform: color === c ? 'scale(1.25)' : 'scale(1)', outline: color === c ? `3px solid ${c}` : '2px solid transparent', outlineOffset: '3px' }} />
              ))}
            </div>
          </div>
          <button onClick={() => name.trim() && onEdit({ name: name.trim(), icon, accent: color, coverImage })} disabled={!name.trim()}
            className="w-full py-3.5 rounded-2xl bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all">
            Update Library
          </button>
          <button onClick={onClose} className="w-full mt-2 py-3 rounded-2xl bg-[var(--code-bg)] text-[var(--text)] text-sm font-medium hover:opacity-70 active:scale-95 transition-all">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function CreateLibraryModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[0]);
  const [coverImage, setCoverImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const fr = new FileReader();
    fr.onload = async (ev) => {
      setCoverImage(await compressImage(ev.target.result));
      setUploading(false);
    };
    fr.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), icon, accent: color, coverImage: coverImage || null });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm modal-fade-in" />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-md bg-[var(--bg)] rounded-t-3xl sm:rounded-3xl z-10 modal-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-[var(--border)] rounded-full" />
        </div>

        <div className="px-6 pt-4 pb-8">
          <h2 className="text-xl font-bold text-[var(--text-h)] mb-6">New Library</h2>

          {/* Preview */}
          <div
            className="w-full h-20 rounded-2xl mb-6 flex items-center justify-center text-3xl overflow-hidden relative"
            style={coverImage ? {} : { background: `linear-gradient(135deg, ${color}40, ${color}20)` }}
          >
            {coverImage
              ? <img src={coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
              : icon}
          </div>

          {/* Cover Image */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">
              Cover Image <span className="normal-case font-normal opacity-40">(optional)</span>
            </label>
            {coverImage ? (
              <div className="relative w-full h-20 rounded-xl overflow-hidden">
                <img src={coverImage} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setCoverImage(null)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors">
                  ✕
                </button>
              </div>
            ) : (
              <button onClick={() => imgRef.current.click()} disabled={uploading}
                className="w-full py-3 rounded-xl bg-[var(--code-bg)] border border-dashed border-[var(--border)] text-sm text-[var(--text)] opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 disabled:opacity-30">
                {uploading ? '⏳ Compressing…' : '🖼 Upload cover image'}
              </button>
            )}
            <input ref={imgRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
          </div>

          {/* Name */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">
              Name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. School, Work, Personal…"
              maxLength={32}
              className="w-full px-4 py-3 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] text-[var(--text-h)] placeholder:text-[var(--text)] placeholder:opacity-40 outline-none focus:border-[var(--accent)] transition-colors text-sm"
            />
          </div>

          {/* Icon */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    icon === ic
                      ? 'scale-110 border-2 border-[var(--accent)] bg-[var(--accent-bg)]'
                      : 'border-2 border-transparent bg-[var(--code-bg)]'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="mb-7">
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">
              Color
            </label>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-transform"
                  style={{
                    backgroundColor: c,
                    transform: color === c ? 'scale(1.25)' : 'scale(1)',
                    outline: color === c ? `3px solid ${c}` : '2px solid transparent',
                    outlineOffset: '3px',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Create */}
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full py-3.5 rounded-2xl bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all"
          >
            Create Library
          </button>
          <button
            onClick={onClose}
            className="w-full mt-2 py-3 rounded-2xl bg-[var(--code-bg)] text-[var(--text)] text-sm font-medium hover:opacity-70 active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppContent({ onLock }) {
  const [libraries, setLibraries] = useState(() => getStore().libraries || []);
  const [showCreate, setShowCreate] = useState(false);
  const [editingLib, setEditingLib] = useState(null);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [initialNoteId, setInitialNoteId] = useState(null);
  const [view, setView] = useState('libraries');
  const [activeLibrary, setActiveLibrary] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const importRef = useRef(null);
  const [importMsg, setImportMsg] = useState('');
  const [libSearch, setLibSearch] = useState('');
  const [libSort, setLibSort] = useState('date');

  if (view === 'archives') {
    return <ArchivesView onBack={() => {
      setLibraries(getStore().libraries || []);
      setView('libraries');
    }} />;
  }
  if (view === 'notes') {
    return (
      <NotesView
        room={activeRoom}
        library={activeLibrary}
        onBack={() => { setView('rooms'); setInitialNoteId(null); }}
        initialNoteId={initialNoteId}
      />
    );
  }
  if (view === 'rooms') {
    return (
      <RoomsView
        library={activeLibrary}
        onBack={() => setView('libraries')}
        onOpenRoom={(room) => { setActiveRoom(room); setView('notes'); }}
      />
    );
  }

  const persistLibraries = (libs) => {
    setLibraries(libs);
    updateStore({ libraries: libs });
  };

  const handleCreate = ({ name, icon, accent, coverImage }) => {
    const newLib = {
      id: genId(),
      name,
      icon,
      accent,
      coverImage: coverImage || null,
      createdAt: new Date().toISOString(),
    };
    persistLibraries([...libraries, newLib]);
    setShowCreate(false);
  };

  const handleEditLibrary = (lib, { name, icon, accent, coverImage }) => {
    persistLibraries(libraries.map((l) => l.id === lib.id ? { ...l, name, icon, accent, coverImage: coverImage || null } : l));
    setEditingLib(null);
  };

  const handleDelete = (id) => {
    const store = getStore();
    persistLibraries(libraries.filter((l) => l.id !== id));
    updateStore({
      rooms: (store.rooms || []).filter((r) => r.libraryId !== id),
      notes: (store.notes || []).filter((n) => n.libraryId !== id),
    });
  };

  const handleArchiveLibrary = (lib) => {
    const store = getStore();
    const libRooms = (store.rooms || []).filter((r) => r.libraryId === lib.id);
    const libNotes = (store.notes || []).filter((n) => n.libraryId === lib.id);
    const entry = { id: genId(), type: 'library', archivedAt: new Date().toISOString(), library: lib, rooms: libRooms, notes: libNotes };
    updateStore({
      archives: [...(store.archives || []), entry],
      rooms: (store.rooms || []).filter((r) => r.libraryId !== lib.id),
      notes: (store.notes || []).filter((n) => n.libraryId !== lib.id),
    });
    persistLibraries(libraries.filter((l) => l.id !== lib.id));
  };

  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = importStore(ev.target.result);
      if (ok) {
        setLibraries(getStore().libraries || []);
        setImportMsg('Imported!');
        setTimeout(() => setImportMsg(''), 2500);
      } else {
        setImportMsg('Invalid file');
        setTimeout(() => setImportMsg(''), 2500);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const noteCount = (libId) =>
    (getStore().notes || []).filter((n) => n.libraryId === libId).length;

  const roomCount = (libId) =>
    (getStore().rooms || []).filter((r) => r.libraryId === libId).length;

  const filteredLibs = (() => {
    const f = libSearch.trim()
      ? libraries.filter((l) => l.name.toLowerCase().includes(libSearch.toLowerCase()))
      : [...libraries];
    return f.sort((a, b) => libSort === 'name'
      ? a.name.localeCompare(b.name)
      : new Date(b.createdAt) - new Date(a.createdAt));
  })();

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] px-5 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-h)] leading-tight tracking-tight">
            SR Library
          </h1>
          <p className="text-xs text-[var(--text)] opacity-50">
            {libSearch.trim() ? `${filteredLibs.length} of ${libraries.length}` : `${libraries.length}`} {libraries.length === 1 ? 'library' : 'libraries'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {importMsg && (
            <span className={`text-xs px-2 py-1 rounded-lg ${importMsg === 'Imported!' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {importMsg}
            </span>
          )}
          <button
            onClick={() => setShowGlobalSearch(true)}
            title="Global search"
            className="w-9 h-9 rounded-xl bg-[var(--code-bg)] flex items-center justify-center text-base hover:opacity-70 transition-opacity"
          >
            🔍
          </button>
          <button
            onClick={() => setView('archives')}
            title="Archives"
            className="w-9 h-9 rounded-xl bg-[var(--code-bg)] flex items-center justify-center text-base hover:opacity-70 transition-opacity"
          >
            📦
          </button>
          <button
            onClick={() => importRef.current.click()}
            title="Import JSON backup"
            className="w-9 h-9 rounded-xl bg-[var(--code-bg)] flex items-center justify-center text-base hover:opacity-70 transition-opacity"
          >
            ⬆️
          </button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
          <button
            onClick={exportStore}
            title="Export data as JSON"
            className="w-9 h-9 rounded-xl bg-[var(--code-bg)] flex items-center justify-center text-base hover:opacity-70 transition-opacity"
          >
            ⬇️
          </button>
          <button
            onClick={onLock}
            title="Lock"
            className="w-9 h-9 rounded-xl bg-[var(--code-bg)] flex items-center justify-center text-base hover:opacity-70 transition-opacity"
          >
            🔒
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 px-4 py-5">
        {libraries.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm opacity-40">🔍</span>
              <input type="text" value={libSearch} onChange={(e) => setLibSearch(e.target.value)}
                placeholder="Search libraries…"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] text-sm text-[var(--text-h)] placeholder:text-[var(--text)] placeholder:opacity-40 outline-none focus:border-[var(--accent)] transition-colors" />
              {libSearch && (
                <button onClick={() => setLibSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text)] opacity-40 hover:opacity-70">✕</button>
              )}
            </div>
            {libSearch.trim() && (
              <p className="text-xs mt-1.5 px-1" style={{ color: filteredLibs.length > 0 ? 'var(--accent)' : 'var(--text)', opacity: filteredLibs.length > 0 ? 0.7 : 0.4 }}>
                {filteredLibs.length > 0 ? `${filteredLibs.length} librar${filteredLibs.length > 1 ? 'ies' : 'y'} found` : 'No libraries found'}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-[var(--text)] opacity-40 mr-0.5">Sort:</span>
              {['date', 'name'].map((s) => (
                <button key={s} onClick={() => setLibSort(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    libSort === s ? 'bg-[var(--accent)] text-white' : 'bg-[var(--code-bg)] border border-[var(--border)] text-[var(--text)] hover:opacity-70'
                  }`}>
                  {s === 'date' ? 'Date' : 'Name'}
                </button>
              ))}
            </div>
          </div>
        )}
        {libraries.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
            <div className="w-24 h-24 rounded-3xl bg-[var(--code-bg)] flex items-center justify-center text-5xl mb-2">
              📂
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-h)]">No libraries yet</p>
              <p className="text-sm text-[var(--text)] opacity-50 mt-1 max-w-[220px]">
                Create a library to start organising your notes
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-1 px-6 py-3 rounded-2xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              + Create library
            </button>
          </div>
        ) : (
          /* Library grid */
          filteredLibs.length === 0 && libSearch.trim() ? (
            <p className="text-center text-sm text-[var(--text)] opacity-40 mt-12">No libraries match "{libSearch}"</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredLibs.map((lib) => (
              <LibraryCard
                key={lib.id}
                lib={lib}
                noteCount={noteCount(lib.id)}
                roomCount={roomCount(lib.id)}
                onDelete={handleDelete}
                onOpen={() => { setActiveLibrary(lib); setView('rooms'); }}
                onEdit={setEditingLib}
                onArchive={handleArchiveLibrary}
              />
            ))}
            </div>
          )
        )}
      </main>

      {/* ── FAB ── */}
      {libraries.length > 0 && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-[var(--accent)] text-white shadow-xl text-2xl flex items-center justify-center active:scale-90 transition-transform hover:opacity-90 z-10"
        >
          +
        </button>
      )}

      {editingLib && (
        <EditLibraryModal lib={editingLib} onClose={() => setEditingLib(null)} onEdit={(updates) => handleEditLibrary(editingLib, updates)} />
      )}
      {showGlobalSearch && (
        <GlobalSearchModal
          onClose={() => setShowGlobalSearch(false)}
          onOpenLibrary={(lib) => { setActiveLibrary(lib); setView('rooms'); setShowGlobalSearch(false); }}
          onOpenRoom={(room, lib) => { setActiveLibrary(lib); setActiveRoom(room); setView('notes'); setShowGlobalSearch(false); }}
          onOpenNote={(note, room, lib) => { setActiveLibrary(lib); setActiveRoom(room); setInitialNoteId(note.id); setView('notes'); setShowGlobalSearch(false); }}
        />
      )}

      {/* ── Create modal ── */}
      {showCreate && (
        <CreateLibraryModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
