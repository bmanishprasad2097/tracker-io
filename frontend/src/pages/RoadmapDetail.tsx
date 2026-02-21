import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft, Plus, Circle, Clock, CheckCircle2, Trash2,
  ChevronDown, ChevronRight, X, FileText, Eye, Pencil,
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
function addTopicFn(old: RoadmapDetail | undefined, topic: Topic): RoadmapDetail | undefined {
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

/* ─── Task Row ───────────────────────────────────────────────────── */
function TaskRow({ task, isSelected, onSelect, onStatusCycle }: {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
  onStatusCycle: (s: TaskStatus) => void;
}) {
  const cfg        = STATUS[task.status];
  const Icon       = cfg.icon;
  const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length];

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
      onClick={onSelect}
      style={isSelected
        ? { background: 'var(--accent-subtle)', outline: '1px solid var(--accent-border)' }
        : undefined}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
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

      {task.notes && (
        <FileText size={12} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-disabled)' }} />
      )}
    </div>
  );
}

/* ─── Task Detail Panel (right side) ────────────────────────────── */
function TaskDetailPanel({ task, onClose, onStatusCycle, onSave, onDelete }: {
  task: Task;
  onClose: () => void;
  onStatusCycle: (taskId: string, s: TaskStatus) => void;
  onSave: (taskId: string, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}) {
  const [editing,    setEditing]    = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [title,      setTitle]      = useState(task.title);
  const [notes,      setNotes]      = useState(task.notes ?? '');
  const [status,     setStatus]     = useState<TaskStatus>(task.status);

  // Sync when a different task is selected
  const taskId = task.id;
  const [lastId, setLastId] = useState(taskId);
  if (taskId !== lastId) {
    setLastId(taskId);
    setEditing(false);
    setPreviewing(false);
    setTitle(task.title);
    setNotes(task.notes ?? '');
    setStatus(task.status);
  }

  const enterEdit = () => {
    setTitle(task.title);
    setNotes(task.notes ?? '');
    setStatus(task.status);
    setPreviewing(false);
    setEditing(true);
  };

  const handleSave = () => {
    onSave(task.id, { title: title.trim() || task.title, notes: notes.trim() || undefined, status });
    setEditing(false);
  };

  const cfg        = STATUS[task.status];
  const Icon       = cfg.icon;
  const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length];

  return (
    <div
      className="flex flex-col h-full animate-fade-in"
      style={{ borderLeft: '1px solid var(--border-default)', background: 'var(--bg-default)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border-muted)' }}>
        {editing ? (
          /* Edit mode: status picker */
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            {STATUS_ORDER.map((s) => {
              const c = STATUS[s]; const SIcon = c.icon; const active = status === s;
              return (
                <button key={s} onClick={() => setStatus(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={active
                    ? { background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}40` }
                    : { color: 'var(--text-muted)', border: '1px solid transparent' }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <SIcon size={13} />{c.label}
                </button>
              );
            })}
          </div>
        ) : (
          /* View mode: status badge (clickable to cycle) */
          <button
            onClick={() => onStatusCycle(task.id, nextStatus)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium transition-opacity hover:opacity-75 active:scale-95"
            style={{ background: `${cfg.color}18`, color: cfg.color }}
            title={`Mark as ${STATUS[nextStatus].label}`}
          >
            <Icon size={13} />{cfg.label}
          </button>
        )}

        <div className="flex items-center gap-1 ml-auto shrink-0">
          {!editing && (
            <button onClick={enterEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
            >
              <Pencil size={12} /> Edit
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors ml-1"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          ><X size={15} /></button>
        </div>
      </div>

      {/* ── Title ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 shrink-0">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave(); }}
            className="w-full bg-transparent text-xl font-bold focus:outline-none leading-snug"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Task title…"
          />
        ) : (
          <h2
            className="text-xl font-bold leading-snug"
            style={{
              color: task.status === 'completed' ? 'var(--text-secondary)' : 'var(--text-primary)',
              textDecoration: task.status === 'completed' ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </h2>
        )}
        {task.completed_at && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-disabled)' }}>
            Completed {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* ── Notes ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0 px-5 pb-4">
        {/* Notes label + Write/Preview tabs */}
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <FileText size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Notes</span>
          </div>
          {editing && (
            <div className="flex items-center rounded-lg overflow-hidden ml-auto"
              style={{ border: '1px solid var(--border-default)' }}>
              {[
                { id: false, icon: Pencil, label: 'Write' },
                { id: true,  icon: Eye,   label: 'Preview' },
              ].map(({ id, icon: TabIcon, label }) => (
                <button key={label} onClick={() => setPreviewing(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                  style={previewing === id
                    ? { background: 'var(--bg-overlay)', color: 'var(--text-primary)' }
                    : { color: 'var(--text-muted)' }}
                >
                  <TabIcon size={11} />{label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notes content area */}
        {editing ? (
          previewing ? (
            /* Preview pane */
            <div
              className="flex-1 overflow-y-auto rounded-xl px-4 py-3"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-muted)' }}
            >
              {notes.trim()
                ? <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown></div>
                : <p className="text-sm italic" style={{ color: 'var(--text-disabled)' }}>Nothing to preview.</p>
              }
            </div>
          ) : (
            /* Write textarea */
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave(); }}
              placeholder={`Write notes in Markdown…\n\n# Heading\n**bold**, *italic*, \`code\`\n- list item`}
              className="flex-1 w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none leading-relaxed font-mono"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                minHeight: 0,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            />
          )
        ) : (
          /* View: rendered markdown */
          <div className="flex-1 overflow-y-auto">
            {task.notes?.trim() ? (
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.notes}</ReactMarkdown>
              </div>
            ) : (
              <button
                onClick={enterEdit}
                className="flex items-center gap-1.5 text-sm mt-1 transition-colors"
                style={{ color: 'var(--text-disabled)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-disabled)')}
              >
                <FileText size={13} /> Add notes…
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      {editing && (
        <div className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderTop: '1px solid var(--border-muted)' }}>
          <button onClick={() => { if (confirm('Delete this task?')) onDelete(task.id); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.background = 'var(--danger-subtle)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          ><Trash2 size={14} /> Delete</button>

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
              <kbd className="font-mono">⌘↵</kbd> to save
            </span>
            <button onClick={() => setEditing(false)}
              className="px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >Cancel</button>
            <button onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >Save changes</button>
          </div>
        </div>
      )}

      {/* View mode footer: just delete */}
      {!editing && (
        <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--border-muted)' }}>
          <button onClick={() => { if (confirm('Delete this task?')) onDelete(task.id); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.background = 'var(--danger-subtle)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          ><Trash2 size={14} /> Delete task</button>
        </div>
      )}
    </div>
  );
}

/* ─── Topic Section ─────────────────────────────────────────────── */
function TopicSection({
  topic, color, roadmapId,
  selectedTaskId, onSelectTask, onStatusCycle,
}: {
  topic: Topic; color: string; roadmapId: string;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onStatusCycle: (taskId: string, status: TaskStatus) => void;
}) {
  const qc = useQueryClient();
  const [collapsed,    setCollapsed]    = useState(false);
  const [addingTask,   setAddingTask]   = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const snap    = useCallback(() => qc.getQueryData<RoadmapDetail>(['roadmap', roadmapId]), [qc, roadmapId]);
  const restore = useCallback((p: RoadmapDetail | undefined) => qc.setQueryData(['roadmap', roadmapId], p), [qc, roadmapId]);
  const settle  = useCallback(() => qc.invalidateQueries({ queryKey: ['roadmap', roadmapId] }), [qc, roadmapId]);

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

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-default)', border: '1px solid var(--border-default)' }}>
      {/* Header — entire row collapses/expands */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed((v) => !v)}
        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'}
        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <span style={{ color: 'var(--text-muted)' }} className="shrink-0">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
        <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
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
        {/* Action buttons */}
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

      {/* Task list */}
      {!collapsed && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid var(--border-muted)' }}>
          {topic.tasks.length === 0 && !addingTask && (
            <p className="text-xs text-center py-3" style={{ color: 'var(--text-disabled)' }}>
              No tasks —{' '}
              <button style={{ color: 'var(--accent-hover)' }} onClick={() => setAddingTask(true)}>
                add one
              </button>
            </p>
          )}
          <div className="mt-1 space-y-0.5">
            {topic.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onSelect={() => onSelectTask(task.id)}
                onStatusCycle={(s) => onStatusCycle(task.id, s)}
              />
            ))}
          </div>

          {addingTask && (
            <form onSubmit={(e) => { e.preventDefault(); if (newTaskTitle.trim()) createTaskMutation.mutate(newTaskTitle.trim()); }}
              className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
            >
              <Circle size={14} style={{ color: 'var(--text-disabled)' }} className="shrink-0" />
              <input
                autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title…"
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
                onKeyDown={(e) => e.key === 'Escape' && setAddingTask(false)}
              />
              <button type="submit" disabled={!newTaskTitle.trim()}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-white disabled:opacity-40"
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

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [panelTaskId,    setPanelTaskId]    = useState<string | null>(null);
  const [isClosing,      setIsClosing]      = useState(false);
  const [addingTopic,    setAddingTopic]    = useState(false);
  const [newTopicTitle,  setNewTopicTitle]  = useState('');

  const openPanel = useCallback((taskId: string) => {
    setIsClosing(false);
    setSelectedTaskId(taskId);
    setPanelTaskId(taskId);
  }, []);

  const closePanel = useCallback(() => {
    setIsClosing(true);
    setSelectedTaskId(null);
    setTimeout(() => { setIsClosing(false); setPanelTaskId(null); }, 230);
  }, []);

  const { data: roadmap, isLoading, isError } = useQuery({
    queryKey: ['roadmap', id], queryFn: () => getRoadmap(id!), enabled: !!id,
  });

  const snap    = () => qc.getQueryData<RoadmapDetail>(['roadmap', id]);
  const restore = (p: RoadmapDetail | undefined) => qc.setQueryData(['roadmap', id], p);
  const settle  = () => qc.invalidateQueries({ queryKey: ['roadmap', id] });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) => updateTask(taskId, { status }),
    onMutate: async ({ taskId, status }) => {
      await qc.cancelQueries({ queryKey: ['roadmap', id] });
      const prev = snap();
      qc.setQueryData<RoadmapDetail>(['roadmap', id], (old) => patchTask(old, taskId, { status }));
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
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

  const createTopicMutation = useMutation({
    mutationFn: (title: string) => createTopic(id!, { title }),
    onMutate: async (title) => {
      await qc.cancelQueries({ queryKey: ['roadmap', id] });
      const prev = snap();
      const temp: Topic = { id: `temp-${Date.now()}`, roadmap_id: id!, title, description: null, sort_order: 999, tasks: [], total_tasks: 0, completed_tasks: 0, progress_percent: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      qc.setQueryData<RoadmapDetail>(['roadmap', id], (old) => addTopicFn(old, temp));
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSuccess: () => { setNewTopicTitle(''); setAddingTopic(false); },
    onSettled: () => { settle(); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });


  if (isLoading) {
    return (
      <div className="p-8 max-w-2xl space-y-4 animate-pulse">
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
    <div className="flex h-full overflow-hidden">
      {/* ── Left: topic & task list ───────────────────────────────────── */}
      <div className="h-full overflow-y-auto p-8 shrink-0" style={{ width: '680px' }} onClick={closePanel}>
        <div onClick={(e) => e.stopPropagation()}>
        {/* Back */}
        <button onClick={() => navigate('/roadmaps')}
          className="flex items-center gap-1.5 text-sm mb-7 w-fit group transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          All Roadmaps
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
            style={{ background: `${roadmap.color}22`, color: roadmap.color }}>
            {roadmap.title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{roadmap.title}</h1>
            {roadmap.description && <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{roadmap.description}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 py-4 mb-6" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-28"><ProgressBar value={roadmap.progress_percent} color={roadmap.color} /></div>
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
        <div className="space-y-3 flex-1">
          {roadmap.topics.length === 0 && !addingTopic && (
            <div className="text-center py-14" style={{ color: 'var(--text-muted)' }}>
              <p className="text-sm">No topics yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>Add a topic below to get started</p>
            </div>
          )}

          {roadmap.topics.map((topic) => (
            <TopicSection
              key={topic.id}
              topic={topic}
              color={roadmap.color}
              roadmapId={roadmap.id}
              selectedTaskId={selectedTaskId}
              onSelectTask={(taskId) => selectedTaskId === taskId ? closePanel() : openPanel(taskId)}
              onStatusCycle={(taskId, status) => updateStatusMutation.mutate({ taskId, status })}
            />
          ))}

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
        </div>{/* end topics */}
        </div>{/* end stopPropagation wrapper */}
      </div>{/* end left column */}

      {/* ── Right: sliding detail panel ───────────────────────────────── */}
      {panelTaskId && (() => {
        const panelTask = roadmap.topics.flatMap((t) => t.tasks).find((t) => t.id === panelTaskId);
        if (!panelTask) return null;
        return (
          <div
            key={panelTaskId}
            className={`flex-1 min-w-0 h-full ${isClosing ? 'animate-drawer-out' : 'animate-drawer-in'}`}
            style={{
              borderLeft: '1px solid var(--border-default)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
            }}
          >
            <TaskDetailPanel
              task={panelTask}
              onClose={closePanel}
              onStatusCycle={(taskId, status) => updateStatusMutation.mutate({ taskId, status })}
              onSave={(taskId, patch) => saveTaskMutation.mutate({ taskId, patch })}
              onDelete={(taskId) => { deleteTaskMutation.mutate(taskId); closePanel(); }}
            />
          </div>
        );
      })()}
    </div>
  );
}
