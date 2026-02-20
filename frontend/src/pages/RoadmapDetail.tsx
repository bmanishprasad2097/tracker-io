import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Circle, Clock, CheckCircle2, Trash2,
  ChevronDown, ChevronRight, X, FileText,
} from 'lucide-react';
import { getRoadmap } from '../api/roadmaps';
import { createTopic, deleteTopic } from '../api/topics';
import { createTask, updateTask, deleteTask } from '../api/tasks';
import type { RoadmapDetail, Task, TaskStatus, Topic } from '../types';
import ProgressBar from '../components/ProgressBar';

/* ─── Cache helpers ──────────────────────────────────────────────── */
function recalcTopic(t: Topic): Topic {
  const done = t.tasks.filter((x) => x.status === 'completed').length;
  return { ...t, total_tasks: t.tasks.length, completed_tasks: done, progress_percent: t.tasks.length > 0 ? (done / t.tasks.length) * 100 : 0 };
}
function recalcRoadmap(r: RoadmapDetail): RoadmapDetail {
  const all = r.topics.flatMap((t) => t.tasks);
  const done = all.filter((x) => x.status === 'completed').length;
  const inProg = all.filter((x) => x.status === 'in_progress').length;
  return { ...r, total_tasks: all.length, completed_tasks: done, in_progress_tasks: inProg, progress_percent: all.length > 0 ? (done / all.length) * 100 : 0 };
}
function patchTask(old: RoadmapDetail | undefined, id: string, patch: Partial<Task>): RoadmapDetail | undefined {
  if (!old) return old;
  return recalcRoadmap({ ...old, topics: old.topics.map((t) => recalcTopic({ ...t, tasks: t.tasks.map((x) => x.id === id ? { ...x, ...patch } : x) })) });
}
function removeTask(old: RoadmapDetail | undefined, id: string): RoadmapDetail | undefined {
  if (!old) return old;
  return recalcRoadmap({ ...old, topics: old.topics.map((t) => recalcTopic({ ...t, tasks: t.tasks.filter((x) => x.id !== id) })) });
}
function addTask(old: RoadmapDetail | undefined, topicId: string, task: Task): RoadmapDetail | undefined {
  if (!old) return old;
  return recalcRoadmap({ ...old, topics: old.topics.map((t) => t.id !== topicId ? t : recalcTopic({ ...t, tasks: [...t.tasks, task] })) });
}
function removeTopic(old: RoadmapDetail | undefined, id: string): RoadmapDetail | undefined {
  if (!old) return old;
  return recalcRoadmap({ ...old, topics: old.topics.filter((t) => t.id !== id) });
}
function addTopic(old: RoadmapDetail | undefined, topic: Topic): RoadmapDetail | undefined {
  if (!old) return old;
  return recalcRoadmap({ ...old, topics: [...old.topics, topic] });
}

/* ─── Status config ──────────────────────────────────────────────── */
const STATUS: Record<TaskStatus, { label: string; icon: React.ElementType; color: string }> = {
  not_started: { label: 'Not started', icon: Circle,       color: '#6e7681' },
  in_progress: { label: 'In progress', icon: Clock,        color: '#58a6ff' },
  completed:   { label: 'Completed',   icon: CheckCircle2, color: '#3fb950' },
};
const STATUS_ORDER: TaskStatus[] = ['not_started', 'in_progress', 'completed'];

/* ─── Inline Task Card ───────────────────────────────────────────── */
// Three states: collapsed row → view card → edit card
function TaskCard({
  task,
  isOpen,
  onOpen,
  onClose,
  onStatusCycle,
  onSave,
  onDelete,
}: {
  task: Task;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onStatusCycle: (s: TaskStatus) => void;
  onSave: (patch: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title,   setTitle]   = useState(task.title);
  const [notes,   setNotes]   = useState(task.notes ?? '');
  const [status,  setStatus]  = useState<TaskStatus>(task.status);
  const titleRef = useRef<HTMLInputElement>(null);

  // When the card opens (view mode), reset editing state.
  // When closed, always exit edit mode too.
  useEffect(() => {
    if (!isOpen) { setEditing(false); }
  }, [isOpen]);

  const enterEdit = () => {
    setTitle(task.title);
    setNotes(task.notes ?? '');
    setStatus(task.status);
    setEditing(true);
    setTimeout(() => titleRef.current?.focus(), 0);
  };

  const handleSave = () => {
    onSave({ title: title.trim() || task.title, notes: notes.trim() || undefined, status });
    setEditing(false);
    onClose();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setEditing(false); }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { handleSave(); }
  };

  const cfg        = STATUS[task.status];
  const Icon       = cfg.icon;
  const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length];

  // ── Collapsed row ────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <div
        className="group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
        onClick={onOpen}
        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'}
        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <button
          className="shrink-0 p-0.5 rounded transition-transform hover:scale-110 active:scale-95"
          title={`Mark as ${STATUS[nextStatus].label}`}
          onClick={(e) => { e.stopPropagation(); onStatusCycle(nextStatus); }}
        >
          <Icon size={16} style={{ color: cfg.color }} />
        </button>

        <span
          className="flex-1 text-sm leading-relaxed select-none"
          style={{
            color: task.status === 'completed' ? 'var(--text-disabled)' : 'var(--text-primary)',
            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {task.notes && <FileText size={12} style={{ color: 'var(--text-disabled)' }} />}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>view</span>
        </div>
      </div>
    );
  }

  // ── Expanded — Edit mode ─────────────────────────────────────────
  if (editing) {
    return (
      <div
        className="rounded-xl my-1 animate-fade-up"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--accent-border)' }}
        onKeyDown={handleEditKeyDown}
      >
        {/* Status picker */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Status</span>
          <div className="flex gap-2">
            {STATUS_ORDER.map((s) => {
              const c = STATUS[s]; const SIcon = c.icon; const active = status === s;
              return (
                <button key={s} onClick={() => setStatus(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={active
                    ? { background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}40` }
                    : { color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent' }
                  }
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <SIcon size={13} />{c.label}
                </button>
              );
            })}
          </div>
          <button onClick={() => setEditing(false)} className="ml-auto p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          ><X size={14} /></button>
        </div>

        {/* Title */}
        <div className="px-4 pb-3">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-base font-semibold focus:outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Task title…"
          />
        </div>

        {/* Notes */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Notes</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes, links, or anything useful… (Ctrl+Enter to save)"
            className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none resize-none leading-relaxed transition-colors"
            style={{
              background: 'var(--bg-default)',
              border: '1px solid var(--border-muted)',
              color: 'var(--text-secondary)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-muted)')}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)' }}>
          <button onClick={() => { if (confirm('Delete this task?')) onDelete(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.background = 'var(--danger-subtle)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          ><Trash2 size={14} /> Delete</button>

          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >Cancel</button>
            <button onClick={handleSave}
              className="px-4 py-1.5 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >Save <kbd className="ml-1 opacity-60 font-mono text-xs">⌘↵</kbd></button>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded — View mode ─────────────────────────────────────────
  return (
    <div
      className="rounded-xl my-1 animate-fade-up"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
    >
      {/* Header: clickable title area collapses, status cycles, edit button */}
      <div
        className="group flex items-center gap-3 px-4 pt-4 pb-3 cursor-pointer"
        onClick={onClose}
        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'}
        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        style={{ borderRadius: '0.75rem 0.75rem 0 0' }}
      >
        {/* Status badge — clicking cycles status without collapsing */}
        <button
          title={`Mark as ${STATUS[nextStatus].label}`}
          onClick={(e) => { e.stopPropagation(); onStatusCycle(nextStatus); }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-all shrink-0 hover:opacity-80 active:scale-95"
          style={{ background: `${cfg.color}18`, color: cfg.color }}
        >
          <Icon size={13} />{cfg.label}
        </button>

        {/* Title — click area is the collapse trigger */}
        <p
          className="flex-1 text-base font-semibold leading-snug select-none"
          style={{
            color: task.status === 'completed' ? 'var(--text-secondary)' : 'var(--text-primary)',
            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={enterEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            Edit
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          ><X size={14} /></button>
        </div>
      </div>

      {/* Notes */}
      {task.notes ? (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Notes</span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
            {task.notes}
          </p>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <button
            onClick={enterEdit}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--text-disabled)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-disabled)')}
          >
            <FileText size={13} /> Add notes…
          </button>
        </div>
      )}

      {/* Footer: metadata */}
      {task.completed_at && (
        <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--border-muted)' }}>
          <span className="text-sm" style={{ color: 'var(--text-disabled)' }}>
            Completed {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Topic Section ─────────────────────────────────────────────── */
function TopicSection({
  topic, color, roadmapId,
  onSaveTask, onDeleteTask,
}: {
  topic: Topic; color: string; roadmapId: string;
  onSaveTask: (taskId: string, patch: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const qc = useQueryClient();
  const [collapsed,     setCollapsed]     = useState(false);
  const [addingTask,    setAddingTask]    = useState(false);
  const [newTaskTitle,  setNewTaskTitle]  = useState('');
  const [openTaskId,    setOpenTaskId]    = useState<string | null>(null);

  const snap    = useCallback(() => qc.getQueryData<RoadmapDetail>(['roadmap', roadmapId]), [qc, roadmapId]);
  const restore = useCallback((p: RoadmapDetail | undefined) => qc.setQueryData(['roadmap', roadmapId], p), [qc, roadmapId]);
  const settle  = useCallback(() => qc.invalidateQueries({ queryKey: ['roadmap', roadmapId] }), [qc, roadmapId]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTask(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['roadmap', roadmapId] });
      const prev = snap();
      qc.setQueryData<RoadmapDetail>(['roadmap', roadmapId], (old) => patchTask(old, id, { status }));
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSettled: () => { settle(); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const createTaskMutation = useMutation({
    mutationFn: (title: string) => createTask(topic.id, { title }),
    onMutate: async (title) => {
      await qc.cancelQueries({ queryKey: ['roadmap', roadmapId] });
      const prev = snap();
      const temp: Task = { id: `temp-${Date.now()}`, topic_id: topic.id, title, notes: null, status: 'not_started', sort_order: 999, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      qc.setQueryData<RoadmapDetail>(['roadmap', roadmapId], (old) => addTask(old, topic.id, temp));
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSuccess: () => { setNewTaskTitle(''); setAddingTask(false); },
    onSettled: () => { settle(); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: () => deleteTopic(topic.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['roadmap', roadmapId] });
      const prev = snap();
      qc.setQueryData<RoadmapDetail>(['roadmap', roadmapId], (old) => removeTopic(old, topic.id));
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSettled: () => { settle(); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) createTaskMutation.mutate(newTaskTitle.trim());
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-default)', border: '1px solid var(--border-default)' }}>
      {/* ── Topic Header — entire row is clickable ────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none transition-colors"
        onClick={() => setCollapsed((v) => !v)}
        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'}
        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <span style={{ color: 'var(--text-muted)' }} className="shrink-0">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {topic.title}
          </span>
          {topic.total_tasks > 0 && (
            <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
              {topic.completed_tasks}/{topic.total_tasks}
            </span>
          )}
          {!collapsed && topic.total_tasks > 1 && (
            <div className="w-20 shrink-0" onClick={(e) => e.stopPropagation()}>
              <ProgressBar value={topic.progress_percent} color={color} size="sm" />
            </div>
          )}
        </div>

        {/* Action buttons — stopPropagation to avoid triggering collapse */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setAddingTask(true); if (collapsed) setCollapsed(false); }}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Plus size={12} /> Add Task
          </button>
          <button
            onClick={() => { if (confirm(`Delete "${topic.title}" and all its tasks?`)) deleteTopicMutation.mutate(); }}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-disabled)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.background = 'var(--danger-subtle)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-disabled)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* ── Task list ─────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid var(--border-muted)' }}>
          {topic.tasks.length === 0 && !addingTask && (
            <p className="text-xs text-center py-3" style={{ color: 'var(--text-disabled)' }}>
              No tasks —{' '}
              <button
                style={{ color: 'var(--accent-hover)' }}
                onClick={() => setAddingTask(true)}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >add one</button>
            </p>
          )}

          <div className="mt-1 space-y-0.5">
            {topic.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isOpen={openTaskId === task.id}
                onOpen={() => setOpenTaskId(task.id)}
                onClose={() => setOpenTaskId(null)}
                onStatusCycle={(s) => updateStatusMutation.mutate({ id: task.id, status: s })}
                onSave={(patch) => { onSaveTask(task.id, patch); }}
                onDelete={() => { onDeleteTask(task.id); setOpenTaskId(null); }}
              />
            ))}
          </div>

          {/* Inline add task form */}
          {addingTask && (
            <form onSubmit={handleAddTask}
              className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
            >
              <Circle size={14} style={{ color: 'var(--text-disabled)' }} className="shrink-0" />
              <input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title…"
                className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
                style={{ color: 'var(--text-primary)' }}
                onKeyDown={(e) => e.key === 'Escape' && setAddingTask(false)}
              />
              <button type="submit" disabled={!newTaskTitle.trim()}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-white disabled:opacity-40 shrink-0"
                style={{ background: 'var(--accent)' }}>
                {createTaskMutation.isPending ? '…' : 'Add'}
              </button>
              <button type="button" onClick={() => { setAddingTask(false); setNewTaskTitle(''); }}
                className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function RoadmapDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const [addingTopic,   setAddingTopic]   = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');

  const { data: roadmap, isLoading, isError } = useQuery({
    queryKey: ['roadmap', id], queryFn: () => getRoadmap(id!), enabled: !!id,
  });

  const snap    = () => qc.getQueryData<RoadmapDetail>(['roadmap', id]);
  const restore = (p: RoadmapDetail | undefined) => qc.setQueryData(['roadmap', id], p);
  const settle  = () => qc.invalidateQueries({ queryKey: ['roadmap', id] });

  const createTopicMutation = useMutation({
    mutationFn: (title: string) => createTopic(id!, { title }),
    onMutate: async (title) => {
      await qc.cancelQueries({ queryKey: ['roadmap', id] });
      const prev = snap();
      const temp: Topic = { id: `temp-${Date.now()}`, roadmap_id: id!, title, description: null, sort_order: 999, tasks: [], total_tasks: 0, completed_tasks: 0, progress_percent: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      qc.setQueryData<RoadmapDetail>(['roadmap', id], (old) => addTopic(old, temp));
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSuccess: () => { setNewTopicTitle(''); setAddingTopic(false); },
    onSettled: () => { settle(); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const saveTaskMutation = useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: Partial<Task> }) =>
      updateTask(taskId, { ...patch, notes: patch.notes ?? undefined }),
    onMutate: async ({ taskId, patch }) => {
      await qc.cancelQueries({ queryKey: ['roadmap', id] });
      const prev = snap();
      qc.setQueryData<RoadmapDetail>(['roadmap', id], (old) => patchTask(old, taskId, patch));
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSettled: () => { settle(); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: ['roadmap', id] });
      const prev = snap();
      qc.setQueryData<RoadmapDetail>(['roadmap', id], (old) => removeTask(old, taskId));
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSettled: () => { settle(); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl space-y-4 animate-pulse">
        <div className="h-4 w-28 rounded" style={{ background: 'var(--bg-subtle)' }} />
        <div className="h-7 w-52 rounded mt-5" style={{ background: 'var(--bg-subtle)' }} />
        <div className="h-px my-5" style={{ background: 'var(--border-muted)' }} />
        {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl" style={{ background: 'var(--bg-default)' }} />)}
      </div>
    );
  }

  if (isError || !roadmap) {
    return <div className="p-8 text-sm" style={{ color: 'var(--danger)' }}>Failed to load roadmap.</div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Back */}
      <button onClick={() => navigate('/roadmaps')}
        className="flex items-center gap-1.5 text-sm mb-7 transition-colors group"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        All Roadmaps
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0"
          style={{ background: `${roadmap.color}22`, color: roadmap.color }}>
          {roadmap.title.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{roadmap.title}</h1>
          {roadmap.description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{roadmap.description}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5 py-4 mb-6" style={{ borderBottom: '1px solid var(--border-muted)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-32"><ProgressBar value={roadmap.progress_percent} color={roadmap.color} /></div>
          <span className="text-sm font-semibold tabular-nums" style={{ color: roadmap.color }}>
            {roadmap.progress_percent.toFixed(0)}%
          </span>
        </div>
        <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
          {roadmap.completed_tasks}/{roadmap.total_tasks} done
        </span>
        {roadmap.in_progress_tasks > 0 && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--info)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--info)' }} />
            {roadmap.in_progress_tasks} in progress
          </span>
        )}
      </div>

      {/* Topics */}
      <div className="space-y-3">
        {roadmap.topics.length === 0 && !addingTopic && (
          <div className="text-center py-14" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">No topics yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>Add a topic below to start organizing your tasks</p>
          </div>
        )}

        {roadmap.topics.map((topic) => (
          <TopicSection
            key={topic.id}
            topic={topic}
            color={roadmap.color}
            roadmapId={roadmap.id}
            onSaveTask={(taskId, patch) => saveTaskMutation.mutate({ taskId, patch })}
            onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
          />
        ))}

        {/* Add Topic */}
        {addingTopic
          ? <form onSubmit={(e) => { e.preventDefault(); if (newTopicTitle.trim()) createTopicMutation.mutate(newTopicTitle.trim()); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-default)', border: '1px solid var(--accent-border)' }}>
              <input autoFocus value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="Topic title…"
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
                onKeyDown={(e) => e.key === 'Escape' && setAddingTopic(false)}
              />
              <button type="submit" disabled={!newTopicTitle.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                style={{ background: 'var(--accent)' }}>
                {createTopicMutation.isPending ? '…' : 'Add Topic'}
              </button>
              <button type="button" onClick={() => { setAddingTopic(false); setNewTopicTitle(''); }}
                className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            </form>
          : <button onClick={() => setAddingTopic(true)}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm transition-colors"
              style={{ border: '1px dashed var(--border-default)', color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Plus size={14} /> Add Topic
            </button>
        }
      </div>
    </div>
  );
}
