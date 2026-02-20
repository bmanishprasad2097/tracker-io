interface ProgressBarProps {
  value: number;
  color?: string;
  size?: 'sm' | 'md';
}

export default function ProgressBar({ value, color = '#6366f1', size = 'md' }: ProgressBarProps) {
  const height = size === 'sm' ? 'h-1' : 'h-1.5';
  return (
    <div className={`w-full bg-white/10 rounded-full overflow-hidden ${height}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}
