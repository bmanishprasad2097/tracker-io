import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Archive, MoreHorizontal, Trash2, ArchiveRestore, ChevronRight } from 'lucide-react';
import { getRoadmaps, createRoadmap, updateRoadmap, deleteRoadmap } from '../api/roadmaps';
import type { RoadmapCreate, RoadmapListItem } from '../types';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';

const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#f97316', '#22c55e', '#06b6d4',
];

/* ─── Card Menu ─────────────────────────────────────────────────── */
function CardMenu({ roadmap, onArchive, onDelete }: {
  roadmap: RoadmapListItem; onArchive: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg shadow-xl py-1"
          style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)' }}>
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors text-left"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
            onClick={() => { onArchive(); setOpen(false); }}
          >
            {roadmap.is_archived ? <><ArchiveRestore size={13} /> Unarchive</> : <><Archive size={13} /> Archive</>}
          </button>
          <div className="my-1" style={{ borderTop: '1px solid var(--border-muted)' }} />
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors text-left"
            style={{ color: 'var(--danger)' }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--danger-subtle)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            onClick={() => { onDelete(); setOpen(false); }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Roadmap Card ──────────────────────────────────────────────── */
function RoadmapCard({ roadmap, onArchive, onDelete }: {
  roadmap: RoadmapListItem; onArchive: () => void; onDelete: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div
      className="group relative rounded-xl p-5 cursor-pointer transition-colors animate-fade-up"
      style={{ background: 'var(--bg-default)', border: '1px solid var(--border-default)' }}
      onClick={() => navigate(`/roadmaps/${roadmap.id}`)}
      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'}
      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs shrink-0"
          style={{ background: `${roadmap.color}22`, color: roadmap.color }}>
          {roadmap.title.charAt(0).toUpperCase()}
        </div>
        <div className="flex items-center gap-1">
          {roadmap.is_archived && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)', border: '1px solid #d2992230' }}>
              Archived
            </span>
          )}
          <CardMenu roadmap={roadmap} onArchive={onArchive} onDelete={onDelete} />
        </div>
      </div>

      <h3 className="font-semibold text-sm leading-snug mb-1" style={{ color: 'var(--text-primary)' }}>{roadmap.title}</h3>
      {roadmap.description && (
        <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{roadmap.description}</p>
      )}

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {roadmap.completed_tasks}/{roadmap.total_tasks} tasks
          </span>
          <span className="text-xs font-semibold tabular-nums" style={{ color: roadmap.color }}>
            {roadmap.progress_percent.toFixed(0)}%
          </span>
        </div>
        <ProgressBar value={roadmap.progress_percent} color={roadmap.color} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {roadmap.in_progress_tasks > 0 && (
            <span className="flex items-center gap-1" style={{ color: 'var(--info)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--info)' }} />
              {roadmap.in_progress_tasks} active
            </span>
          )}
          {roadmap.completed_tasks > 0 && (
            <span className="flex items-center gap-1" style={{ color: 'var(--success)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
              {roadmap.completed_tasks} done
            </span>
          )}
        </div>
        <ChevronRight size={13} style={{ color: 'var(--text-disabled)' }} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}

/* ─── Create Modal ──────────────────────────────────────────────── */
function CreateModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void; onSubmit: (d: RoadmapCreate) => void; loading: boolean;
}) {
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor]           = useState(COLORS[0]);
  const handleClose = () => { setTitle(''); setDescription(''); setColor(COLORS[0]); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="New Roadmap">
      <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) onSubmit({ title: title.trim(), description: description.trim() || undefined, color }); }}
        className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Title</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Full Stack Development"
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description…" rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors resize-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-6 h-6 rounded-md transition-all"
                style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px', opacity: color === c ? 1 : 0.4, transform: color === c ? 'scale(1.1)' : 'scale(1)' }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={handleClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >Cancel</button>
          <button type="submit" disabled={!title.trim() || loading}
            className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >{loading ? 'Creating…' : 'Create Roadmap'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function Roadmaps() {
  const [showCreate,   setShowCreate]   = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const qc = useQueryClient();

  const { data: roadmaps = [], isLoading } = useQuery({ queryKey: ['roadmaps'], queryFn: getRoadmaps });

  const createMutation = useMutation({
    mutationFn: createRoadmap,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roadmaps'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowCreate(false); },
  });
  const archiveMutation = useMutation({
    mutationFn: ({ id, is_archived }: { id: string; is_archived: boolean }) => updateRoadmap(id, { is_archived }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmaps'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteRoadmap,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roadmaps'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const active   = roadmaps.filter((r) => !r.is_archived);
  const archived = roadmaps.filter((r) =>  r.is_archived);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Roadmaps</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isLoading ? '…' : `${active.length} active${archived.length ? `, ${archived.length} archived` : ''}`}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> New Roadmap
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 h-48 animate-pulse" style={{ background: 'var(--bg-default)', border: '1px solid var(--border-default)' }} />
          ))}
        </div>
      )}

      {!isLoading && active.length === 0 && archived.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
            <Plus size={20} style={{ color: 'var(--accent-hover)' }} />
          </div>
          <h2 className="font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>No roadmaps yet</h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-secondary)' }}>Create your first learning roadmap to start tracking your progress.</p>
          <button onClick={() => setShowCreate(true)}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}>
            Create Roadmap
          </button>
        </div>
      )}

      {!isLoading && (active.length > 0 || archived.length > 0) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((r) => (
              <RoadmapCard key={r.id} roadmap={r}
                onArchive={() => archiveMutation.mutate({ id: r.id, is_archived: true })}
                onDelete={() => { if (confirm(`Delete "${r.title}"?`)) deleteMutation.mutate(r.id); }}
              />
            ))}
          </div>
          {archived.length > 0 && (
            <div className="mt-10">
              <button onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-2 text-sm mb-4 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <Archive size={13} />
                {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
              </button>
              {showArchived && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                  {archived.map((r) => (
                    <RoadmapCard key={r.id} roadmap={r}
                      onArchive={() => archiveMutation.mutate({ id: r.id, is_archived: false })}
                      onDelete={() => { if (confirm(`Delete "${r.title}"?`)) deleteMutation.mutate(r.id); }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <CreateModal open={showCreate} onClose={() => setShowCreate(false)}
        onSubmit={(d) => createMutation.mutate(d)} loading={createMutation.isPending} />
    </div>
  );
}
