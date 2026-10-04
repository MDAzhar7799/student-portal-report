// =============================================================
// ResultTable.jsx — Results Data Table Component
// Technology: React.js + Tailwind CSS
// =============================================================

import { Trash2, TrendingUp } from 'lucide-react';

const GRADE_COLORS = {
  'A+': '#4ade80', 'A': '#4ade80', 'A-': '#86efac',
  'B+': '#86efac', 'B': '#60a5fa', 'B-': '#93c5fd',
  'C+': '#fbbf24', 'C': '#fbbf24', 'C-': '#fb923c',
  'D': '#f97316', 'F': '#f87171'
};

export default function ResultTable({ results = [], onDelete, loading }) {
  if (loading) return <div className="flex items-center justify-center py-16"><div className="spinner"></div></div>;
  if (!results.length) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" style={{color:'var(--text-muted)'}}>
      <TrendingUp size={48} style={{opacity:0.3}} />
      <p className="text-sm">No results found</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Student ID</th>
            <th>Course</th>
            <th>Score</th>
            <th>Grade</th>
            <th>GPA Points</th>
            <th>Semester</th>
            <th>Exam Type</th>
            <th>Remarks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => {
            const gradeColor = GRADE_COLORS[r.letter_grade] || '#94a3b8';
            const scorePct = r.score;

            return (
              <tr key={r.id}>
                <td className="font-medium text-sm">{r.student_name}</td>
                <td><span className="font-mono text-xs badge badge-purple">{r.student_code}</span></td>
                <td>
                  <div className="flex flex-col">
                    <span className="text-xs badge badge-blue mb-1" style={{width:'fit-content'}}>{r.course_code}</span>
                    <span className="text-xs" style={{color:'var(--text-secondary)'}}>{r.course_name}</span>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold" style={{color: gradeColor}}>{r.score}/100</span>
                    <div className="confidence-bar w-20">
                      <div className="confidence-fill" style={{width:`${scorePct}%`, background: gradeColor}} />
                    </div>
                  </div>
                </td>
                <td>
                  <span className="text-lg font-extrabold" style={{color: gradeColor}}>{r.letter_grade}</span>
                </td>
                <td className="text-sm font-semibold" style={{color:'var(--text-secondary)'}}>{r.gpa_points?.toFixed(1)}</td>
                <td className="text-xs" style={{color:'var(--text-secondary)'}}>{r.semester}</td>
                <td>
                  <span className={`badge ${r.exam_type === 'final' ? 'badge-green' : 'badge-amber'}`}>
                    {r.exam_type}
                  </span>
                </td>
                <td className="text-xs" style={{color:'var(--text-muted)'}}>{r.remarks}</td>
                <td>
                  {onDelete && (
                    <button onClick={() => onDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                      <Trash2 size={14} style={{color:'#f87171'}} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
