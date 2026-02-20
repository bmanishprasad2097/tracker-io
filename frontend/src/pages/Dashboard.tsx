import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Flame, CheckCircle2, BookOpen, Layers, Map, Target } from 'lucide-react';
import { getDashboardStats } from '../api/dashboard';
import type { DashboardStats } from '../types';

/* ─── Stat Card ─────────────────────────────────────────────────── */
const STAT_STYLES = {
  indigo:  { cls: 'stat-indigo',  accent: '#818cf8', glow: '#6366f1' },
  violet:  { cls: 'stat-violet',  accent: '#a78bfa', glow: '#7c3aed' },
  emerald: { cls: 'stat-emerald', accent: '#34d399', glow: '#10b981' },
  amber:   { cls: 'stat-amber',   accent: '#fbbf24', glow: '#f59e0b' },
};

function StatCard({
  label, value, icon: Icon, variant, sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  variant: keyof typeof STAT_STYLES;
  sub?: string;
}) {
  const style = STAT_STYLES[variant];
  return (
    <div className={`${style.cls} rounded-2xl p-5 animate-fade-up`}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${style.glow}20`, boxShadow: `0 0 16px ${style.glow}30` }}
      >
        <Icon size={17} style={{ color: style.accent }} />
      </div>
      <p className="text-2xl font-bold text-white tabular-nums mb-0.5">{value}</p>
      <p className="text-sm" style={{ color: '#7878a0' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#8090b0' }}>{sub}</p>}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-white/5 mb-4" />
      <div className="h-7 w-16 rounded-lg mb-2" style={{ background: '#ffffff08' }} />
      <div className="h-4 w-24 rounded"          style={{ background: '#ffffff05' }} />
    </div>
  );
}

/* ─── Chart tooltip ─────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-2xl text-xs"
      style={{ background: '#10102a', border: '1px solid #2a2a50' }}
    >
      <p style={{ color: '#7878a0' }} className="mb-0.5">{label}</p>
      <p className="font-semibold text-white">{payload[0].value} {payload[0].value === 1 ? 'task' : 'tasks'}</p>
    </div>
  );
};

/* ─── Circular progress ─────────────────────────────────────────── */
function CircleProgress({ value }: { value: number }) {
  const r      = 42;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, value) / 100);
  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1a1a30" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke="url(#prog-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: 'drop-shadow(0 0 6px #6366f170)', transition: 'stroke-dashoffset 0.7s ease-out' }}
        />
        <defs>
          <linearGradient id="prog-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white tabular-nums">{value.toFixed(0)}%</span>
                <span className="text-xs mt-0.5" style={{ color: '#8090b0' }}>done</span>
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8090b0' }}>Your learning progress at a glance.</p>
      </div>

      {isError && (
        <div
          className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400"
          style={{ background: '#ff000010', border: '1px solid #ff000025' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          Backend not reachable — make sure it's running on port 8000.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : <>
              <StatCard label="Roadmaps"   value={data?.total_roadmaps ?? 0}  icon={Map}          variant="indigo"  />
              <StatCard label="Tasks"      value={data?.total_tasks ?? 0}     icon={Layers}       variant="violet"  sub={`across ${data?.total_topics ?? 0} topics`} />
              <StatCard label="Completed"  value={data?.completed_tasks ?? 0} icon={CheckCircle2} variant="emerald" sub={`${(data?.completion_percent ?? 0).toFixed(0)}% of all tasks`} />
              <StatCard label="Day Streak" value={data?.current_streak ?? 0}  icon={Flame}        variant="amber"   sub={data?.current_streak === 1 ? 'day in a row' : 'days in a row'} />
            </>
        }
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-white">Completion Activity</h2>
              <p className="text-xs mt-0.5" style={{ color: '#8090b0' }}>Tasks completed per day — last 30 days</p>
            </div>
            <Target size={15} style={{ color: '#2a2a4a' }} />
          </div>

          {isLoading
            ? <div className="h-48 rounded-xl animate-pulse" style={{ background: '#ffffff05' }} />
            : chartData.length === 0
              ? <div className="h-48 flex flex-col items-center justify-center gap-2" style={{ color: '#2a2a4a' }}>
                  <CheckCircle2 size={28} className="opacity-30" />
                  <p className="text-sm" style={{ color: '#6870a0' }}>No completed tasks yet</p>
                </div>
              : <ResponsiveContainer width="100%" height={196}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#15152a" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#3a3a5a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#3a3a5a', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#2a2a50', strokeWidth: 1 }} />
                    <Area
                      type="monotone" dataKey="tasks"
                      stroke="#6366f1" strokeWidth={2}
                      fill="url(#gArea)" dot={false}
                      activeDot={{ r: 4, fill: '#818cf8', stroke: '#0e0e22', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
          }
        </div>

        {/* Circle progress */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-white">Overall Progress</h2>
            <BookOpen size={15} style={{ color: '#2a2a4a' }} />
          </div>
          {isLoading
            ? <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="w-32 h-32 rounded-full" style={{ background: '#ffffff05' }} />
                <div className="w-full space-y-2">
                  <div className="h-4 rounded" style={{ background: '#ffffff05' }} />
                  <div className="h-4 rounded" style={{ background: '#ffffff05' }} />
                </div>
              </div>
            : <div className="flex flex-col items-center">
                <CircleProgress value={data?.completion_percent ?? 0} />
                <div className="mt-6 w-full space-y-3">
                  {[
                    { label: 'Completed', value: data?.completed_tasks ?? 0,                                          dot: '#34d399' },
                    { label: 'Remaining', value: (data?.total_tasks ?? 0) - (data?.completed_tasks ?? 0),             dot: '#3a3a5a' },
                    { label: 'Topics',    value: data?.total_topics ?? 0,                                              dot: '#818cf8' },
                  ].map(({ label, value, dot }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
                        <span style={{ color: '#8090b0' }}>{label}</span>
                      </div>
                      <span className="font-semibold text-white tabular-nums">{value}</span>
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
