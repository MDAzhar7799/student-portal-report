// =============================================================
// CGPACalculator.jsx — CSE Student CGPA Dashboard
// Technology: React.js + Chart.js + Flask REST API + MongoDB
// Features:
//   - Multi-subject entry with Add/Remove
//   - Reappear flag per subject
//   - CGPA + TCGPA calculation
//   - Grade display per subject
//   - Dataset CSV/JSON upload for batch results
//   - ML-based grade prediction
//   - History of past calculations
// =============================================================

import { useState, useEffect, useRef, Fragment } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { cgpaAPI } from '../services/api';
import {
  Plus, Trash2, Calculator, Upload, History, TrendingUp,
  Award, BookOpen, AlertTriangle, CheckCircle, XCircle,
  BarChart2, FileSpreadsheet, Brain, RefreshCw, Eye, X,
  ChevronDown, ChevronUp, Download, Star, Zap, GraduationCap
} from 'lucide-react';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, RadialLinearScale, ArcElement, Title, Tooltip, Legend, Filler);

// ─── Constants ───────────────────────────────────────────────

const GRADE_COLORS = {
  'A+': '#4ade80', 'A': '#4ade80', 'A-': '#86efac',
  'B+': '#86efac', 'B': '#60a5fa', 'B-': '#60a5fa',
  'C+': '#fbbf24', 'C': '#fbbf24', 'C-': '#fb923c',
  'D': '#fb923c', 'F': '#f87171', 'RA': '#f87171', 'O': '#a78bfa',
};

const GRADE_BG = {
  'A+': 'rgba(74,222,128,0.15)', 'A': 'rgba(74,222,128,0.15)',
  'A-': 'rgba(134,239,172,0.15)', 'B+': 'rgba(134,239,172,0.12)',
  'B': 'rgba(96,165,250,0.15)', 'B-': 'rgba(96,165,250,0.12)',
  'C+': 'rgba(251,191,36,0.15)', 'C': 'rgba(251,191,36,0.12)',
  'C-': 'rgba(251,146,60,0.15)', 'D': 'rgba(251,146,60,0.12)',
  'F': 'rgba(248,113,113,0.15)', 'RA': 'rgba(248,113,113,0.15)',
  'O': 'rgba(167,139,250,0.15)',
};

const emptySubject = () => ({
  id: Date.now() + Math.random(),
  subject_name: '',
  credits: 3,
  total_marks: 100,
  obtained_marks: '',
  is_reappear: false,
});

// ─── Sub-components ──────────────────────────────────────────

function GradeBadge({ grade, size = 'sm' }) {
  const color = GRADE_COLORS[grade] || '#94a3b8';
  const bg = GRADE_BG[grade] || 'rgba(148,163,184,0.1)';
  const pad = size === 'lg' ? '0.5rem 1.2rem' : '0.2rem 0.65rem';
  const fs = size === 'lg' ? '1rem' : '0.75rem';
  return (
    <span style={{
      background: bg, color, border: `1px solid ${color}40`,
      padding: pad, borderRadius: 20, fontWeight: 700,
      fontSize: fs, letterSpacing: '0.03em', display: 'inline-block'
    }}>
      {grade}
    </span>
  );
}

function StatBox({ label, value, sub, color = '#4ade80', icon: Icon, glow = false }) {
  return (
    <div style={{
      background: 'rgba(17,24,39,0.85)', border: `1px solid ${color}30`,
      borderRadius: 16, padding: '1.2rem 1.4rem', position: 'relative', overflow: 'hidden',
      boxShadow: glow ? `0 0 28px ${color}25` : 'none',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{sub}</div>}
      {Icon && (
        <div style={{ position: 'absolute', top: 12, right: 14, opacity: 0.15 }}>
          <Icon size={40} color={color} />
        </div>
      )}
    </div>
  );
}

function SubjectRow({ subj, idx, onChange, onRemove, result }) {
  return (
    <div style={{
      background: subj.is_reappear ? 'rgba(248,113,113,0.05)' : 'rgba(17,24,39,0.6)',
      border: `1px solid ${subj.is_reappear ? 'rgba(248,113,113,0.25)' : 'var(--border)'}`,
      borderRadius: 12, padding: '1rem', marginBottom: 10,
      transition: 'all 0.2s ease', animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 90px 90px 90px auto', gap: 10, alignItems: 'center' }}>
        <div>
          <label className="form-label">Subject Name</label>
          <input
            className="form-input"
            placeholder="e.g. Data Structures"
            value={subj.subject_name}
            onChange={e => onChange(idx, 'subject_name', e.target.value)}
          />
        </div>
        <div>
          <label className="form-label">Credits</label>
          <input
            className="form-input"
            type="number" min="1" max="6" step="0.5"
            value={subj.credits}
            onChange={e => onChange(idx, 'credits', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="form-label">Total Marks</label>
          <input
            className="form-input"
            type="number" min="1" max="1000"
            value={subj.total_marks}
            onChange={e => onChange(idx, 'total_marks', parseFloat(e.target.value) || 100)}
          />
        </div>
        <div>
          <label className="form-label">Obtained</label>
          <input
            className="form-input"
            type="number" min="0"
            placeholder="—"
            value={subj.obtained_marks}
            disabled={subj.is_reappear}
            onChange={e => onChange(idx, 'obtained_marks', e.target.value)}
            style={subj.is_reappear ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <label className="form-label" style={{ textAlign: 'center' }}>Reappear</label>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <button
              type="button"
              onClick={() => onChange(idx, 'is_reappear', !subj.is_reappear)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: subj.is_reappear ? 'rgba(248,113,113,0.4)' : 'var(--bg-elevated)',
                border: `1px solid ${subj.is_reappear ? '#f87171' : 'var(--border-light)'}`,
                cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
              }}
              title={subj.is_reappear ? 'Mark as Normal' : 'Mark as Reappear'}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', position: 'absolute',
                top: 2, left: subj.is_reappear ? 22 : 2,
                background: subj.is_reappear ? '#f87171' : '#64748b',
                transition: 'all 0.2s ease',
              }} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button
            type="button" onClick={() => onRemove(idx)}
            className="btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
          >
            <Trash2 size={12} />
          </button>
          {result && (
            <GradeBadge grade={result.letter_grade} />
          )}
        </div>
      </div>

      {result && (
        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)',
          display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Score: <b style={{ color: '#94a3b8' }}>{result.percentage}%</b>
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            GPA: <b style={{ color: GRADE_COLORS[result.letter_grade] || '#94a3b8' }}>{result.gpa_points}</b>
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Credit Pts: <b style={{ color: '#94a3b8' }}>{result.credit_points}</b>
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            10-pt: <b style={{ color: '#a78bfa' }}>{result.grade_10} ({result.gpa_10})</b>
          </span>
          <span style={{
            fontSize: '0.72rem', padding: '0.15rem 0.6rem', borderRadius: 8,
            background: result.status === 'Pass' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
            color: result.status === 'Pass' ? '#4ade80' : '#f87171',
            border: `1px solid ${result.status === 'Pass' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
          }}>
            {result.is_reappear ? 'Reappear' : result.status === 'Pass' ? 'Pass' : 'Fail'}
          </span>
        </div>
      )}
    </div>
  );
}

function DatasetModal({ dataset, onClose }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedStudent, setExpandedStudent] = useState(null);

  if (!dataset) return null;

  const students = (dataset.student_results || []).filter(s => {
    const matches = s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
                    s.student_id?.toLowerCase().includes(search.toLowerCase());
    if (!matches) return false;
    const hasReappear = (s.reappear_count || 0) > 0 || (s.subjects || []).some(sub => sub.is_reappear);
    if (filter === 'pass') return !hasReappear;
    if (filter === 'reappear') return hasReappear;
    return true;
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 960, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>
              {dataset.batch_name}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 4 }}>
              {dataset.academic_year} • {dataset.total_students} students • Average CGPA: <b style={{ color: '#4ade80' }}>{dataset.avg_cgpa}</b>
            </p>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0.4rem 0.6rem' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            placeholder="Search student or Roll No..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, fontSize: '0.8rem' }}
          />
          <select
            className="form-input"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: 'auto', fontSize: '0.8rem' }}
          >
            <option value="all">All Students ({dataset.student_results?.length || 0})</option>
            <option value="pass">All Clear</option>
            <option value="reappear">With Backlog</option>
          </select>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, borderRadius: 10, border: '1px solid var(--border)' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px 12px' }}>Roll No</th>
                <th style={{ padding: '8px 12px' }}>Student Name</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>CGPA</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>TCPA</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No student records found.
                  </td>
                </tr>
              ) : (
                students.map((s, i) => {
                  const hasReappear = (s.reappear_count || 0) > 0 || (s.subjects || []).some(sub => sub.is_reappear);
                  const isExpanded = expandedStudent === (s.student_id || i);
                  return (
                    <Fragment key={s.student_id || i}>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: isExpanded ? 'rgba(30, 44, 82, 0.4)' : 'transparent',
                        }}
                        onClick={() => setExpandedStudent(isExpanded ? null : (s.student_id || i))}
                      >
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                          {s.student_id}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f8fafc' }}>
                          {s.student_name}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 12, fontWeight: 700, fontSize: '0.75rem',
                            background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)',
                          }}>
                            {s.cgpa}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 12, fontWeight: 700, fontSize: '0.75rem',
                            background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)',
                          }}>
                            {s.tcgpa}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {hasReappear ? (
                            <span style={{
                              padding: '2px 8px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
                              background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)',
                            }}>
                              Reappear
                            </span>
                          ) : (
                            <span style={{
                              padding: '2px 8px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
                              background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)',
                            }}>
                              Pass
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedStudent(isExpanded ? null : (s.student_id || i));
                            }}
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
                          <td colSpan="6" style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>
                              Course Subjects ({s.subjects?.length || 0})
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                              {(s.subjects || []).map((sub, j) => (
                                <div
                                  key={j}
                                  style={{
                                    padding: '8px 10px', borderRadius: 8,
                                    background: sub.is_reappear ? 'rgba(248,113,113,0.1)' : 'rgba(30, 44, 82, 0.5)',
                                    border: `1px solid ${sub.is_reappear ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.75rem' }}>{sub.subject_name}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.68rem' }}>Credits: {sub.credits}</div>
                                  </div>
                                  <div>
                                    <GradeBadge grade={sub.letter_grade} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

const TABS = ['calculator', 'results', 'datasets', 'history', 'predict'];
const TAB_CONFIG = {
  calculator: { label: 'Calculator', icon: Calculator },
  results: { label: 'Results', icon: BarChart2 },
  datasets: { label: 'Datasets', icon: FileSpreadsheet },
  history: { label: 'History', icon: History },
  predict: { label: 'ML Predict', icon: Brain },
};

export default function CGPACalculator() {
  const [tab, setTab] = useState('calculator');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [semester, setSemester] = useState('Semester 1');
  const [subjects, setSubjects] = useState([emptySubject(), emptySubject(), emptySubject()]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [datasets, setDatasets] = useState([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [batchName, setBatchName] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [viewDataset, setViewDataset] = useState(null);
  const fileRef = useRef();

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [predictForm, setPredictForm] = useState({
    attendance_pct: 80, internal_marks: 22, assignment_score: 14, mid_term_score: 32,
  });
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    if (tab === 'datasets') fetchDatasets();
    if (tab === 'history') fetchHistory();
  }, [tab]);

  const fetchDatasets = async () => {
    setDatasetsLoading(true);
    try {
      const res = await cgpaAPI.getDatasets();
      setDatasets(res.data.datasets || []);
    } catch { }
    setDatasetsLoading(false);
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await cgpaAPI.getHistory({ limit: 30 });
      setHistory(res.data.history || []);
    } catch { }
    setHistoryLoading(false);
  };

  const addSubject = () => setSubjects(prev => [...prev, emptySubject()]);

  const removeSubject = (idx) => {
    if (subjects.length <= 1) return;
    setSubjects(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSubject = (idx, field, value) => {
    setSubjects(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleCalculate = async () => {
    setError('');
    const valid = subjects.filter(s => s.subject_name.trim());
    if (!valid.length) { setError('Please enter at least one subject name.'); return; }

    for (const s of valid) {
      if (!s.is_reappear && (s.obtained_marks === '' || s.obtained_marks === undefined)) {
        setError(`Please enter obtained marks for "${s.subject_name}".`); return;
      }
      if (!s.is_reappear && parseFloat(s.obtained_marks) > parseFloat(s.total_marks)) {
        setError(`Obtained marks cannot exceed total marks for "${s.subject_name}".`); return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        student_name: studentName || 'Student',
        student_id: studentId,
        semester,
        subjects: valid.map(s => ({
          subject_name: s.subject_name,
          credits: s.credits,
          total_marks: s.total_marks,
          obtained_marks: s.is_reappear ? 0 : parseFloat(s.obtained_marks),
          is_reappear: s.is_reappear,
        })),
      };
      const res = await cgpaAPI.calculate(payload);
      setResult(res.data);
      setTab('results');
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed. Check backend connection.');
    }
    setLoading(false);
  };

  const handleFileUpload = async () => {
    if (!uploadFile) { setUploadMsg('Please select a file.'); return; }
    if (!batchName.trim()) { setUploadMsg('Please enter a batch name.'); return; }
    setUploadProgress(true);
    setUploadMsg('');
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('batch_name', batchName);
      fd.append('academic_year', academicYear);
      const res = await cgpaAPI.uploadDataset(fd);
      setUploadMsg(`${res.data.message}`);
      setUploadFile(null);
      setBatchName('');
      if (fileRef.current) fileRef.current.value = '';
      fetchDatasets();
    } catch (err) {
      setUploadMsg(`Error: ${err.response?.data?.error || 'Upload failed.'}`);
    }
    setUploadProgress(false);
  };

  const handleDeleteDataset = async (id) => {
    if (!confirm('Delete this dataset?')) return;
    try {
      await cgpaAPI.deleteDataset(id);
      setDatasets(prev => prev.filter(d => d.id !== id));
    } catch { }
  };

  const handlePredict = async () => {
    setPredicting(true);
    try {
      const res = await cgpaAPI.predict(predictForm);
      setPrediction(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Prediction failed.');
    }
    setPredicting(false);
  };

  const subjectChartData = result ? {
    labels: result.subjects.map(s => s.subject_name.length > 10 ? s.subject_name.slice(0, 10) + '…' : s.subject_name),
    datasets: [{
      label: 'GPA Points',
      data: result.subjects.map(s => s.gpa_points),
      backgroundColor: result.subjects.map(s => (GRADE_COLORS[s.letter_grade] || '#94a3b8') + '40'),
      borderColor: result.subjects.map(s => GRADE_COLORS[s.letter_grade] || '#94a3b8'),
      borderWidth: 2, borderRadius: 8,
    }]
  } : null;

  const radarData = result && result.subjects.filter(s => !s.is_reappear).length >= 3 ? {
    labels: result.subjects.filter(s => !s.is_reappear).map(s =>
      s.subject_name.length > 8 ? s.subject_name.slice(0, 8) + '.' : s.subject_name),
    datasets: [{
      label: 'Score %',
      data: result.subjects.filter(s => !s.is_reappear).map(s => s.percentage),
      backgroundColor: 'rgba(34,197,94,0.15)',
      borderColor: '#22c55e',
      borderWidth: 2,
      pointBackgroundColor: '#22c55e',
    }]
  } : null;

  const doughnutData = result ? {
    labels: ['A Grade', 'B Grade', 'C Grade', 'D Grade', 'F/RA'],
    datasets: [{
      data: [
        result.subjects.filter(s => ['A+', 'A', 'A-'].includes(s.letter_grade)).length,
        result.subjects.filter(s => ['B+', 'B', 'B-'].includes(s.letter_grade)).length,
        result.subjects.filter(s => ['C+', 'C', 'C-'].includes(s.letter_grade)).length,
        result.subjects.filter(s => s.letter_grade === 'D').length,
        result.subjects.filter(s => ['F', 'RA'].includes(s.letter_grade)).length,
      ],
      backgroundColor: ['#4ade8030', '#60a5fa30', '#fbbf2430', '#fb923c30', '#f8717130'],
      borderColor: ['#4ade80', '#60a5fa', '#fbbf24', '#fb923c', '#f87171'],
      borderWidth: 2,
    }]
  } : null;

  const chartOpts = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(30,41,59,0.5)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(30,41,59,0.5)' }, min: 0, max: 4.5 },
    },
  };

  const radarOpts = {
    responsive: true,
    scales: {
      r: {
        ticks: { color: '#64748b', backdropColor: 'transparent', stepSize: 20 },
        grid: { color: 'rgba(30,41,59,0.6)' },
        pointLabels: { color: '#94a3b8', font: { size: 10 } },
        min: 0, max: 100,
      }
    },
    plugins: { legend: { display: false } },
  };

  const sampleCSV = 'student_id,student_name,subject_name,credits,total_marks,obtained_marks,semester,is_reappear\nCSE001,Alice,Data Structures,4,100,82,Semester 3,false\nCSE001,Alice,Algorithms,3,100,78,Semester 3,false\nCSE001,Alice,OS,3,100,0,Semester 3,true\nCSE002,Bob,Data Structures,4,100,65,Semester 3,false\n';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="CGPA Calculator" />
        <div className="page-content" style={{ paddingBottom: '3rem' }}>

          {/* Hero Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 mb-5">
            <div>
              <h1 className="text-lg font-bold text-white">CGPA Calculator</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculate semester CGPA or manage batch student exam records.
              </p>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1.5 mb-5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
            {TABS.map(t => {
              const cfg = TAB_CONFIG[t];
              const Icon = cfg.icon;
              const isActive = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-slate-950' : 'text-slate-400'} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* ══ TAB: CALCULATOR ══ */}
          {tab === 'calculator' && (
            <div style={{ animation: 'fadeIn 0.35s ease' }}>
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: 20 }}>
                <h3 style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Student Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Student Name</label>
                    <input className="form-input" placeholder="e.g. John Doe"
                      value={studentName} onChange={e => setStudentName(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Roll No. / Student ID</label>
                    <input className="form-input" placeholder="e.g. CSE2021001"
                      value={studentId} onChange={e => setStudentId(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Semester</label>
                    <select className="form-input" value={semester} onChange={e => setSemester(e.target.value)}>
                      {['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Subjects ({subjects.length})
                  </h3>
                  <button className="btn-primary" onClick={addSubject} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                    <Plus size={14} /> Add Subject
                  </button>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 80px 90px 90px 90px auto',
                  gap: 10, padding: '0.4rem 0.2rem', marginBottom: 4,
                  borderBottom: '1px solid var(--border)',
                }}>
                  {['Subject Name', 'Credits', 'Total', 'Obtained', 'Reappear', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                  ))}
                </div>

                {subjects.map((s, i) => (
                  <SubjectRow
                    key={s.id}
                    subj={s} idx={i}
                    onChange={updateSubject}
                    onRemove={removeSubject}
                    result={result?.subjects?.[i]}
                  />
                ))}

                <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={13} color="#f87171" />
                  Toggle <b style={{ color: '#f87171' }}>Reappear</b> for back-exam subjects — excluded from TCGPA, counted as 0 in CGPA.
                </div>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  <XCircle size={16} /> {error}
                </div>
              )}

              <button className="btn-primary" onClick={handleCalculate}
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '1rem', borderRadius: 14 }}>
                {loading
                  ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Calculating…</>
                  : <><Calculator size={18} /> Calculate CGPA & Results</>}
              </button>
            </div>
          )}

          {/* ══ TAB: RESULTS ══ */}
          {tab === 'results' && (
            <div style={{ animation: 'fadeIn 0.35s ease' }}>
              {!result ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                  <Calculator size={60} style={{ opacity: 0.2, marginBottom: 16 }} />
                  <p>No results yet. Use the Calculator tab to compute CGPA.</p>
                  <button className="btn-primary" onClick={() => setTab('calculator')} style={{ marginTop: 16 }}>
                    Go to Calculator
                  </button>
                </div>
              ) : (
                <>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.08))',
                    border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20,
                    padding: '1.5rem 2rem', marginBottom: 20,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                  }}>
                    <div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
                        {result.student_name}
                      </h2>
                      <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        {result.student_id && `Roll: ${result.student_id} · `}{result.semester}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <GradeBadge grade={result.overall_letter} size="lg" />
                      <button className="btn-secondary" onClick={() => { setTab('calculator'); setResult(null); }}>
                        <RefreshCw size={14} /> New Calc
                      </button>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
                    <StatBox label="Current Overall CGPA (10-Pt)" value={result.cgpa_10} sub="10.0 scale • All subjects" color="#a78bfa" icon={Star} glow />
                    <StatBox label="Current Semester TCPA / TGPA" value={result.tcgpa} sub={`${result.semester || 'Current Sem'} • Valid credits`} color="#38bdf8" icon={TrendingUp} glow />
                    <StatBox label="Current Overall CGPA (4.0)" value={result.cgpa} sub="Standard 4.0 scale" color="#4ade80" icon={Award} />
                    <StatBox label="Total & Valid Credits" value={`${result.valid_credits} / ${result.total_credits}`} sub="Earned vs Total" color="#94a3b8" icon={BookOpen} />
                    <StatBox label="Overall Letter Grade" value={result.overall_letter} sub={result.reappear_count > 0 ? `${result.reappear_count} Reappear pending` : 'All Cleared'} color={result.reappear_count > 0 ? '#f87171' : '#4ade80'} icon={GraduationCap} />
                  </div>

                  {result.reappear_count > 0 && (
                    <div style={{
                      background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
                      borderRadius: 12, padding: '1rem 1.2rem', marginBottom: 20,
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ color: '#f87171', fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>
                          {result.reappear_count} Reappear Subject(s) Detected
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          Reappear subjects are counted as 0 GPA points in overall CGPA but excluded from TCGPA.
                          All other subjects show their full grade below.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subject Table */}
                  <div className="glass-card" style={{ padding: '1.5rem', marginBottom: 24 }}>
                    <h3 style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                      Subject-wise Results
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Subject</th>
                            <th>Credits</th>
                            <th>Marks</th>
                            <th>%</th>
                            <th>Grade</th>
                            <th>GPA Pts</th>
                            <th>Credit Pts</th>
                            <th>10-pt</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.subjects.map((s, i) => (
                            <tr key={i} style={{ opacity: s.is_reappear ? 0.75 : 1 }}>
                              <td style={{ color: '#64748b' }}>{i + 1}</td>
                              <td style={{ fontWeight: 600, color: '#f1f5f9' }}>
                                {s.subject_name}
                                {s.is_reappear && <span style={{ fontSize: '0.7rem', color: '#f87171', marginLeft: 6 }}>[RA]</span>}
                              </td>
                              <td>{s.credits}</td>
                              <td>{s.is_reappear ? '—' : `${s.obtained_marks}/${s.total_marks}`}</td>
                              <td style={{ color: s.is_reappear ? '#f87171' : '#94a3b8' }}>
                                {s.is_reappear ? 'RA' : `${s.percentage}%`}
                              </td>
                              <td><GradeBadge grade={s.letter_grade} /></td>
                              <td style={{ fontWeight: 700, color: GRADE_COLORS[s.letter_grade] || '#94a3b8' }}>{s.gpa_points}</td>
                              <td style={{ color: '#94a3b8' }}>{s.credit_points}</td>
                              <td style={{ color: '#a78bfa', fontWeight: 600 }}>
                                {s.is_reappear ? 'RA' : `${s.grade_10} (${s.gpa_10})`}
                              </td>
                              <td>
                                <span style={{
                                  fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 8, fontWeight: 600,
                                  background: s.status === 'Pass' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                                  color: s.status === 'Pass' ? '#4ade80' : '#f87171',
                                  border: `1px solid ${s.status === 'Pass' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                                }}>
                                  {s.status === 'Pass' ? 'Pass' : s.status === 'Reappear' ? 'Reappear' : 'Fail'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: '2px solid var(--border-light)', background: 'rgba(34,197,94,0.04)' }}>
                            <td colSpan={2} style={{ fontWeight: 700, color: '#94a3b8' }}>TOTALS / CGPA</td>
                            <td style={{ fontWeight: 700, color: '#4ade80' }}>{result.total_credits}</td>
                            <td>—</td><td>—</td>
                            <td><GradeBadge grade={result.overall_letter} /></td>
                            <td style={{ fontWeight: 800, color: '#4ade80', fontSize: '1.05rem' }}>{result.cgpa}</td>
                            <td style={{ fontWeight: 700, color: '#94a3b8' }}>{result.total_credit_points}</td>
                            <td style={{ fontWeight: 700, color: '#a78bfa' }}>{result.cgpa_10}</td>
                            <td style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700 }}>
                              {result.pass_count}P / {result.fail_count}F / {result.reappear_count}RA
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Charts */}
                  <div style={{ display: 'grid', gridTemplateColumns: radarData ? '1fr 1fr 280px' : '1fr 280px', gap: 16, marginBottom: 24 }}>
                    {subjectChartData && (
                      <div className="glass-card" style={{ padding: '1.2rem' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>GPA by Subject</h4>
                        <Bar data={subjectChartData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } } }} height={180} />
                      </div>
                    )}
                    {radarData && (
                      <div className="glass-card" style={{ padding: '1.2rem' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>Score Radar</h4>
                        <Radar data={radarData} options={radarOpts} height={180} />
                      </div>
                    )}
                    {doughnutData && (
                      <div className="glass-card" style={{ padding: '1.2rem' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>Grade Spread</h4>
                        <Doughnut data={doughnutData} options={{
                          responsive: true, cutout: '65%',
                          plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 } } }
                        }} />
                      </div>
                    )}
                  </div>

                  {/* CGPA Summary Footer */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.06))',
                    border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, padding: '1.5rem',
                    display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
                  }}>
                    {[
                      { label: 'CGPA', value: result.cgpa, max: '4.0', color: '#4ade80' },
                      { label: 'TCGPA', value: result.tcgpa, max: '4.0', color: '#60a5fa' },
                      { label: '10-pt CGPA', value: result.cgpa_10, max: '10.0', color: '#a78bfa' },
                    ].map(({ label, value, max, color }) => (
                      <div key={label} style={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                        <div style={{ fontSize: '2.8rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>out of {max}</div>
                      </div>
                    ))}
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                          ['Subjects', result.subjects.length, '#94a3b8'],
                          ['Pass', result.pass_count, '#4ade80'],
                          ['Reappear', result.reappear_count, '#f87171'],
                          ['Percentage', `${result.overall_percentage}%`, '#fbbf24'],
                        ].map(([k, v, c]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{k}</span>
                            <span style={{ fontWeight: 700, color: c }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ TAB: DATASETS ══ */}
          {tab === 'datasets' && (
            <div style={{ animation: 'fadeIn 0.35s ease' }}>
              <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: 20 }}>
                <h3 style={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>
                  Upload Results File
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: 14 }}>
                  Upload CSV or JSON marksheet to process batch CGPA.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label className="form-label">Batch Name</label>
                    <input className="form-input" placeholder="e.g. CSE Semester 6"
                      value={batchName} onChange={e => setBatchName(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Academic Year</label>
                    <input className="form-input" placeholder="e.g. 2024-25"
                      value={academicYear} onChange={e => setAcademicYear(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Results File</label>
                    <input ref={fileRef} type="file" accept=".csv,.json"
                      onChange={e => setUploadFile(e.target.files[0])}
                      style={{ display: 'none' }} />
                    <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}
                      style={{ width: '100%', justifyContent: 'center', height: '38px', fontSize: '0.8rem' }}>
                      <FileSpreadsheet size={14} className="text-emerald-400" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {uploadFile ? uploadFile.name : 'Select file'}
                      </span>
                    </button>
                  </div>
                </div>

                {uploadMsg && (
                  <div className={`alert ${uploadMsg.startsWith('Error') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 12 }}>
                    {uploadMsg}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <a
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent(sampleCSV)}`}
                    download="cgpa_template.csv"
                    className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                    <Download size={14} /> Download Template
                  </a>
                  <button className="btn-primary" onClick={handleFileUpload} disabled={uploadProgress} style={{ fontSize: '0.8rem' }}>
                    {uploadProgress
                      ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</>
                      : <><Upload size={14} /> Upload Dataset</>}
                  </button>
                </div>
              </div>

              <h3 style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                Saved Datasets ({datasets.length})
              </h3>
              {datasetsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: 36, height: 36 }} />
                </div>
              ) : datasets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <FileSpreadsheet size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <p>No datasets uploaded yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {datasets.map(d => (
                    <div key={d.id} className="glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.92rem', lineHeight: 1.3 }}>{d.batch_name}</div>
                          <button className="btn-danger" onClick={() => handleDeleteDataset(d.id)} style={{ padding: '0.3rem 0.5rem', marginLeft: 8 }} title="Delete dataset">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 12 }}>
                          {d.academic_year} • {d.filename}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                          <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(30, 44, 82, 0.4)', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Students</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>{d.total_students}</div>
                          </div>
                          <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(30, 44, 82, 0.4)', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Avg CGPA</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80' }}>{d.avg_cgpa}</div>
                          </div>
                        </div>
                      </div>
                      <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
                        onClick={async () => {
                          try {
                            const res = await cgpaAPI.getDataset(d.id);
                            setViewDataset(res.data);
                          } catch { }
                        }}>
                        <Eye size={13} /> View Results
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: HISTORY ══ */}
          {tab === 'history' && (
            <div style={{ animation: 'fadeIn 0.35s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Calculation History ({history.length})
                </h3>
                <button className="btn-secondary" onClick={fetchHistory} style={{ fontSize: '0.8rem' }}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
              {historyLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: 36, height: 36 }} />
                </div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <History size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <p>No calculation history yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Roll/ID</th>
                        <th>Semester</th>
                        <th>CGPA</th>
                        <th>TCGPA</th>
                        <th>10-pt CGPA</th>
                        <th>Grade</th>
                        <th>Credits</th>
                        <th>Reappear</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={h.id || i}>
                          <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{h.student_name}</td>
                          <td style={{ color: '#64748b' }}>{h.student_id || '—'}</td>
                          <td style={{ color: '#94a3b8' }}>{h.semester}</td>
                          <td style={{ fontWeight: 700, color: '#4ade80' }}>{h.cgpa}</td>
                          <td style={{ fontWeight: 700, color: '#60a5fa' }}>{h.tcgpa}</td>
                          <td style={{ fontWeight: 700, color: '#a78bfa' }}>{h.cgpa_10}</td>
                          <td><GradeBadge grade={h.overall_letter} /></td>
                          <td style={{ color: '#94a3b8' }}>{h.total_credits}</td>
                          <td>
                            {h.reappear_count > 0
                              ? <span style={{ color: '#f87171', fontWeight: 600 }}>{h.reappear_count}</span>
                              : <span style={{ color: '#4ade80' }}>0</span>}
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.78rem' }}>
                            {new Date(h.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: ML PREDICT ══ */}
          {tab === 'predict' && (
            <div style={{ animation: 'fadeIn 0.35s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.2))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Brain size={20} color="#a78bfa" />
                    </div>
                    <div>
                      <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem' }}>ML Grade Predictor</h3>
                      <p style={{ color: '#64748b', fontSize: '0.75rem' }}>scikit-learn Linear Regression model</p>
                    </div>
                  </div>

                  {[
                    { key: 'attendance_pct', label: 'Attendance', min: 0, max: 100, unit: '%' },
                    { key: 'internal_marks', label: 'Internal Marks', min: 0, max: 30, unit: '/30' },
                    { key: 'assignment_score', label: 'Assignments', min: 0, max: 20, unit: '/20' },
                    { key: 'mid_term_score', label: 'Mid-Term', min: 0, max: 50, unit: '/50' },
                  ].map(field => (
                    <div key={field.key} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>{field.label}</label>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4ade80' }}>
                          {predictForm[field.key]}{field.unit}
                        </span>
                      </div>
                      <input
                        type="range" min={field.min} max={field.max} step={1}
                        value={predictForm[field.key]}
                        onChange={e => setPredictForm(prev => ({ ...prev, [field.key]: parseInt(e.target.value) }))}
                        style={{ width: '100%', accentColor: '#22c55e', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569', marginTop: 2 }}>
                        <span>{field.min}</span><span>{field.max}{field.unit}</span>
                      </div>
                    </div>
                  ))}

                  <button className="btn-primary" onClick={handlePredict} disabled={predicting}
                    style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}>
                    {predicting
                      ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Predicting…</>
                      : <><Zap size={16} /> Predict Grade</>}
                  </button>
                </div>

                <div>
                  {!prediction ? (
                    <div className="glass-card" style={{
                      padding: '3rem', textAlign: 'center', height: '100%',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Brain size={60} style={{ opacity: 0.15, marginBottom: 16 }} />
                      <p style={{ color: '#64748b' }}>Adjust sliders and click <b>Predict Grade</b></p>
                      <p style={{ color: '#475569', fontSize: '0.78rem', marginTop: 8 }}>
                        Uses scikit-learn Linear Regression with attendance, internals, assignments & mid-term inputs
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08))',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: 20, padding: '2rem 2rem 1.5rem', textAlign: 'center',
                        boxShadow: '0 0 30px rgba(139,92,246,0.12)',
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                          Predicted Final Score
                        </div>
                        <div style={{ fontSize: '4rem', fontWeight: 900, color: '#a78bfa', lineHeight: 1, marginBottom: 12 }}>
                          {prediction.predicted_score}%
                        </div>
                        <GradeBadge grade={prediction.predicted_grade} size="lg" />
                        <div style={{ marginTop: 12, fontSize: '0.85rem', color: '#64748b' }}>
                          GPA Points: <span style={{ fontWeight: 700, color: '#4ade80' }}>{prediction.predicted_gpa}</span>
                        </div>
                      </div>

                      {/* Score Bar */}
                      <div className="glass-card" style={{ padding: '1.2rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>Predicted Score Range</div>
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 8, transition: 'width 0.8s ease',
                            width: `${prediction.predicted_score}%`,
                            background: `linear-gradient(90deg, #22c55e, ${GRADE_COLORS[prediction.predicted_grade] || '#60a5fa'})`,
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#475569', marginTop: 4 }}>
                          <span>0%</span><span style={{ color: '#a78bfa', fontWeight: 600 }}>{prediction.predicted_score}%</span><span>100%</span>
                        </div>
                      </div>

                      <div className="glass-card" style={{ padding: '1.2rem' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                          <Brain size={15} color="#a78bfa" />
                          <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.82rem' }}>Model Details</span>
                        </div>
                        {[
                          ['Model', prediction.model],
                          ['Confidence', prediction.confidence],
                          ['Features', '4 (attendance, internal, assignment, midterm)'],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{k}</span>
                            <span style={{ color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 500 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {viewDataset && <DatasetModal dataset={viewDataset} onClose={() => setViewDataset(null)} />}
    </div>
  );
}
