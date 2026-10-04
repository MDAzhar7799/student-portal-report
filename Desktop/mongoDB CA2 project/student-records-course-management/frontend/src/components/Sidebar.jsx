// =============================================================
// Sidebar.jsx — Navigation Sidebar Component
// Technology: React.js + Tailwind CSS + lucide-react
// =============================================================

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  BarChart3, ScanLine, GraduationCap, LogOut, Database, BookMarked, Calculator
} from 'lucide-react';

const navLinks = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Results' },
  { to: '/cgpa-calculator', icon: Calculator,       label: 'CGPA Calculator' },
  { to: '/mcq-practice',    icon: BookMarked,       label: 'OMR Practice' },
];


export default function Sidebar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
            <Database size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Student Portal</div>
            <div className="text-xs text-slate-400">Academic Records</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-3"
          style={{color:'var(--text-muted)'}}>Menu</div>
        {navLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info + Logout */}
      <div style={{padding:'1rem',borderTop:'1px solid var(--border)'}}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {(user.username || 'A')[0].toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{user.username || 'Admin'}</div>
            <div className="text-xs capitalize" style={{color:'var(--text-muted)'}}>{user.role || 'admin'}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-secondary w-full text-sm justify-center">
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </aside>
  );
}
