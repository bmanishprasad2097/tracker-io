interface ProgressBarProps {
  value: number;
  color?: string;
  size?: 'sm' | 'md';
  glow?: boolean;
}

export default function ProgressBar({ value, color = '#6366f1', size = 'md', glow = false }: ProgressBarProps) {
  const height   = size === 'sm' ? 'h-[3px]' : 'h-[5px]';
  const pct      = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`w-full rounded-full overflow-hidden ${height}`}
      style={{ background: `${color}18` }}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          boxShadow: glow && pct > 0 ? `0 0 8px ${color}80` : undefined,
        }}
      />
    </div>
  );
}
