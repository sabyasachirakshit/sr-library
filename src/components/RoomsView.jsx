import { useState } from 'react';
import { getStore, updateStore } from '../store/libraryStore';

const ACCENT_COLORS = [
  '#9333ea', '#2563eb', '#16a34a', '#ea580c', '#db2777',
  '#dc2626', '#0d9488', '#ca8a04', '#0891b2', '#65a30d',
];

const ICONS = [
  '🗂️', '📖', '📒', '📓', '📔', '🗒️', '📋', '🗃️',
  '💬', '🧠', '🔖', '📌', '🧩', '🏷️', '🔍', '💎',
  '🌟', '🔥', '🎯', '⚡', '🛠️', '🧪', '🎨', '🌈',
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function RoomCard({ room, noteCount, onOpen, onDelete, onRename }) {
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
    onDelete(room.id);
  };

  return (
    <div
      onClick={onOpen}
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] cursor-pointer active:scale-[0.97] transition-transform relative select-none"
    >
      <div
        className="h-24 flex items-center justify-center relative rounded-t-2xl overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${room.accent}38, ${room.accent}18)` }}
      >
        <span className="text-4xl z-10">{room.icon}</span>

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
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(room); }}
                  className="w-full px-4 py-3 text-sm text-[var(--text-h)] text-left hover:bg-[var(--code-bg)] transition-colors border-b border-[var(--border)]">
                  ✏️ Rename
                </button>
                <button onClick={handleDeleteClick}
                  className="w-full px-4 py-3 text-sm text-red-500 text-left hover:bg-red-500/10 transition-colors">
                  🗑 Delete room
                </button>
              </>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                <p className="text-xs text-[var(--text)] text-center leading-snug">
                  Delete <strong className="text-[var(--text-h)]">{room.name}</strong>?
                </p>
                <button
                  onClick={handleDeleteClick}
                  className="w-full py-2 rounded-xl bg-red-500 text-white text-xs font-semibold"
                >
                  Yes, delete
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setConfirmDelete(false); }}
                  className="w-full py-2 rounded-xl bg-[var(--code-bg)] text-[var(--text)] text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

      <div className="px-3.5 py-3">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: room.accent }} />
          <h3 className="font-semibold text-[var(--text-h)] truncate text-sm">{room.name}</h3>
        </div>
        <p className="text-xs text-[var(--text)] opacity-50 pl-4">
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </p>
      </div>
    </div>
  );
}

function CreateRoomModal({ library, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[0]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), icon, accent: color });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm modal-fade-in" />
      <div
        className="relative w-full sm:max-w-md bg-[var(--bg)] rounded-t-3xl sm:rounded-3xl z-10 modal-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-[var(--border)] rounded-full" />
        </div>

        <div className="px-6 pt-4 pb-8">
          <p className="text-xs text-[var(--text)] opacity-50 mb-1">{library.icon} {library.name}</p>
          <h2 className="text-xl font-bold text-[var(--text-h)] mb-5">New Room</h2>

          {/* Preview */}
          <div
            className="w-full h-16 rounded-2xl mb-5 flex items-center justify-center text-3xl"
            style={{ background: `linear-gradient(135deg, ${color}40, ${color}20)` }}
          >
            {icon}
          </div>

          {/* Name */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Maths, Chapter 1, Ideas…"
              maxLength={32}
              className="w-full px-4 py-3 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] text-[var(--text-h)] placeholder:text-[var(--text)] placeholder:opacity-40 outline-none focus:border-[var(--accent)] transition-colors text-sm"
            />
          </div>

          {/* Icon */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">Icon</label>
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
            <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-widest mb-2 block">Color</label>
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

          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full py-3.5 rounded-2xl bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all"
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
}

function RenameModal({ current, label, onClose, onRename }) {
  const [name, setName] = useState(current);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm modal-fade-in" />
      <div className="relative w-full sm:max-w-sm bg-[var(--bg)] rounded-t-3xl sm:rounded-3xl z-10 modal-slide-up px-6 pt-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-5 sm:hidden"><div className="w-10 h-1 bg-[var(--border)] rounded-full" /></div>
        <h2 className="text-lg font-bold text-[var(--text-h)] mb-4">Rename {label}</h2>
        <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && onRename(name.trim())}
          maxLength={32} className="w-full px-4 py-3 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] text-[var(--text-h)] outline-none focus:border-[var(--accent)] transition-colors text-sm mb-4" />
        <button onClick={() => name.trim() && onRename(name.trim())} disabled={!name.trim()} className="w-full py-3 rounded-2xl bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-30">Save</button>
      </div>
    </div>
  );
}

export default function RoomsView({ library, onBack, onOpenRoom }) {
  const [rooms, setRooms] = useState(() =>
    (getStore().rooms || []).filter((r) => r.libraryId === library.id)
  );
  const [showCreate, setShowCreate] = useState(false);
  const [renamingRoom, setRenamingRoom] = useState(null);

  const persistRooms = (updated) => {
    setRooms(updated);
    const all = getStore().rooms || [];
    const others = all.filter((r) => r.libraryId !== library.id);
    updateStore({ rooms: [...others, ...updated] });
  };

  const handleCreate = ({ name, icon, accent }) => {
    persistRooms([...rooms, { id: genId(), libraryId: library.id, name, icon, accent, createdAt: new Date().toISOString() }]);
    setShowCreate(false);
  };

  const handleDelete = (id) => {
    persistRooms(rooms.filter((r) => r.id !== id));
    const notes = getStore().notes || [];
    updateStore({ notes: notes.filter((n) => n.roomId !== id) });
  };

  const handleRename = (id, name) => {
    persistRooms(rooms.map((r) => r.id === id ? { ...r, name } : r));
    setRenamingRoom(null);
  };

  const noteCount = (roomId) =>
    (getStore().notes || []).filter((n) => n.roomId === roomId).length;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header — title only, back is in FAB stack */}
      <header className="sticky top-0 z-10 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 py-3">
        <h1 className="text-base font-bold text-[var(--text-h)] leading-tight flex items-center gap-1.5 truncate">
          <span>{library.icon}</span> {library.name}
        </h1>
        <p className="text-xs text-[var(--text)] opacity-50">
          {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
        </p>
      </header>

      {/* Breadcrumb strip */}
      <div className="px-4 pt-3 pb-0 flex items-center gap-1.5 text-xs text-[var(--text)] opacity-50">
        <span>Libraries</span>
        <span>›</span>
        <span className="text-[var(--text-h)] opacity-80 font-medium">{library.name}</span>
      </div>

      <main className="flex-1 px-4 py-4 pb-24">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[55vh] gap-4 text-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl" style={{ background: `${library.accent}20` }}>
              {library.icon}
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-h)]">No rooms yet</p>
              <p className="text-sm text-[var(--text)] opacity-50 mt-1 max-w-[220px]">
                Create rooms to organise notes inside {library.name}
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-2xl text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: library.accent }}
            >
              + Create room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                noteCount={noteCount(room.id)}
                onOpen={() => onOpenRoom(room)}
                onDelete={handleDelete}
                onRename={setRenamingRoom}
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB stack: ← above + */}
      <div className="fixed bottom-6 right-5 flex flex-col items-center gap-3 z-20">
      <button onClick={onBack}
          className="w-12 h-12 rounded-full bg-[var(--code-bg)] border border-[var(--border)] shadow-md text-[var(--text-h)] text-base flex items-center justify-center active:scale-90 transition-transform hover:opacity-70">
          ←
        </button>
        <button onClick={() => setShowCreate(true)}
          className="w-14 h-14 rounded-full text-white shadow-xl text-2xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: library.accent }}>+</button>
        
      </div>

      {showCreate && (
        <CreateRoomModal library={library} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
      {renamingRoom && (
        <RenameModal current={renamingRoom.name} label="room" onClose={() => setRenamingRoom(null)} onRename={(name) => handleRename(renamingRoom.id, name)} />
      )}
    </div>
  );
}
