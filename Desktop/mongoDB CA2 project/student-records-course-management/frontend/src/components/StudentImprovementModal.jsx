// =============================================================
// StudentImprovementModal.jsx — Clean & Simple Student Recovery Plan
// =============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, BookOpen, CheckCircle } from 'lucide-react';

export default function StudentImprovementModal({ student, initialSubject, onClose }) {
  const navigate = useNavigate();

  // Only show subjects that have a reappear or low score
  const failedSubjects = (student.subjects || []).filter(
    (s) => s.is_reappear || (s.obtained_marks !== undefined && s.obtained_marks < 40)
  );

  const displaySubjects = failedSubjects.length > 0 ? failedSubjects : (student.subjects || []);

  const [selectedSubjName, setSelectedSubjName] = useState(
    initialSubject?.subject_name || displaySubjects[0]?.subject_name || ''
  );

  const activeSubj =
    displaySubjects.find((s) => s.subject_name === selectedSubjName) || displaySubjects[0] || {};

  // Simple target score (default 70)
  const [targetMarks, setTargetMarks] = useState(70);

  // Simple predicted CGPA calculation
  const subjectsList = student.subjects || [];
  const currentTotalCredits = subjectsList.reduce((acc, s) => acc + (s.credits || 3), 0) || 1;

  const targetPoint = targetMarks >= 80 ? 9.0 : targetMarks >= 70 ? 8.0 : targetMarks >= 60 ? 7.0 : 6.0;

  const simulatedWeightedSum = subjectsList.reduce((acc, s) => {
    const cred = s.credits || 3;
    if (s.subject_name === activeSubj.subject_name) {
      return acc + targetPoint * cred;
    }
    const existingPts = s.is_reappear ? 0 : Math.max(0, (s.obtained_marks || 60) / 10);
    return acc + existingPts * cred;
  }, 0);

  const newCGPA = (simulatedWeightedSum / currentTotalCredits).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-card w-full max-w-md p-6 border border-slate-700/80 shadow-2xl bg-slate-900 text-slate-200 rounded-2xl">
        
        {/* Simple Header */}
        <div className="flex items-start justify-between pb-3 mb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="text-base font-bold text-white">Improvement Plan</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {student.student_name} • <span className="text-amber-300 font-semibold">{activeSubj.subject_name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* If student has multiple backlogs, let them pick cleanly */}
        {displaySubjects.length > 1 && (
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Subject:
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {displaySubjects.map((s) => (
                <button
                  key={s.subject_name}
                  type="button"
                  onClick={() => setSelectedSubjName(s.subject_name)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                    s.subject_name === activeSubj.subject_name
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {s.subject_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Target Score & Simple Outcome */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-300 font-semibold">Target Marks</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">{targetMarks} / 100</span>
          </div>

          <input
            type="range"
            min="45"
            max="95"
            step="5"
            value={targetMarks}
            onChange={(e) => setTargetMarks(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg mb-3"
          />

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400">Predicted Result:</span>
            <span className="font-semibold text-white">
              CGPA <b className="text-emerald-400 text-sm">{newCGPA}</b> (Passed)
            </span>
          </div>
        </div>

        {/* 3 Simple Action Steps */}
        <div className="space-y-2 mb-6 text-xs">
          <div className="flex items-start gap-2.5 text-slate-300">
            <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>Practice previous year questions from this subject</span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-300">
            <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>Revise core formulas and high-scoring units</span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-300">
            <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>Take online practice test before the re-exam</span>
          </div>
        </div>

        {/* Clean Bottom Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/mcq-practice');
            }}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 transition"
          >
            <BookOpen size={14} />
            Practice Exam
          </button>
        </div>

      </div>
    </div>
  );
}
