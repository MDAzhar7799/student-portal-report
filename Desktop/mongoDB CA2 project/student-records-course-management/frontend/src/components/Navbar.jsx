// =============================================================
// Navbar.jsx — Top Navigation Bar Component
// =============================================================

export default function Navbar({ title = 'Dashboard' }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <header className="navbar">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        <span className="badge badge-green text-[10px]">Online</span>
      </div>

      <div className="flex items-center gap-3">
        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {(user.username || 'A')[0].toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-white leading-tight">{user.username || 'Admin'}</div>
            <div className="text-[10px] text-slate-400 capitalize leading-tight">{user.role || 'student'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
