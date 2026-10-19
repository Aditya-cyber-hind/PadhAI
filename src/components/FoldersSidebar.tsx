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
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
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

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setError('');
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setNewName('');
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  };

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
      <aside className="w-56 shrink-0 border-r border-stone-200 bg-stone-50/50 p-3 overflow-y-auto">
        <div className="space-y-1">
          <FilterRow
            active={filter.kind === 'all'}
            label="All notebooks"
            icon="📚"
            onClick={() => onChange({ kind: 'all' })}
          />
          <FilterRow
            active={filter.kind === 'unfiled'}
            label="Unfiled"
            icon="📂"
            onClick={() => onChange({ kind: 'unfiled' })}
          />
        </div>

        <div className="mt-4 mb-2 flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Folders
          </h3>
          <button
            onClick={() => {
              setCreating(true);
              setError('');
            }}
            className="text-stone-500 hover:text-accent-600 text-sm font-medium"
            title="New folder"
          >
            +
          </button>
        </div>

        {error && <p className="text-xs text-red-600 px-1 mb-2">{error}</p>}

        {creating && (
          <div className="mb-2 px-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setCreating(false);
                  setNewName('');
                }
              }}
              placeholder="Folder name"
              className="w-full px-2 py-1 text-sm border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-accent-400"
              style={{ fontSize: '16px' }}
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={handleCreate}
                className="text-xs px-2 py-1 bg-accent-500 text-white rounded hover:bg-accent-600"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName('');
                  setError('');
                }}
                className="text-xs px-2 py-1 text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-xs text-stone-400 px-1">Loading...</p>
        ) : folders.length === 0 && !creating ? (
          <p className="text-xs text-stone-400 px-1">No folders yet</p>
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
                    className="w-full px-2 py-1 text-sm border border-stone-300 rounded"
                    style={{ fontSize: '16px' }}
                  />
                ) : (
                  <div
                    className={`flex items-center gap-1 rounded px-2 py-1 cursor-pointer ${
                      filter.kind === 'folder' && filter.id === f.id
                        ? 'bg-accent-100 text-accent-800'
                        : 'hover:bg-stone-100 text-stone-700'
                    }`}
                    onClick={() => onChange({ kind: 'folder', id: f.id })}
                  >
                    <span className="text-xs">📁</span>
                    <span className="text-sm flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-stone-400">
                      {f.notebook_count}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(f.id);
                        setEditName(f.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-700 text-xs px-1"
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(f);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 text-xs px-1"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${
        active ? 'bg-accent-100 text-accent-800' : 'hover:bg-stone-100 text-stone-700'
      }`}
    >
      <span className="text-xs">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}