// =============================================================
// Results.jsx — Student Exam Results & CGPA Management
// Technology: React.js + Flask REST API + PyMongo (MongoDB)
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { resultsAPI, studentsAPI, coursesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ResultTable from '../components/ResultTable';
import {
  GraduationCap, Plus, Search, RefreshCw, X, Award,
  TrendingUp, CheckCircle, AlertCircle, FileSpreadsheet
} from 'lucide-react';

function AddResultModal({ onClose, onSave, students, courses }) {
  const [form, setForm] = useState({
    student_id: '',
    course_id: '',
    score: 85,
    semester: 'Fall 2024',
    exam_type: 'final',
    remarks: 'Good performance'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.course_id) {
      setError('Please select both a student and a course');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resultsAPI.addResult({
        ...form,
        score: parseFloat(form.score)
      });
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record result');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-blue-400" size={20} />
            <h2 className="text-lg font-bold">Add Student Result</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500/20">
            <X size={18} style={{ color: '#f87171' }} />
          </button>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Select Student *</label>
            <select
              className="form-input"
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              required
            >
              <option value="">-- Choose Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.student_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Select Course *</label>
            <select
              className="form-input"
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              required
            >
              <option value="">-- Choose Course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.course_code}] {c.name} ({c.credits} Credits)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Score (0 - 100) *</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                className="form-input font-bold text-emerald-400"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Exam Type</label>
              <select
                className="form-input"
                value={form.exam_type}
                onChange={(e) => setForm({ ...form, exam_type: e.target.value })}
              >
                <option value="final">Final Exam</option>
                <option value="midterm">Midterm</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Semester</label>
            <input
              type="text"
              className="form-input"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              placeholder="e.g. Fall 2024"
              required
            />
          </div>

          <div>
            <label className="form-label">Remarks</label>
            <input
              type="text"
              className="form-input"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="e.g. Excellent conceptual grasp"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 justify-center"
            >
              {loading ? 'Recording...' : 'Save Result & Recalculate CGPA'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Results() {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (examTypeFilter) params.exam_type = examTypeFilter;
      const res = await resultsAPI.getAll(params);
      setResults(res.data.results || []);
      setTotal(res.data.total || 0);
    } catch {
      setAlert({ type: 'error', text: 'Failed to fetch results from database' });
    } finally {
      setLoading(false);
    }
  }, [examTypeFilter]);

  const fetchStudentsAndCourses = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        studentsAPI.getAll({ limit: 100 }),
        coursesAPI.getAll({ limit: 100 })
      ]);
      setStudents(sRes.data.students || []);
      setCourses(cRes.data.courses || []);
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchResults();
    fetchStudentsAndCourses();
  }, [fetchResults]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this result record? CGPA will be automatically updated.')) return;
    try {
      await resultsAPI.delete(id);
      setAlert({ type: 'success', text: 'Result deleted and student CGPA updated' });
      fetchResults();
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to delete result' });
    }
  };

  // Metrics
  const avgScore = results.length
    ? (results.reduce((acc, r) => acc + (r.score || 0), 0) / results.length).toFixed(1)
    : 0;
  const passCount = results.filter((r) => (r.score || 0) >= 50).length;
  const passRate = results.length ? ((passCount / results.length) * 100).toFixed(0) : 0;
  const maxScore = results.length ? Math.max(...results.map((r) => r.score || 0)) : 0;

  const filteredResults = results.filter((r) => {
    const s = search.toLowerCase();
    return (
      !s ||
      (r.student_name && r.student_name.toLowerCase().includes(s)) ||
      (r.student_code && r.student_code.toLowerCase().includes(s)) ||
      (r.course_code && r.course_code.toLowerCase().includes(s)) ||
      (r.course_name && r.course_name.toLowerCase().includes(s))
    );
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="main-content flex-1">
        <Navbar title="Academic Results & Grading" />

        <div className="p-6 space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="stat-label">Total Exam Records</div>
                  <div className="stat-value">{total}</div>
                </div>
                <div className="stat-icon bg-blue-500/10 text-blue-400">
                  <FileSpreadsheet size={22} />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="stat-label">Average Score</div>
                  <div className="stat-value text-emerald-400">{avgScore}%</div>
                </div>
                <div className="stat-icon bg-emerald-500/10 text-emerald-400">
                  <TrendingUp size={22} />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="stat-label">Pass Rate</div>
                  <div className="stat-value text-purple-400">{passRate}%</div>
                </div>
                <div className="stat-icon bg-purple-500/10 text-purple-400">
                  <Award size={22} />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="stat-label">Highest Score</div>
                  <div className="stat-value text-amber-400">{maxScore}/100</div>
                </div>
                <div className="stat-icon bg-amber-500/10 text-amber-400">
                  <GraduationCap size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter student or course..."
                  className="form-input pl-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="form-input text-sm md:w-40"
                value={examTypeFilter}
                onChange={(e) => setExamTypeFilter(e.target.value)}
              >
                <option value="">All Exams</option>
                <option value="final">Final Exam</option>
                <option value="midterm">Midterm</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={fetchResults}
                className="btn-secondary text-sm p-2.5"
                title="Refresh Results"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary text-sm"
              >
                <Plus size={16} />
                <span>Add Result</span>
              </button>
            </div>
          </div>

          {/* Alert feedback */}
          {alert && (
            <div
              className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'} flex items-center justify-between`}
            >
              <div className="flex items-center gap-2">
                {alert.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{alert.text}</span>
              </div>
              <button onClick={() => setAlert(null)}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Result Table Container */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <GraduationCap size={18} className="text-blue-400" />
                Exam Results Records
              </h2>
              <span className="badge badge-blue">Displaying: {filteredResults.length}</span>
            </div>

            <ResultTable
              results={filteredResults}
              onDelete={handleDelete}
              loading={loading}
            />
          </div>
        </div>

        {showModal && (
          <AddResultModal
            onClose={() => setShowModal(false)}
            onSave={() => {
              setShowModal(false);
              setAlert({ type: 'success', text: 'Result recorded and CGPA updated' });
              fetchResults();
            }}
            students={students}
            courses={courses}
          />
        )}
      </div>
    </div>
  );
}
