import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Flame, CheckCircle2, BookOpen, Layers, Map, Target } from 'lucide-react';
import { getDashboardStats } from '../api/dashboard';
import type { DashboardStats } from '../types';

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div
      className="rounded-xl p-5 animate-fade-up"
      style={{ background: 'var(--bg-default)', border: '1px solid var(--border-default)' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4" style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <p className="text-2xl font-bold tabular-nums mb-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-xl p-5 animate-pulse" style={{ background: 'var(--bg-default)', border: '1px solid var(--border-default)' }}>
      <div className="w-8 h-8 rounded-lg mb-4" style={{ background: 'var(--bg-overlay)' }} />
      <div className="h-6 w-14 rounded mb-2" style={{ background: 'var(--bg-overlay)' }} />
      <div className="h-4 w-20 rounded" style={{ background: 'var(--bg-subtle)' }} />
    </div>
  );
}

/* ─── Tooltip ───────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-xl" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)' }}>
      <p style={{ color: 'var(--text-muted)' }} className="mb-0.5">{label}</p>
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{payload[0].value} {payload[0].value === 1 ? 'task' : 'tasks'}</p>
    </div>
  );
};

/* ─── Circular progress ─────────────────────────────────────────── */
function CircleProgress({ value }: { value: number }) {
  const r = 42; const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border-default)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#6366f1" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - Math.min(100, value) / 100)}
          style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value.toFixed(0)}%</span>
        <span className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>done</span>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  });

  const chartData = (data?.tasks_completed_per_day ?? []).map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tasks: d.count,
  }));

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Your learning progress at a glance.</p>
      </div>

      {isError && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--danger-subtle)', border: '1px solid #f8514930', color: 'var(--danger)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          Backend not reachable — make sure it's running on port 8000.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : <>
              <StatCard label="Roadmaps"   value={data?.total_roadmaps ?? 0}  icon={Map}          color="#6366f1" />
              <StatCard label="Tasks"      value={data?.total_tasks ?? 0}     icon={Layers}       color="#8b5cf6" sub={`across ${data?.total_topics ?? 0} topics`} />
              <StatCard label="Completed"  value={data?.completed_tasks ?? 0} icon={CheckCircle2} color="#3fb950" sub={`${(data?.completion_percent ?? 0).toFixed(0)}% of all tasks`} />
              <StatCard label="Day Streak" value={data?.current_streak ?? 0}  icon={Flame}        color="#d29922" sub={data?.current_streak === 1 ? 'day in a row' : 'days in a row'} />
            </>
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-6" style={{ background: 'var(--bg-default)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Completion Activity</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Tasks completed per day — last 30 days</p>
            </div>
            <Target size={15} style={{ color: 'var(--text-disabled)' }} />
          </div>
          {isLoading
            ? <div className="h-48 rounded-lg animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
            : chartData.length === 0
              ? <div className="h-48 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-disabled)' }}>
                  <CheckCircle2 size={28} className="opacity-40" />
                  <p className="text-sm">No completed tasks yet</p>
                </div>
              : <ResponsiveContainer width="100%" height={196}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#6e7681', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6e7681', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#30363d', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="tasks" stroke="#6366f1" strokeWidth={2} fill="url(#gArea)" dot={false}
                      activeDot={{ r: 4, fill: '#818cf8', stroke: '#161b22', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
          }
        </div>

        <div className="rounded-xl p-6" style={{ background: 'var(--bg-default)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Overall Progress</h2>
            <BookOpen size={15} style={{ color: 'var(--text-disabled)' }} />
          </div>
          {isLoading
            ? <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="w-32 h-32 rounded-full" style={{ background: 'var(--bg-subtle)' }} />
                <div className="w-full space-y-2">
                  <div className="h-4 rounded" style={{ background: 'var(--bg-subtle)' }} />
                  <div className="h-4 rounded" style={{ background: 'var(--bg-subtle)' }} />
                </div>
              </div>
            : <div className="flex flex-col items-center">
                <CircleProgress value={data?.completion_percent ?? 0} />
                <div className="mt-6 w-full space-y-3">
                  {[
                    { label: 'Completed', value: data?.completed_tasks ?? 0,                                         dot: '#3fb950' },
                    { label: 'Remaining', value: (data?.total_tasks ?? 0) - (data?.completed_tasks ?? 0),            dot: '#6e7681' },
                    { label: 'Topics',    value: data?.total_topics ?? 0,                                             dot: '#6366f1' },
                  ].map(({ label, value, dot }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm" style={{ background: dot }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      </div>
                      <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
          }
        </div>
      </div>
    </div>
  );
}
