import { useState } from 'react';
import { getStore, updateStore } from '../store/libraryStore';

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_COLOR = { library: '#9333ea', room: '#2563eb', note: '#16a34a' };
const TYPE_LABEL = { library: 'Library', room: 'Room', note: 'Note' };

function getName(a) {
  if (a.type === 'library') return a.library.name;
  if (a.type === 'room') return a.room.name;
  return a.note.title || 'Untitled';
}
function getIcon(a) {
  if (a.type === 'library') return a.library.icon || '📚';
  if (a.type === 'room') return a.room.icon || '🗂️';
  return '📝';
}
function getSub(a) {
  if (a.type === 'library') {
    const rc = (a.rooms || []).length;
    const nc = (a.notes || []).length;
    return `${rc} room${rc !== 1 ? 's' : ''} · ${nc} note${nc !== 1 ? 's' : ''}`;
  }
  if (a.type === 'room') {
    const nc = (a.notes || []).length;
    return `${nc} note${nc !== 1 ? 's' : ''}`;
  }
  return (a.note.content || '').replace(/\[image:[a-z0-9]+\]/gi, '').trim().slice(0, 60) || 'Empty note';
}
function getParentContext(a, allArchives) {
  const store = getStore();
  if (a.type === 'room') {
    const lib = (store.libraries || []).find((l) => l.id === a.room.libraryId);
    if (lib) return `${lib.icon} ${lib.name}`;
    const archivedLib = allArchives.find((x) => x.type === 'library' && x.library.id === a.room.libraryId);
    if (archivedLib) return `${archivedLib.library.icon} ${archivedLib.library.name} (archived)`;
    return 'Unknown library';
  }
  if (a.type === 'note') {
    const room = (store.rooms || []).find((r) => r.id === a.note.roomId);
    const lib = (store.libraries || []).find((l) => l.id === a.note.libraryId);
    const archivedRoom = !room ? allArchives.find((x) => x.type === 'room' && x.room.id === a.note.roomId) : null;
    const archivedLib = !lib ? allArchives.find((x) => x.type === 'library' && x.library.id === a.note.libraryId) : null;
    const roomLabel = room
      ? `${room.icon} ${room.name}`
      : archivedRoom ? `${archivedRoom.room.icon} ${archivedRoom.room.name} (archived)` : 'Unknown room';
    const libLabel = lib
      ? `${lib.icon} ${lib.name}`
      : archivedLib ? `${archivedLib.library.icon} ${archivedLib.library.name} (archived)` : 'Unknown library';
    return `${libLabel}  ›  ${roomLabel}`;
  }
  return null;
}

function getMissingParentWarning(a) {
  const store = getStore();
  if (a.type === 'room') {
    const ok = (store.libraries || []).some((l) => l.id === a.room.libraryId);
    if (!ok) return 'Parent library not in store — restore it first for full visibility.';
  }
  if (a.type === 'note') {
    const ok = (store.rooms || []).some((r) => r.id === a.note.roomId);
    if (!ok) return 'Parent room not in store — restore it first for full visibility.';
  }
  return null;
}

export default function ArchivesView({ onBack }) {
  const [archives, setArchives] = useState(() => getStore().archives || []);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [restoreMsg, setRestoreMsg] = useState('');

  const persistArchives = (updated) => {
    setArchives(updated);
    updateStore({ archives: updated });
  };

  const handleRestore = (archive) => {
    const store = getStore();
    if (archive.type === 'library') {
      updateStore({
        libraries: [...(store.libraries || []), archive.library],
        rooms: [...(store.rooms || []), ...(archive.rooms || [])],
        notes: [...(store.notes || []), ...(archive.notes || [])],
      });
    } else if (archive.type === 'room') {
      updateStore({
        rooms: [...(store.rooms || []), archive.room],
        notes: [...(store.notes || []), ...(archive.notes || [])],
      });
    } else if (archive.type === 'note') {
      updateStore({ notes: [...(store.notes || []), archive.note] });
    }
    persistArchives(archives.filter((a) => a.id !== archive.id));
    setRestoreMsg('Restored!');
    setTimeout(() => setRestoreMsg(''), 2000);
  };

  const handleDelete = (id) => {
    persistArchives(archives.filter((a) => a.id !== id));
    setConfirmDelete(null);
  };

  const sorted = [...archives].sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] px-5 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-h)] leading-tight tracking-tight">Archives</h1>
          <p className="text-xs text-[var(--text)] opacity-50">{archives.length} item{archives.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {restoreMsg && (
            <span className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-400">{restoreMsg}</span>
          )}
          <button onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] flex items-center justify-center text-base hover:opacity-70 transition-opacity">
            ←
          </button>
        </div>
      </header>

      {/* Info banner */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-[var(--code-bg)] border border-[var(--border)] px-4 py-3 text-xs text-[var(--text)] opacity-60 leading-relaxed">
          Restore puts items back exactly where they were. For correct visibility, restore in order: <strong>Library → Room → Note</strong>.
        </div>
      </div>

      <main className="flex-1 px-4 py-4">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
            <div className="w-24 h-24 rounded-3xl bg-[var(--code-bg)] flex items-center justify-center text-5xl mb-2">📦</div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-h)]">No archives yet</p>
              <p className="text-sm text-[var(--text)] opacity-50 mt-1 max-w-[220px]">
                Archived libraries, rooms, and notes will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sorted.map((archive) => {
              const warning = getMissingParentWarning(archive);
              const parentCtx = getParentContext(archive, archives);
              return (
                <div key={archive.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden">
                  <div className="flex items-stretch">
                    {/* Color accent bar */}
                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: TYPE_COLOR[archive.type] }} />

                    {/* Content */}
                    <div className="flex-1 min-w-0 px-4 py-3">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-lg leading-none">{getIcon(archive)}</span>
                        <span className="font-semibold text-sm text-[var(--text-h)] truncate">{getName(archive)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold flex-shrink-0"
                          style={{ backgroundColor: `${TYPE_COLOR[archive.type]}20`, color: TYPE_COLOR[archive.type] }}>
                          {TYPE_LABEL[archive.type]}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text)] opacity-50 truncate">{getSub(archive)}</p>
                      {parentCtx && (
                        <p className="text-[11px] text-[var(--text)] opacity-40 truncate mt-0.5">{parentCtx}</p>
                      )}
                      <p className="text-xs text-[var(--text)] opacity-30 mt-0.5">Archived {timeAgo(archive.archivedAt)}</p>
                      {warning && (
                        <p className="text-[10px] text-amber-500 mt-1 leading-snug">⚠ {warning}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col border-l border-[var(--border)] flex-shrink-0">
                      <button onClick={() => handleRestore(archive)}
                        className="flex-1 px-3.5 flex items-center justify-center text-sm font-bold text-green-500 hover:bg-green-500/10 transition-colors border-b border-[var(--border)]"
                        title="Restore">
                        ↺
                      </button>
                      {confirmDelete === archive.id ? (
                        <div className="flex flex-col flex-1">
                          <button onClick={() => handleDelete(archive.id)}
                            className="flex-1 px-3 flex items-center justify-center text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors border-b border-[var(--border)]">
                            ✓
                          </button>
                          <button onClick={() => setConfirmDelete(null)}
                            className="flex-1 px-3 flex items-center justify-center text-xs text-[var(--text)] hover:bg-[var(--code-bg)] transition-colors">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(archive.id)}
                          className="flex-1 px-3.5 flex items-center justify-center text-base text-[var(--text)] hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Delete permanently">
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
