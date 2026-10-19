'use client';

import { useEffect, useState } from 'react';
import ConfirmModal from './ConfirmModal';

export interface FolderItem {
  id: string;
  name: string;
  color: string | null;
  notebook_count: number;
}

export type FolderFilter =
  | { kind: 'all' }
  | { kind: 'unfiled' }
  | { kind: 'folder'; id: string };

interface Props {
  filter: FolderFilter;
  onChange: (f: FolderFilter) => void;
  refreshKey?: number;
}

export default function FoldersSidebar({ filter, onChange, refreshKey }: Props) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FolderItem | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/folders');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.folders)) setFolders(data.folders);
    } catch (err) {
      console.error('[folders] load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    setError('');
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rename failed');
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/folders/${target.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      if (filter.kind === 'folder' && filter.id === target.id) {
        onChange({ kind: 'all' });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <>
      <aside className="w-52 shrink-0 hidden md:flex flex-col border-r border-stone-200/80 bg-white/40 backdrop-blur-sm">
        <div className="flex-1 overflow-y-auto px-2.5 py-4">
          <div className="space-y-0.5">
            <FilterRow
              active={filter.kind === 'all'}
              label="All notebooks"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              }
              onClick={() => onChange({ kind: 'all' })}
            />
            <FilterRow
              active={filter.kind === 'unfiled'}
              label="Unfiled"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
                </svg>
              }
              onClick={() => onChange({ kind: 'unfiled' })}
            />
          </div>

          <div className="mt-6 mb-2 px-2 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
              Folders
            </span>
            <span className="flex-1 h-px bg-stone-200/70" />
          </div>

          {error && (
            <p className="text-[11px] text-red-600 px-2 mb-2 leading-snug">{error}</p>
          )}

          {loading ? (
            <p className="text-[11px] text-stone-400 px-2">Loading...</p>
          ) : folders.length === 0 ? (
            <p className="text-[11px] text-stone-400 px-2 leading-snug">
              Create one from the
              <span className="text-stone-600 font-medium"> + New </span>
              card.
            </p>
          ) : (
            <div className="space-y-0.5">
              {folders.map((f) => (
                <div key={f.id} className="group">
                  {editingId === f.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(f.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => handleRename(f.id)}
                      className="w-full px-2 py-1 text-[13px] border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-400"
                      style={{ fontSize: '16px' }}
                    />
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onChange({ kind: 'folder', id: f.id })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onChange({ kind: 'folder', id: f.id });
                        }
                      }}
                      className={`group/row relative flex items-center gap-2 rounded-md pl-2 pr-1 py-1.5 cursor-pointer transition-all ${
                        filter.kind === 'folder' && filter.id === f.id
                          ? 'bg-accent-50 text-accent-900 ring-1 ring-accent-200'
                          : 'text-stone-700 hover:bg-stone-100/80'
                      }`}
                    >
                      <span
                        className={`shrink-0 ${
                          filter.kind === 'folder' && filter.id === f.id
                            ? 'text-accent-600'
                            : 'text-stone-400'
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
                        </svg>
                      </span>
                      <span className="text-[13px] flex-1 truncate">{f.name}</span>
                      <span className="text-[10px] text-stone-400 tabular-nums group-hover/row:opacity-0 transition-opacity">
                        {f.notebook_count}
                      </span>
                      <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(f.id);
                            setEditName(f.name);
                          }}
                          className="p-1 text-stone-400 hover:text-stone-700 rounded"
                          title="Rename"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(f);
                          }}
                          className="p-1 text-stone-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <ConfirmModal
        open={deleteTarget !== null}
        title={deleteTarget ? `Delete folder "${deleteTarget.name}"?` : 'Delete folder?'}
        description="Notebooks inside this folder will move to Unfiled. Notebooks themselves are not deleted."
        confirmLabel="Delete folder"
        variant="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

function FilterRow({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-all ${
        active
          ? 'bg-accent-50 text-accent-900 ring-1 ring-accent-200 font-medium'
          : 'text-stone-700 hover:bg-stone-100/80'
      }`}
    >
      <span
        className={`shrink-0 ${active ? 'text-accent-600' : 'text-stone-400'}`}
      >
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}