// =============================================================
// StudentTable.jsx — Student Data Table Component
// Technology: React.js + Tailwind CSS
// =============================================================

import { Edit2, Trash2, Eye, GraduationCap } from 'lucide-react';

export default function StudentTable({ students = [], onEdit, onDelete, onView, loading }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="spinner"></div>
    </div>
  );

  if (!students.length) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" style={{color:'var(--text-muted)'}}>
      <GraduationCap size={48} style={{opacity:0.3}} />
      <p className="text-sm">No students found</p>
    </div>
  );

  const cgpaColor = (cgpa) => {
    if (cgpa >= 3.5) return '#4ade80';
    if (cgpa >= 3.0) return '#60a5fa';
    if (cgpa >= 2.0) return '#fbbf24';
    return '#f87171';
  };

  const statusBadge = (status) => {
    const map = { active: 'badge-green', inactive: 'badge-amber', graduated: 'badge-blue' };
    return `badge ${map[status] || 'badge-green'}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Year</th>
            <th>CGPA</th>
            <th>Status</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td><span className="font-mono text-xs badge badge-purple">{s.student_id}</span></td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                    {s.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{s.name}</span>
                </div>
              </td>
              <td><span className="text-sm">{s.department}</span></td>
              <td><span className="badge badge-blue">Year {s.year}</span></td>
              <td>
                <span className="text-sm font-bold" style={{color: cgpaColor(s.cgpa)}}>
                  {s.cgpa?.toFixed(2) || '—'}
                </span>
              </td>
              <td><span className={statusBadge(s.status)}>{s.status}</span></td>
              <td className="text-xs" style={{color:'var(--text-secondary)'}}>{s.email}</td>
              <td>
                <div className="flex items-center gap-2">
                  {onView && (
                    <button onClick={() => onView(s)} title="View"
                      className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors">
                      <Eye size={14} style={{color:'#60a5fa'}} />
                    </button>
                  )}
                  {onEdit && (
                    <button onClick={() => onEdit(s)} title="Edit"
                      className="p-1.5 rounded-lg hover:bg-green-500/20 transition-colors">
                      <Edit2 size={14} style={{color:'#4ade80'}} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(s.id)} title="Delete"
                      className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                      <Trash2 size={14} style={{color:'#f87171'}} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
