// =============================================================
// CourseTable.jsx — Course Data Table Component
// Technology: React.js + Tailwind CSS
// =============================================================

import { Edit2, Trash2, BookOpen } from 'lucide-react';

export default function CourseTable({ courses = [], onEdit, onDelete, loading }) {
  if (loading) return <div className="flex items-center justify-center py-16"><div className="spinner"></div></div>;
  if (!courses.length) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" style={{color:'var(--text-muted)'}}>
      <BookOpen size={48} style={{opacity:0.3}} />
      <p className="text-sm">No courses found</p>
    </div>
  );

  const capacityColor = (enrolled, max) => {
    const pct = (enrolled / max) * 100;
    if (pct >= 90) return '#f87171';
    if (pct >= 70) return '#fbbf24';
    return '#4ade80';
  };

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Course Name</th>
            <th>Department</th>
            <th>Credits</th>
            <th>Instructor</th>
            <th>Enrollment</th>
            <th>Semester</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map(c => (
            <tr key={c.id}>
              <td><span className="font-mono text-xs badge badge-blue">{c.course_code}</span></td>
              <td className="font-medium text-sm">{c.name}</td>
              <td className="text-sm" style={{color:'var(--text-secondary)'}}>{c.department}</td>
              <td><span className="badge badge-purple">{c.credits} cr</span></td>
              <td className="text-xs" style={{color:'var(--text-secondary)'}}>{c.instructor}</td>
              <td>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{color: capacityColor(c.enrolled_count, c.max_students)}}>
                    {c.enrolled_count}/{c.max_students}
                  </span>
                  <div className="confidence-bar w-16">
                    <div className="confidence-fill" style={{
                      width: `${Math.min((c.enrolled_count/c.max_students)*100, 100)}%`,
                      background: capacityColor(c.enrolled_count, c.max_students)
                    }} />
                  </div>
                </div>
              </td>
              <td className="text-xs" style={{color:'var(--text-secondary)'}}>{c.semester}</td>
              <td><span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-amber'}`}>{c.status}</span></td>
              <td>
                <div className="flex items-center gap-2">
                  {onEdit && <button onClick={() => onEdit(c)} className="p-1.5 rounded-lg hover:bg-green-500/20 transition-colors"><Edit2 size={14} style={{color:'#4ade80'}} /></button>}
                  {onDelete && <button onClick={() => onDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"><Trash2 size={14} style={{color:'#f87171'}} /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
