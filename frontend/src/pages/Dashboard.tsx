import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Flame, CheckCircle2, BookOpen, Layers, Map, Target } from 'lucide-react';
import { getDashboardStats } from '../api/dashboard';
import type { DashboardStats } from '../types';

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="bg-[#13131a] border border-[#1e1e2a] rounded-2xl p-5 animate-fade-in">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon size={17} style={{ color }} />
      </div>
      <p className="text-2xl font-bold text-white tabular-nums mb-0.5">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-[#13131a] border border-[#1e1e2a] rounded-2xl p-5 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-white/5 mb-4" />
      <div className="h-7 w-16 bg-white/5 rounded-lg mb-2" />
      <div className="h-4 w-24 bg-white/5 rounded" />
    </div>
  );
}

/* ─── Chart Tooltip ─────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e2e] border border-[#2a2a3e] rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p className="font-semibold text-white">{payload[0].value} {payload[0].value === 1 ? 'task' : 'tasks'}</p>
    </div>
  );
};

/* ─── Circular Progress ─────────────────────────────────────────── */
function CircularProgress({ value }: { value: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, value) / 100);

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e1e2a" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke="#6366f1"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white tabular-nums">{value.toFixed(0)}%</span>
        <span className="text-xs text-slate-500 mt-0.5">done</span>
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
        <p className="text-slate-500 mt-0.5 text-sm">Your learning progress at a glance.</p>
      </div>

      {/* Error banner */}
      {isError && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          Failed to load stats — make sure the backend is running.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Roadmaps"   value={data?.total_roadmaps ?? 0}  icon={Map}          color="#6366f1" />
            <StatCard label="Tasks"      value={data?.total_tasks ?? 0}     icon={Layers}       color="#8b5cf6" sub={`across ${data?.total_topics ?? 0} topics`} />
            <StatCard label="Completed"  value={data?.completed_tasks ?? 0} icon={CheckCircle2} color="#10b981" sub={`${(data?.completion_percent ?? 0).toFixed(0)}% complete`} />
            <StatCard label="Day Streak" value={data?.current_streak ?? 0}  icon={Flame}        color="#f59e0b" sub={data?.current_streak === 1 ? 'day in a row' : 'days in a row'} />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-[#13131a] border border-[#1e1e2a] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-white">Completion Activity</h2>
              <p className="text-xs text-slate-600 mt-0.5">Tasks completed per day (last 30 days)</p>
            </div>
            <Target size={15} className="text-slate-700" />
          </div>
          {isLoading ? (
            <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
          ) : chartData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-600">
              <CheckCircle2 size={24} className="opacity-30" />
              <p className="text-sm">No completed tasks yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={196}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2a2a3e', strokeWidth: 1 }} />
                <Area
                  type="monotone" dataKey="tasks"
                  stroke="#6366f1" strokeWidth={1.5}
                  fill="url(#gTasks)" dot={false}
                  activeDot={{ r: 4, fill: '#6366f1', stroke: '#13131a', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Circular progress */}
        <div className="bg-[#13131a] border border-[#1e1e2a] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-white">Overall Progress</h2>
            <BookOpen size={15} className="text-slate-700" />
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-32 h-32 rounded-full bg-white/5" />
              <div className="w-full space-y-2">
                <div className="h-4 bg-white/5 rounded" />
                <div className="h-4 bg-white/5 rounded" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <CircularProgress value={data?.completion_percent ?? 0} />
              <div className="mt-6 w-full space-y-2.5">
                {[
                  { label: 'Completed', value: data?.completed_tasks ?? 0, color: '#10b981' },
                  { label: 'Remaining', value: (data?.total_tasks ?? 0) - (data?.completed_tasks ?? 0), color: '#475569' },
                  { label: 'Topics',    value: data?.total_topics ?? 0, color: '#6366f1' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-slate-500">{label}</span>
                    </div>
                    <span className="text-white font-medium tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
