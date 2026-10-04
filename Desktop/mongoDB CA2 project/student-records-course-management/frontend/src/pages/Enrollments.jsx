// =============================================================
// Enrollments.jsx — Course Enrollment Management Page
// Technology: React.js + Flask REST API + PyMongo (MongoDB)
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { enrollmentsAPI, studentsAPI, coursesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Plus, Trash2, Search, RefreshCw, X, ClipboardList, CheckCircle, AlertCircle } from 'lucide-react';

function EnrollModal({ onClose, onSave, students, courses }) {
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState('Fall 2024');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId || !courseId) {
      setError('Please select both a student and a course');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await enrollmentsAPI.enroll({
        student_id: studentId,
        course_id: courseId,
        semester,
      });
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-green-400" size={20} />
            <h2 className="text-lg font-bold">Enroll Student in Course</h2>
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
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            >
              <option value="">-- Choose a Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.student_id}) — {s.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Select Course *</label>
            <select
              className="form-input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
            >
              <option value="">-- Choose a Course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.course_code}] {c.name} ({c.credits} cr) — {c.enrolled_count || 0}/{c.max_students}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Semester</label>
            <input
              type="text"
              className="form-input"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="e.g. Fall 2024, Spring 2025"
              required
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 justify-center"
            >
              {loading ? 'Enrolling...' : 'Confirm Enrollment'}
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

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await enrollmentsAPI.getAll({ page, limit: 15 });
      setEnrollments(res.data.enrollments || []);
      setTotal(res.data.total || 0);
    } catch {
      setAlert({ type: 'error', text: 'Failed to fetch enrollments from MongoDB' });
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchStudentsAndCourses = async () => {
    try {
      const [stuRes, crsRes] = await Promise.all([
        studentsAPI.getAll({ limit: 100 }),
        coursesAPI.getAll({ limit: 100 }),
      ]);
      setStudents(stuRes.data.students || []);
      setCourses(crsRes.data.courses || []);
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchEnrollments();
    fetchStudentsAndCourses();
  }, [fetchEnrollments]);

  const handleDrop = async (id, studentName, courseCode) => {
    if (!window.confirm(`Are you sure you want to drop ${studentName} from ${courseCode}?`)) return;
    try {
      await enrollmentsAPI.drop(id);
      setAlert({ type: 'success', text: `Successfully dropped enrollment` });
      fetchEnrollments();
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Drop failed' });
    }
  };

  const filteredEnrollments = enrollments.filter((e) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      (e.student_name && e.student_name.toLowerCase().includes(s)) ||
      (e.student_code && e.student_code.toLowerCase().includes(s)) ||
      (e.course_code && e.course_code.toLowerCase().includes(s)) ||
      (e.course_name && e.course_name.toLowerCase().includes(s));
    const matchesStatus = !statusFilter || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="main-content flex-1">
        <Navbar title="Enrollment Management" />

        <div className="p-6 space-y-6">
          {/* Header Action Bar */}
          <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student or course..."
                  className="form-input pl-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="form-input text-sm md:w-40"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="enrolled">Enrolled</option>
                <option value="dropped">Dropped</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={fetchEnrollments}
                className="btn-secondary text-sm p-2.5"
                title="Refresh from MongoDB"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary text-sm"
              >
                <Plus size={16} />
                <span>Enroll Student</span>
              </button>
            </div>
          </div>

          {/* Feedback Alert */}
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

          {/* Enrollments Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-emerald-400" />
                Enrollments List
              </h2>
              <span className="badge badge-purple">Total: {total}</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="spinner"></div>
              </div>
            ) : filteredEnrollments.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                <p>No enrollments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Course</th>
                      <th>Semester</th>
                      <th>Status</th>
                      <th>Enrolled Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnrollments.map((enr) => (
                      <tr key={enr.id}>
                        <td className="font-medium text-white">{enr.student_name}</td>
                        <td>
                          <span className="font-mono text-xs badge badge-purple">
                            {enr.student_code}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="text-xs badge badge-blue mb-1 w-fit">
                              {enr.course_code}
                            </span>
                            <span className="text-xs text-slate-400">{enr.course_name}</span>
                          </div>
                        </td>
                        <td className="text-xs text-slate-300">{enr.semester}</td>
                        <td>
                          <span
                            className={`badge ${
                              enr.status === 'enrolled'
                                ? 'badge-green'
                                : enr.status === 'dropped'
                                ? 'badge-amber'
                                : 'badge-blue'
                            }`}
                          >
                            {enr.status}
                          </span>
                        </td>
                        <td className="text-xs text-slate-400">
                          {enr.enrolled_at ? new Date(enr.enrolled_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          {enr.status === 'enrolled' && (
                            <button
                              onClick={() => handleDrop(enr.id, enr.student_name, enr.course_code)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Drop Student"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <EnrollModal
            onClose={() => setShowModal(false)}
            onSave={() => {
              setShowModal(false);
              setAlert({ type: 'success', text: 'Student enrolled successfully' });
              fetchEnrollments();
            }}
            students={students}
            courses={courses}
          />
        )}
      </div>
    </div>
  );
}
