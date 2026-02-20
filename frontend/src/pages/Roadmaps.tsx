import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Archive, MoreHorizontal, Trash2, ArchiveRestore, ChevronRight,
  CheckCircle2, Clock, Circle,
} from 'lucide-react';
import { getRoadmaps, createRoadmap, updateRoadmap, deleteRoadmap } from '../api/roadmaps';
import type { RoadmapCreate, RoadmapListItem } from '../types';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';

const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#f59e0b', '#10b981', '#06b6d4',
];

/* ─── Context Menu (rendered in a portal-like div at page level) ── */
function CardMenu({
  roadmap,
  onArchive,
  onDelete,
}: {
  roadmap: RoadmapListItem;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-[#1e1e2e] border border-[#2a2a3e] rounded-xl shadow-2xl py-1 overflow-hidden">
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.06] transition-colors"
            onClick={() => { onArchive(); setOpen(false); }}
          >
            {roadmap.is_archived
              ? <><ArchiveRestore size={13} className="text-slate-500" /> Unarchive</>
              : <><Archive size={13} className="text-slate-500" /> Archive</>
            }
          </button>
          <div className="my-1 border-t border-[#2a2a3e]" />
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
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
function RoadmapCard({
  roadmap,
  onArchive,
  onDelete,
}: {
  roadmap: RoadmapListItem;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="group relative bg-[#13131a] border border-[#1e1e2a] rounded-2xl p-5 cursor-pointer hover:border-[#2a2a3e] hover:bg-[#15151e] transition-all animate-fade-in"
      onClick={() => navigate(`/roadmaps/${roadmap.id}`)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
          style={{ backgroundColor: `${roadmap.color}18`, color: roadmap.color }}
        >
          {roadmap.title.charAt(0).toUpperCase()}
        </div>
        <div className="flex items-center gap-1.5">
          {roadmap.is_archived && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500/80 border border-yellow-500/20">
              Archived
            </span>
          )}
          <CardMenu roadmap={roadmap} onArchive={onArchive} onDelete={onDelete} />
        </div>
      </div>

      {/* Title + description */}
      <h3 className="font-semibold text-white text-sm leading-snug mb-1 pr-2">{roadmap.title}</h3>
      {roadmap.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{roadmap.description}</p>
      )}

      {/* Progress */}
      <div className="mt-4 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-600 tabular-nums">
            {roadmap.completed_tasks}/{roadmap.total_tasks} tasks
          </span>
          <span className="text-xs font-semibold tabular-nums" style={{ color: roadmap.color }}>
            {roadmap.progress_percent.toFixed(0)}%
          </span>
        </div>
        <ProgressBar value={roadmap.progress_percent} color={roadmap.color} />
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-3 mt-3">
        {roadmap.completed_tasks > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-500/70">
            <CheckCircle2 size={11} /> {roadmap.completed_tasks} done
          </span>
        )}
        {roadmap.in_progress_tasks > 0 && (
          <span className="flex items-center gap-1 text-xs text-blue-400/70">
            <Clock size={11} /> {roadmap.in_progress_tasks} active
          </span>
        )}
        {roadmap.total_tasks - roadmap.completed_tasks - roadmap.in_progress_tasks > 0 && (
          <span className="flex items-center gap-1 text-xs text-slate-600">
            <Circle size={11} /> {roadmap.total_tasks - roadmap.completed_tasks - roadmap.in_progress_tasks} left
          </span>
        )}
        <ChevronRight
          size={13}
          className="ml-auto text-slate-700 group-hover:text-slate-400 transition-colors"
        />
      </div>
    </div>
  );
}

/* ─── Create Modal ──────────────────────────────────────────────── */
function CreateModal({
  open, onClose, onSubmit, loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (d: RoadmapCreate) => void;
  loading: boolean;
}) {
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor]           = useState(COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() || undefined, color });
  };

  const handleClose = () => { setTitle(''); setDescription(''); setColor(COLORS[0]); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="New Roadmap">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Full Stack Development"
            className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={3}
            className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-lg transition-all"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                  opacity: color === c ? 1 : 0.4,
                  transform: color === c ? 'scale(1.1)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function Roadmaps() {
  const [showCreate, setShowCreate]   = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const qc = useQueryClient();

  const { data: roadmaps = [], isLoading } = useQuery({
    queryKey: ['roadmaps'],
    queryFn: getRoadmaps,
  });

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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Roadmaps</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {isLoading ? '…' : `${active.length} active${archived.length ? `, ${archived.length} archived` : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus size={15} />
          New Roadmap
        </button>
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#13131a] border border-[#1e1e2a] rounded-2xl p-5 h-44 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && active.length === 0 && archived.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center mb-4">
            <Plus size={22} className="text-indigo-400" />
          </div>
          <h2 className="text-white font-semibold mb-1.5">No roadmaps yet</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-xs">
            Create your first learning roadmap to start tracking your progress.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Create Roadmap
          </button>
        </div>
      )}

      {/* Active roadmaps */}
      {!isLoading && (active.length > 0 || archived.length > 0) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((r) => (
              <RoadmapCard
                key={r.id}
                roadmap={r}
                onArchive={() => archiveMutation.mutate({ id: r.id, is_archived: true })}
                onDelete={() => { if (confirm(`Delete "${r.title}"? This cannot be undone.`)) deleteMutation.mutate(r.id); }}
              />
            ))}
          </div>

          {/* Archived section */}
          {archived.length > 0 && (
            <div className="mt-10">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-300 mb-4 transition-colors"
              >
                <Archive size={13} />
                {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
              </button>
              {showArchived && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                  {archived.map((r) => (
                    <RoadmapCard
                      key={r.id}
                      roadmap={r}
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

      <CreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(d) => createMutation.mutate(d)}
        loading={createMutation.isPending}
      />
    </div>
  );
}
