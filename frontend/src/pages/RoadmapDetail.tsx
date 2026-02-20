import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Circle, Clock, CheckCircle2, Trash2,
  ChevronDown, ChevronRight, Pencil, X, FileText,
} from 'lucide-react';
import { getRoadmap } from '../api/roadmaps';
import { createTopic, deleteTopic } from '../api/topics';
import { createTask, updateTask, deleteTask } from '../api/tasks';
import type { RoadmapDetail, Task, TaskStatus, Topic } from '../types';
import ProgressBar from '../components/ProgressBar';

/* ─── Cache helpers ──────────────────────────────────────────────── */

function recalcTopic(topic: Topic): Topic {
  const done = topic.tasks.filter((t) => t.status === 'completed').length;
  return {
    ...topic,
    total_tasks: topic.tasks.length,
    completed_tasks: done,
    progress_percent: topic.tasks.length > 0 ? (done / topic.tasks.length) * 100 : 0,
  };
}

function recalcRoadmap(r: RoadmapDetail): RoadmapDetail {
  const allTasks  = r.topics.flatMap((t) => t.tasks);
  const done      = allTasks.filter((t) => t.status === 'completed').length;
  const inProg    = allTasks.filter((t) => t.status === 'in_progress').length;
  return {
    ...r,
    total_tasks:        allTasks.length,
    completed_tasks:    done,
    in_progress_tasks:  inProg,
    progress_percent:   allTasks.length > 0 ? (done / allTasks.length) * 100 : 0,
  };
}

function patchTaskInCache(
  old: RoadmapDetail | undefined,
  taskId: string,
  patch: Partial<Task>,
): RoadmapDetail | undefined {
  if (!old) return old;
  const topics = old.topics.map((topic) => {
    const tasks = topic.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
    return recalcTopic({ ...topic, tasks });
  });
  return recalcRoadmap({ ...old, topics });
}

function removeTaskFromCache(
  old: RoadmapDetail | undefined,
  taskId: string,
): RoadmapDetail | undefined {
  if (!old) return old;
  const topics = old.topics.map((topic) => {
    const tasks = topic.tasks.filter((t) => t.id !== taskId);
    return recalcTopic({ ...topic, tasks });
  });
  return recalcRoadmap({ ...old, topics });
}

function addTaskToCache(
  old: RoadmapDetail | undefined,
  topicId: string,
  task: Task,
): RoadmapDetail | undefined {
  if (!old) return old;
  const topics = old.topics.map((topic) => {
    if (topic.id !== topicId) return topic;
    return recalcTopic({ ...topic, tasks: [...topic.tasks, task] });
  });
  return recalcRoadmap({ ...old, topics });
}

function removeTopicFromCache(
  old: RoadmapDetail | undefined,
  topicId: string,
): RoadmapDetail | undefined {
  if (!old) return old;
  const topics = old.topics.filter((t) => t.id !== topicId);
  return recalcRoadmap({ ...old, topics });
}

function addTopicToCache(
  old: RoadmapDetail | undefined,
  topic: Topic,
): RoadmapDetail | undefined {
  if (!old) return old;
  return recalcRoadmap({ ...old, topics: [...old.topics, topic] });
}

/* ─── Status config ──────────────────────────────────────────────── */

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  not_started: { label: 'Not started', icon: Circle,       color: '#64748b', bg: '#64748b15' },
  in_progress: { label: 'In progress', icon: Clock,        color: '#3b82f6', bg: '#3b82f615' },
  completed:   { label: 'Completed',   icon: CheckCircle2, color: '#10b981', bg: '#10b98115' },
};

const STATUS_ORDER: TaskStatus[] = ['not_started', 'in_progress', 'completed'];

/* ─── Task edit slide panel ─────────────────────────────────────── */

function TaskPanel({
  task, onClose, onSave, onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const [title,  setTitle]  = useState(task.title);
  const [notes,  setNotes]  = useState(task.notes ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);

  const handleSave = () => {
    onSave(task.id, { title: title.trim(), notes: notes.trim() || undefined, status });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]" onClick={handleSave} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col animate-slide-in"
        style={{ background: 'linear-gradient(180deg, #0c0c20 0%, #09091a 100%)', borderLeft: '1px solid #1a1a30', boxShadow: '-20px 0 60px #00000060' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #13132a' }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7880a8' }}>Task Details</span>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: '#7880a8' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#c0c0e0'; (e.currentTarget as HTMLElement).style.background = '#ffffff0a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a4a6a'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#7880a8' }}>Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_ORDER.map((s) => {
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                const active = status === s;
                return (
                  <button
                    key={s} onClick={() => setStatus(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={active
                      ? { color: cfg.color, borderColor: `${cfg.color}50`, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}40`, boxShadow: `0 0 10px ${cfg.color}20` }
                      : { color: '#3a3a5a', border: '1px solid #1a1a30' }}
                  >
                    <Icon size={12} />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: '#7880a8' }}>Title</label>
            <input
              autoFocus value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-colors"
              style={{ background: '#0a0a1e', border: '1px solid #1a1a30' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f155')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1a1a30')}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: '#7880a8' }}>
              <FileText size={10} /> Notes
            </label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={6} placeholder="Add notes, links, or anything relevant…"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-colors resize-none leading-relaxed"
              style={{ background: '#0a0a1e', border: '1px solid #1a1a30', color: '#c0c0e0' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f155')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1a1a30')}
            />
          </div>

          {/* Meta */}
          <div className="pt-2 space-y-2" style={{ borderTop: '1px solid #13132a' }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: '#5a6288' }}>Created</span>
              <span style={{ color: '#8890b8' }}>
                {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {task.completed_at && (
              <div className="flex justify-between text-xs">
                <span style={{ color: '#5a6288' }}>Completed</span>
                <span style={{ color: '#34d39980' }}>
                  {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderTop: '1px solid #13132a' }}>
          <button           onClick={() => onDelete(task.id)}
            className="p-2 rounded-lg transition-colors" style={{ color: '#6870a0' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = '#ff000012'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6870a0'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          ><Trash2 size={14} /></button>
          <div className="flex-1" />
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ background: '#ffffff08', color: '#8890b8' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ffffff12')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff08')}
          >Discard</button>
          <button onClick={handleSave}
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 16px #6366f140' }}
          >Save</button>
        </div>
      </div>
    </>
  );
}

/* ─── Status Cycler ─────────────────────────────────────────────── */

function StatusCycler({ task, onUpdate }: { task: Task; onUpdate: (s: TaskStatus) => void }) {
  const next = STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length];
  const cfg  = STATUS_CONFIG[task.status];
  const Icon = cfg.icon;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onUpdate(next); }}
      className="shrink-0 p-0.5 rounded transition-transform hover:scale-110 active:scale-95"
      title={`Mark as ${STATUS_CONFIG[next].label}`}
    >
      <Icon size={17} style={{ color: cfg.color }} />
    </button>
  );
}

/* ─── Task Row ──────────────────────────────────────────────────── */

function TaskRow({
  task, onStatusChange, onOpenEdit, onDelete,
}: {
  task: Task;
  onStatusChange: (s: TaskStatus) => void;
  onOpenEdit: (t: Task) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all"
      style={{ transition: 'background 0.15s' }}
      onClick={() => onOpenEdit(task)}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#ffffff04')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      <StatusCycler task={task} onUpdate={onStatusChange} />
      <span
        className="flex-1 text-sm leading-relaxed select-none"
        style={{ color: task.status === 'completed' ? '#4a5278' : '#c8d0e8', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}
      >
        {task.title}
      </span>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.notes && <FileText size={11} style={{ color: '#6870a0' }} />}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenEdit(task); }}
          className="p-1 rounded transition-colors"
          style={{ color: '#6870a0' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#b0b8d8'; (e.currentTarget as HTMLElement).style.background = '#ffffff0a'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6870a0'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded transition-colors"
          style={{ color: '#6870a0' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = '#ff000012'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6870a0'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

/* ─── Topic Section ─────────────────────────────────────────────── */

function TopicSection({
  topic, color, roadmapId, onEditTask,
}: {
  topic: Topic;
  color: string;
  roadmapId: string;
  onEditTask: (t: Task) => void;
}) {
  const qc = useQueryClient();
  const [collapsed, setCollapsed]       = useState(false);
  const [addingTask, setAddingTask]     = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Snapshot + restore helpers
  const snap = useCallback(() => qc.getQueryData<RoadmapDetail>(['roadmap', roadmapId]), [qc, roadmapId]);
  const restore = useCallback((prev: RoadmapDetail | undefined) => {
    qc.setQueryData(['roadmap', roadmapId], prev);
  }, [qc, roadmapId]);
  const settle = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['roadmap', roadmapId] });
  }, [qc, roadmapId]);

  /* Update task status — fully optimistic */
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTask(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['roadmap', roadmapId] });
      const prev = snap();
      qc.setQueryData<RoadmapDetail>(['roadmap', roadmapId], (old) =>
        patchTaskInCache(old, id, { status })
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSettled: settle,
  });

  /* Delete task — fully optimistic */
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['roadmap', roadmapId] });
      const prev = snap();
      qc.setQueryData<RoadmapDetail>(['roadmap', roadmapId], (old) =>
        removeTaskFromCache(old, id)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSettled: () => {
      settle();
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /* Create task — optimistic (temp placeholder) */
  const createTaskMutation = useMutation({
    mutationFn: (title: string) => createTask(topic.id, { title }),
    onMutate: async (title) => {
      await qc.cancelQueries({ queryKey: ['roadmap', roadmapId] });
      const prev = snap();
      const tempTask: Task = {
        id: `temp-${Date.now()}`,
        topic_id: topic.id,
        title,
        notes: null,
        status: 'not_started',
        sort_order: 999,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<RoadmapDetail>(['roadmap', roadmapId], (old) =>
        addTaskToCache(old, topic.id, tempTask)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSuccess: () => { setNewTaskTitle(''); setAddingTask(false); },
    onSettled: () => {
      settle();
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /* Delete topic — optimistic */
  const deleteTopicMutation = useMutation({
    mutationFn: () => deleteTopic(topic.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['roadmap', roadmapId] });
      const prev = snap();
      qc.setQueryData<RoadmapDetail>(['roadmap', roadmapId], (old) =>
        removeTopicFromCache(old, topic.id)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSettled: () => {
      settle();
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleDelete = (taskId: string) => {
    if (confirm('Delete this task?')) deleteTaskMutation.mutate(taskId);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #0e0e22 0%, #0b0b1a 100%)', border: '1px solid #1a1a32' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button onClick={() => setCollapsed((v) => !v)} className="p-0.5 transition-colors shrink-0" style={{ color: '#5a6288' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#a0a8c8')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#5a6288')}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-white truncate">{topic.title}</span>
            {topic.total_tasks > 0 && (
              <span className="text-xs shrink-0 tabular-nums" style={{ color: '#7880a8' }}>
                {topic.completed_tasks}/{topic.total_tasks}
              </span>
            )}
          </div>
          {!collapsed && topic.total_tasks > 1 && (
            <div className="mt-2 w-28">
              <ProgressBar value={topic.progress_percent} color={color} size="sm" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => { setAddingTask(true); if (collapsed) setCollapsed(false); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            style={{ color: '#7880a8' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#c0c8e8'; (e.currentTarget as HTMLElement).style.background = '#ffffff0a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#7880a8'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Plus size={12} /> Add Task
          </button>
          <button
            onClick={() => { if (confirm(`Delete "${topic.title}" and all its tasks?`)) deleteTopicMutation.mutate(); }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#4a5278' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = '#ff000012'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a5278'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Task list */}
      {!collapsed && (
        <div className="px-2 pb-2">
          {topic.tasks.length === 0 && !addingTask && (
            <p className="text-xs text-center py-3" style={{ color: '#6870a0' }}>
              No tasks —{' '}
              <button className="transition-colors" style={{ color: '#6366f1' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#6366f1')}
                onClick={() => setAddingTask(true)}
              >add one</button>
            </p>
          )}

          {topic.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onStatusChange={(s) => updateStatusMutation.mutate({ id: task.id, status: s })}
              onOpenEdit={onEditTask}
              onDelete={() => handleDelete(task.id)}
            />
          ))}

          {/* Inline add */}
          {addingTask && (
            <form
              className="flex items-center gap-2.5 px-4 py-2.5 mt-1 rounded-xl"
              style={{ border: '1px solid #1a1a30', background: '#ffffff03' }}
              onSubmit={(e) => { e.preventDefault(); if (newTaskTitle.trim()) createTaskMutation.mutate(newTaskTitle.trim()); }}
            >
              <Circle size={15} className="text-slate-700 shrink-0" />
              <input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title…"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-700 focus:outline-none min-w-0"
                onKeyDown={(e) => e.key === 'Escape' && setAddingTask(false)}
              />
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-500 disabled:opacity-40 transition-colors shrink-0"
              >
                Add
              </button>
              <button type="button" onClick={() => { setAddingTask(false); setNewTaskTitle(''); }} className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors">
                <X size={13} />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Edit panel scoped to topic so we can pass the right mutation */}
      {/* (rendered at page level via onEditTask callback) */}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function RoadmapDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const [addingTopic,   setAddingTopic]   = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [editingTask,   setEditingTask]   = useState<Task | null>(null);

  const { data: roadmap, isLoading, isError } = useQuery({
    queryKey: ['roadmap', id],
    queryFn:  () => getRoadmap(id!),
    enabled:  !!id,
  });

  const snap    = () => qc.getQueryData<RoadmapDetail>(['roadmap', id]);
  const restore = (prev: RoadmapDetail | undefined) => qc.setQueryData(['roadmap', id], prev);
  const settle  = () => qc.invalidateQueries({ queryKey: ['roadmap', id] });

  /* Create topic — optimistic */
  const createTopicMutation = useMutation({
    mutationFn: (title: string) => createTopic(id!, { title }),
    onMutate: async (title) => {
      await qc.cancelQueries({ queryKey: ['roadmap', id] });
      const prev = snap();
      const tempTopic: Topic = {
        id: `temp-${Date.now()}`,
        roadmap_id: id!,
        title,
        description: null,
        sort_order: 999,
        tasks: [],
        total_tasks: 0,
        completed_tasks: 0,
        progress_percent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<RoadmapDetail>(['roadmap', id], (old) => addTopicToCache(old, tempTopic));
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSuccess: () => { setNewTopicTitle(''); setAddingTopic(false); },
    onSettled: () => {
      settle();
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /* Save task from panel — optimistic */
  const saveTaskMutation = useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: Partial<Task> }) =>
      updateTask(taskId, { ...patch, notes: patch.notes ?? undefined }),
    onMutate: async ({ taskId, patch }) => {
      await qc.cancelQueries({ queryKey: ['roadmap', id] });
      const prev = snap();
      qc.setQueryData<RoadmapDetail>(['roadmap', id], (old) =>
        patchTaskInCache(old, taskId, patch)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSettled: () => {
      settle();
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /* Delete task from panel — optimistic */
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: ['roadmap', id] });
      const prev = snap();
      qc.setQueryData<RoadmapDetail>(['roadmap', id], (old) =>
        removeTaskFromCache(old, taskId)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => restore(ctx?.prev),
    onSuccess: () => setEditingTask(null),
    onSettled: () => {
      settle();
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl space-y-4 animate-pulse">
        <div className="h-5 w-28 bg-white/5 rounded-lg" />
        <div className="h-7 w-52 bg-white/5 rounded-xl mt-5" />
        <div className="h-px bg-white/5 my-5" />
        {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
      </div>
    );
  }

  if (isError || !roadmap) {
    return <div className="p-8 text-sm text-red-400">Failed to load roadmap.</div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => navigate('/roadmaps')}
        className="flex items-center gap-1.5 text-sm mb-7 transition-colors group"
        style={{ color: '#7880a8' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#d0d4f0')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#7880a8')}
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        All Roadmaps
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0"
          style={{ backgroundColor: `${roadmap.color}18`, color: roadmap.color }}
        >
          {roadmap.title.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">{roadmap.title}</h1>
          {roadmap.description && <p className="text-slate-500 text-sm mt-0.5">{roadmap.description}</p>}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-5 py-4 mb-6" style={{ borderBottom: '1px solid #13132a' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-36">
            <ProgressBar value={roadmap.progress_percent} color={roadmap.color} />
          </div>
          <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: roadmap.color }}>
            {roadmap.progress_percent.toFixed(0)}%
          </span>
        </div>
        <span className="text-sm tabular-nums shrink-0" style={{ color: '#8890b8' }}>
          {roadmap.completed_tasks}/{roadmap.total_tasks} done
        </span>
        {roadmap.in_progress_tasks > 0 && (
          <span className="flex items-center gap-1.5 text-xs shrink-0" style={{ color: '#60a5fa80' }}>
            <span className="w-1 h-1 rounded-full" style={{ background: '#60a5fa' }} />
            {roadmap.in_progress_tasks} in progress
          </span>
        )}
      </div>

      {/* Topics */}
      <div className="space-y-3">
        {roadmap.topics.length === 0 && !addingTopic && (
          <div className="text-center py-14" style={{ color: '#6870a0' }}>
            <p className="text-sm">No topics yet</p>
            <p className="text-xs mt-1 opacity-70">Add a topic below to start organizing your tasks</p>
          </div>
        )}

        {roadmap.topics.map((topic) => (
          <TopicSection
            key={topic.id}
            topic={topic}
            color={roadmap.color}
            roadmapId={roadmap.id}
            onEditTask={setEditingTask}
          />
        ))}

        {addingTopic ? (
          <form
            className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
            style={{ background: '#0e0e22', border: '1px solid #6366f130' }}
            onSubmit={(e) => { e.preventDefault(); if (newTopicTitle.trim()) createTopicMutation.mutate(newTopicTitle.trim()); }}
          >
            <input
              autoFocus
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="Topic title…"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
              onKeyDown={(e) => e.key === 'Escape' && setAddingTopic(false)}
            />
            <button type="submit" disabled={!newTopicTitle.trim()} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-500 disabled:opacity-40 transition-colors shrink-0">
              Add Topic
            </button>
            <button type="button" onClick={() => { setAddingTopic(false); setNewTopicTitle(''); }} className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors">
              <X size={13} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAddingTopic(true)}
            className="flex items-center gap-2 w-full px-4 py-3.5 rounded-2xl text-sm transition-colors"
            style={{ border: '1px dashed #2a2a4a', color: '#7880a8' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#b0b8d8'; (e.currentTarget as HTMLElement).style.borderColor = '#4a4a70'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#7880a8'; (e.currentTarget as HTMLElement).style.borderColor = '#2a2a4a'; }}
          >
            <Plus size={13} /> Add Topic
          </button>
        )}
      </div>

      {/* Task edit panel — rendered at page level, outside any clipping */}
      {editingTask && (
        <TaskPanel
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(taskId, patch) => {
            saveTaskMutation.mutate({ taskId, patch });
            setEditingTask(null);
          }}
          onDelete={(taskId) => {
            if (confirm('Delete this task?')) deleteTaskMutation.mutate(taskId);
          }}
        />
      )}
    </div>
  );
}
