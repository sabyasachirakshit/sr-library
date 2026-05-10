import { useState, useRef } from 'react';
import { getStore, updateStore, exportStore, importStore } from '../store/libraryStore';
import RoomsView from './RoomsView';
import NotesView from './NotesView';

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

function RenameModal({ current, onClose, onRename }) {
  const [name, setName] = useState(current);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm modal-fade-in" />
      <div className="relative w-full sm:max-w-sm bg-[var(--bg)] rounded-t-3xl sm:rounded-3xl z-10 modal-slide-up px-6 pt-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-5 sm:hidden"><div className="w-10 h-1 bg-[var(--border)] rounded-full" /></div>
        <h2 className="text-lg font-bold text-[var(--text-h)] mb-4">Rename library</h2>
        <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && onRename(name.trim())}
          maxLength={32} className="w-full px-4 py-3 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] text-[var(--text-h)] outline-none focus:border-[var(--accent)] transition-colors text-sm mb-4" />
        <button onClick={() => name.trim() && onRename(name.trim())} disabled={!name.trim()} className="w-full py-3 rounded-2xl bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-30">Save</button>
      </div>
    </div>
  );
}

function LibraryCard({ lib, noteCount, roomCount, onDelete, onOpen, onRename }) {
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
        className="h-24 flex items-center justify-center relative rounded-t-2xl overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${lib.accent}38, ${lib.accent}18)` }}
      >
        <span className="text-4xl z-10">{lib.icon}</span>

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
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(lib); }}
                  className="w-full px-4 py-3 text-sm text-[var(--text-h)] text-left hover:bg-[var(--code-bg)] transition-colors border-b border-[var(--border)]">
                  ✏️ Rename
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

function CreateLibraryModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[0]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), icon, accent: color });
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
            className="w-full h-20 rounded-2xl mb-6 flex items-center justify-center text-3xl"
            style={{ background: `linear-gradient(135deg, ${color}40, ${color}20)` }}
          >
            {icon}
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
        </div>
      </div>
    </div>
  );
}

export default function AppContent({ onLock }) {
  const [libraries, setLibraries] = useState(() => getStore().libraries || []);
  const [showCreate, setShowCreate] = useState(false);
  const [renamingLib, setRenamingLib] = useState(null);
  const [view, setView] = useState('libraries');
  const [activeLibrary, setActiveLibrary] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const importRef = useRef(null);
  const [importMsg, setImportMsg] = useState('');

  if (view === 'notes') {
    return (
      <NotesView
        room={activeRoom}
        library={activeLibrary}
        onBack={() => setView('rooms')}
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

  const handleCreate = ({ name, icon, accent }) => {
    const newLib = {
      id: genId(),
      name,
      icon,
      accent,
      createdAt: new Date().toISOString(),
    };
    persistLibraries([...libraries, newLib]);
    setShowCreate(false);
  };

  const handleRename = (id, name) => {
    persistLibraries(libraries.map((l) => l.id === id ? { ...l, name } : l));
    setRenamingLib(null);
  };

  const handleDelete = (id) => {
    const store = getStore();
    persistLibraries(libraries.filter((l) => l.id !== id));
    updateStore({
      rooms: (store.rooms || []).filter((r) => r.libraryId !== id),
      notes: (store.notes || []).filter((n) => n.libraryId !== id),
    });
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

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] px-5 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-h)] leading-tight tracking-tight">
            SR Library
          </h1>
          <p className="text-xs text-[var(--text)] opacity-50">
            {libraries.length} {libraries.length === 1 ? 'library' : 'libraries'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {importMsg && (
            <span className={`text-xs px-2 py-1 rounded-lg ${importMsg === 'Imported!' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {importMsg}
            </span>
          )}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {libraries.map((lib) => (
              <LibraryCard
                key={lib.id}
                lib={lib}
                noteCount={noteCount(lib.id)}
                roomCount={roomCount(lib.id)}
                onDelete={handleDelete}
                onOpen={() => { setActiveLibrary(lib); setView('rooms'); }}
                onRename={setRenamingLib}
              />
            ))}
          </div>
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

      {renamingLib && (
        <RenameModal current={renamingLib.name} onClose={() => setRenamingLib(null)} onRename={(name) => handleRename(renamingLib.id, name)} />
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
