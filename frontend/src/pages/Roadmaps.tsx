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
  '#f43f5e', '#f97316', '#10b981', '#06b6d4',
];

/* ─── Card menu ─────────────────────────────────────────────────── */
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
        className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        style={{ color: '#7880a8' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#c0c8e8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#7880a8')}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl shadow-2xl py-1 overflow-hidden"
          style={{ background: '#10102a', border: '1px solid #2020400' }}
        >
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors"
            style={{ color: '#a0a8c8' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ffffff08')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            onClick={() => { onArchive(); setOpen(false); }}
          >
            {roadmap.is_archived
              ? <><ArchiveRestore size={13} /> Unarchive</>
              : <><Archive size={13} /> Archive</>}
          </button>
          <div className="my-1" style={{ borderTop: '1px solid #1a1a30' }} />
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ff000012')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
  const remaining = roadmap.total_tasks - roadmap.completed_tasks - roadmap.in_progress_tasks;

  return (
    <div
      className="group relative rounded-2xl p-5 cursor-pointer animate-fade-up"
      style={{
        background: 'linear-gradient(145deg, #0e0e22 0%, #0b0b1a 100%)',
        border: '1px solid #1a1a32',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onClick={() => navigate(`/roadmaps/${roadmap.id}`)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${roadmap.color}40`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${roadmap.color}0c`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#1a1a32';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Subtle colored top-edge glow */}
      <div
        className="absolute top-0 left-6 right-6 h-px rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${roadmap.color}50, transparent)` }}
      />

      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
          style={{
            background: `linear-gradient(135deg, ${roadmap.color}25, ${roadmap.color}12)`,
            color: roadmap.color,
            boxShadow: `0 0 12px ${roadmap.color}20`,
            border: `1px solid ${roadmap.color}25`,
          }}
        >
          {roadmap.title.charAt(0).toUpperCase()}
        </div>
        <div className="flex items-center gap-1.5">
          {roadmap.is_archived && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: '#f59e0b12', color: '#fbbf24', border: '1px solid #f59e0b25' }}
            >
              Archived
            </span>
          )}
          <CardMenu roadmap={roadmap} onArchive={onArchive} onDelete={onDelete} />
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-white text-sm leading-snug mb-1">{roadmap.title}</h3>
        {roadmap.description && (
        <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: '#8090b0' }}>
          {roadmap.description}
        </p>
      )}

      {/* Progress */}
      <div className="mt-4 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs tabular-nums" style={{ color: '#7880a8' }}>
            {roadmap.completed_tasks}/{roadmap.total_tasks} tasks
          </span>
          <span className="text-xs font-bold tabular-nums" style={{ color: roadmap.color }}>
            {roadmap.progress_percent.toFixed(0)}%
          </span>
        </div>
        <ProgressBar value={roadmap.progress_percent} color={roadmap.color} glow />
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-3 mt-3">
        {roadmap.completed_tasks > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#34d39990' }}>
            <CheckCircle2 size={10} /> {roadmap.completed_tasks}
          </span>
        )}
        {roadmap.in_progress_tasks > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#60a5fa90' }}>
            <Clock size={10} /> {roadmap.in_progress_tasks}
          </span>
        )}
        {remaining > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#3a3a5a' }}>
            <Circle size={10} /> {remaining}
          </span>
        )}
        <ChevronRight
          size={13}
          className="ml-auto transition-transform group-hover:translate-x-0.5"
          style={{ color: '#3a3a5a' }}
        />
      </div>
    </div>
  );
}

/* ─── Create Modal ──────────────────────────────────────────────── */
function CreateModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void; onSubmit: (d: RoadmapCreate) => void; loading: boolean;
}) {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [color,       setColor]       = useState(COLORS[0]);

  const handleClose = () => { setTitle(''); setDescription(''); setColor(COLORS[0]); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="New Roadmap">
      <form
        onSubmit={(e) => { e.preventDefault(); if (title.trim()) onSubmit({ title: title.trim(), description: description.trim() || undefined, color }); }}
        className="space-y-4"
      >
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: '#8090b0' }}>Title</label>
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Full Stack Development"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-colors"
            style={{ background: '#0c0c1e', border: '1px solid #1e1e38' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f160')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#1e1e38')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: '#8090b0' }}>Description</label>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description…" rows={3}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-colors resize-none"
            style={{ background: '#0c0c1e', border: '1px solid #1e1e38' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f160')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#1e1e38')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#8090b0' }}>Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-6 h-6 rounded-lg transition-all"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                  opacity: color === c ? 1 : 0.35,
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: color === c ? `0 0 8px ${c}80` : 'none',
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2.5 pt-1">
          <button type="button" onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: '#ffffff08', color: '#8888a8' }}
          >Cancel</button>
          <button type="submit" disabled={!title.trim() || loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 20px #6366f140' }}
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Roadmaps</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8090b0' }}>
            {isLoading ? '…' : `${active.length} active${archived.length ? `, ${archived.length} archived` : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            boxShadow: '0 4px 20px #6366f135',
          }}
        >
          <Plus size={15} /> New Roadmap
        </button>
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 h-44 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && active.length === 0 && archived.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#6366f115', boxShadow: '0 0 24px #6366f120', border: '1px solid #6366f125' }}
          >
            <Plus size={22} style={{ color: '#818cf8' }} />
          </div>
          <h2 className="text-white font-semibold mb-1.5">No roadmaps yet</h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color: '#8090b0' }}>
            Create your first learning roadmap to start tracking your progress.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 20px #6366f135' }}
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
                key={r.id} roadmap={r}
                onArchive={() => archiveMutation.mutate({ id: r.id, is_archived: true })}
                onDelete={() => { if (confirm(`Delete "${r.title}"?`)) deleteMutation.mutate(r.id); }}
              />
            ))}
          </div>

          {archived.length > 0 && (
            <div className="mt-10">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-2 text-sm mb-4 transition-colors"
                style={{ color: '#7880a8' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#b0b8d8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#7880a8')}
              >
                <Archive size={13} />
                {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
              </button>
              {showArchived && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                  {archived.map((r) => (
                    <RoadmapCard
                      key={r.id} roadmap={r}
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
        open={showCreate} onClose={() => setShowCreate(false)}
        onSubmit={(d) => createMutation.mutate(d)} loading={createMutation.isPending}
      />
    </div>
  );
}
