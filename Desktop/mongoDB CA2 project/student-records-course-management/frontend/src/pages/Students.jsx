// =============================================================
// Students.jsx — Student Management Page
// Technology: React.js + Flask REST API + PyMongo (MongoDB)
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { studentsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StudentTable from '../components/StudentTable';
import { Plus, Search, Filter, RefreshCw, X } from 'lucide-react';

const DEPARTMENTS = ['Computer Science','Mathematics','Physics','Engineering','Chemistry','Biology'];

function StudentModal({ student, onClose, onSave }) {
  const [form, setForm] = useState(student || {
    student_id:'', name:'', email:'', phone:'', department:'Computer Science',
    year:1, gender:'', address:'', date_of_birth:''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (student?.id) {
        await studentsAPI.update(student.id, form);
      } else {
        await studentsAPI.create(form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{student?.id ? 'Edit Student' : 'Add New Student'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500/20"><X size={18} style={{color:'#f87171'}} /></button>
        </div>
        {error && <div className="alert alert-error mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Student ID</label><input className="form-input" value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})} placeholder="STU001" required /></div>
            <div><label className="form-label">Full Name</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="John Doe" required /></div>
            <div><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /></div>
            <div><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
            <div><label className="form-label">Department</label>
              <select className="form-input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="form-label">Year</label>
              <select className="form-input" value={form.year} onChange={e=>setForm({...form,year:parseInt(e.target.value)})}>
                {[1,2,3,4,5].map(y=><option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div><label className="form-label">Gender</label>
              <select className="form-input" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})} /></div>
          </div>
          <div><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Saving...' : student?.id ? 'Update Student' : 'Add Student'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentsAPI.getAll({ page, limit:10, search, department:dept });
      setStudents(res.data.students);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  }, [page, search, dept]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this student? This will also remove their enrollments and results.')) return;
    try { await studentsAPI.delete(id); fetchStudents(); } catch (err) { alert(err.response?.data?.error || 'Delete failed'); }
  };

  const handleEdit = (s) => { setEditStudent(s); setShowModal(true); };
  const handleAdd = () => { setEditStudent(null); setShowModal(true); };
  const handleSave = () => { setShowModal(false); setEditStudent(null); fetchStudents(); };

  const pages = Math.ceil(total / 10);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Student Management" />
        <div className="page-content">

          <div className="section-header">
            <div>
              <h2 className="section-title">Students</h2>
              <p className="text-sm" style={{color:'var(--text-muted)'}}>
                MongoDB: <span style={{color:'#4ade80',fontFamily:'monospace'}}>db.students.find()</span> | PyMongo CRUD
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="search-bar">
                <Search size={14} className="search-icon" />
                <input placeholder="Search students..." value={search}
                  onChange={e=>{setSearch(e.target.value);setPage(1);}} />
              </div>
              <select className="form-input" style={{width:'auto'}} value={dept} onChange={e=>{setDept(e.target.value);setPage(1);}}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={fetchStudents} className="btn-secondary p-2"><RefreshCw size={16} /></button>
              <button onClick={handleAdd} className="btn-primary"><Plus size={16} /> Add Student</button>
            </div>
          </div>

          <div className="glass-card">
            <div className="p-4 border-b" style={{borderColor:'var(--border)'}}>
              <span className="text-sm" style={{color:'var(--text-muted)'}}>
                {total} student{total !== 1 ? 's' : ''} found
              </span>
            </div>
            <StudentTable students={students} onEdit={handleEdit} onDelete={handleDelete} loading={loading} />
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="pagination">
              {[...Array(pages)].map((_, i) => (
                <button key={i} className={`page-btn ${page === i+1 ? 'active' : ''}`}
                  onClick={() => setPage(i+1)}>{i+1}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <StudentModal student={editStudent} onClose={() => { setShowModal(false); setEditStudent(null); }} onSave={handleSave} />
      )}
    </div>
  );
}
