// =============================================================
// Courses.jsx — Course Management Page
// Technology: React.js + Flask REST API + PyMongo (MongoDB)
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { coursesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import CourseTable from '../components/CourseTable';
import { Plus, Search, RefreshCw, X, BookOpen } from 'lucide-react';

function CourseModal({ course, onClose, onSave }) {
  const [form, setForm] = useState(course || {
    course_code:'', name:'', description:'', credits:3,
    department:'Computer Science', instructor:'', semester:'', max_students:30
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (course?.id) await coursesAPI.update(course.id, form);
      else await coursesAPI.create(form);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{course?.id ? 'Edit Course' : 'Add New Course'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500/20"><X size={18} style={{color:'#f87171'}} /></button>
        </div>
        {error && <div className="alert alert-error mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Course Code</label><input className="form-input" value={form.course_code} onChange={e=>setForm({...form,course_code:e.target.value.toUpperCase()})} placeholder="CS101" required /></div>
            <div><label className="form-label">Credits</label><input className="form-input" type="number" min="1" max="6" value={form.credits} onChange={e=>setForm({...form,credits:parseInt(e.target.value)})} required /></div>
          </div>
          <div><label className="form-label">Course Name</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
          <div><label className="form-label">Description</label><textarea className="form-input" rows="2" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Department</label>
              <select className="form-input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>
                {['Computer Science','Mathematics','Physics','Engineering','Chemistry','Biology'].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="form-label">Max Students</label><input className="form-input" type="number" min="1" value={form.max_students} onChange={e=>setForm({...form,max_students:parseInt(e.target.value)})} /></div>
            <div><label className="form-label">Instructor</label><input className="form-input" value={form.instructor} onChange={e=>setForm({...form,instructor:e.target.value})} /></div>
            <div><label className="form-label">Semester</label><input className="form-input" value={form.semester} onChange={e=>setForm({...form,semester:e.target.value})} placeholder="Fall 2024" /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Saving...' : course?.id ? 'Update' : 'Add Course'}</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await coursesAPI.getAll({ page, limit:10, search });
      setCourses(res.data.courses);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this course? All enrollments will be removed.')) return;
    try { await coursesAPI.delete(id); fetchCourses(); } catch (err) { alert(err.response?.data?.error || 'Delete failed'); }
  };

  const pages = Math.ceil(total / 10);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Course Management" />
        <div className="page-content">
          <div className="section-header">
            <div>
              <h2 className="section-title">Courses</h2>
              <p className="text-sm" style={{color:'var(--text-muted)'}}>
                MongoDB: <span style={{color:'#4ade80',fontFamily:'monospace'}}>db.courses.find()</span> | PyMongo CRUD
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="search-bar">
                <Search size={14} className="search-icon" />
                <input placeholder="Search courses..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
              </div>
              <button onClick={fetchCourses} className="btn-secondary p-2"><RefreshCw size={16} /></button>
              <button onClick={() => { setEditCourse(null); setShowModal(true); }} className="btn-primary"><Plus size={16} /> Add Course</button>
            </div>
          </div>

          <div className="glass-card">
            <div className="p-4 border-b" style={{borderColor:'var(--border)'}}>
              <span className="text-sm" style={{color:'var(--text-muted)'}}>{total} course{total !== 1 ? 's' : ''} found</span>
            </div>
            <CourseTable courses={courses} onEdit={c => { setEditCourse(c); setShowModal(true); }} onDelete={handleDelete} loading={loading} />
          </div>

          {pages > 1 && (
            <div className="pagination">
              {[...Array(pages)].map((_, i) => (
                <button key={i} className={`page-btn ${page === i+1 ? 'active' : ''}`} onClick={() => setPage(i+1)}>{i+1}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      {showModal && <CourseModal course={editCourse} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchCourses(); }} />}
    </div>
  );
}
