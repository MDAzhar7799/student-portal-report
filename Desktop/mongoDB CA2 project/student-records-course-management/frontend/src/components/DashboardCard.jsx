// =============================================================
// DashboardCard.jsx — Stat Card Component
// Technology: React.js + Tailwind CSS
// =============================================================

export default function DashboardCard({ title, value, subtitle, icon: Icon, color = 'green', trend }) {
  const colorMap = {
    green:  { bg: 'rgba(34,197,94,0.1)',  icon: '#4ade80', glow: 'rgba(34,197,94,0.15)' },
    blue:   { bg: 'rgba(59,130,246,0.1)', icon: '#60a5fa', glow: 'rgba(59,130,246,0.15)' },
    purple: { bg: 'rgba(139,92,246,0.1)', icon: '#a78bfa', glow: 'rgba(139,92,246,0.15)' },
    amber:  { bg: 'rgba(245,158,11,0.1)', icon: '#fbbf24', glow: 'rgba(245,158,11,0.15)' },
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <div className="stat-card" style={{background:'var(--bg-card)'}}>
      {/* Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{background: c.bg, boxShadow: `0 0 20px ${c.glow}`}}>
          {Icon && <Icon size={22} style={{color: c.icon}} />}
        </div>
        {trend !== undefined && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              background: trend >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: trend >= 0 ? '#4ade80' : '#f87171'
            }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Value */}
      <div className="text-3xl font-extrabold mb-1" style={{color:'var(--text-primary)'}}>{value}</div>
      <div className="text-sm font-semibold mb-1" style={{color:'var(--text-secondary)'}}>{title}</div>
      {subtitle && <div className="text-xs" style={{color:'var(--text-muted)'}}>{subtitle}</div>}
    </div>
  );
}
