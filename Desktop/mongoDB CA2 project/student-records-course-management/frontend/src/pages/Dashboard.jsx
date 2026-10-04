// =============================================================
// Dashboard.jsx — Page 1: Academic Dataset Upload & Results Hub
// Technology: React.js + Chart.js + Flask REST API + MongoDB
// =============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cgpaAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import {
  Upload, FileSpreadsheet, Download, RefreshCw, CheckCircle2,
  AlertCircle, Search, Eye, Trash2, Award, Users, TrendingUp,
  BarChart3, Calculator, BookMarked, Sparkles, X,
  GraduationCap, CheckCircle, AlertTriangle, Printer, Play, FileText, CheckCheck
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  ArcElement, Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, ArcElement, Title, Tooltip, Legend);

const SAMPLE_CSV_DATA = `student_id,student_name,subject_name,credits,total_marks,obtained_marks,semester,is_reappear
CSE2021001,Aarav Sharma,Data Structures & Algorithms,4,100,88,Semester 6,false
CSE2021001,Aarav Sharma,Database Management Systems,4,100,82,Semester 6,false
CSE2021001,Aarav Sharma,Computer Networks,3,100,79,Semester 6,false
CSE2021001,Aarav Sharma,Operating Systems,3,100,85,Semester 6,false
CSE2021001,Aarav Sharma,Machine Learning,3,100,91,Semester 6,false
CSE2021002,Priya Patel,Data Structures & Algorithms,4,100,74,Semester 6,false
CSE2021002,Priya Patel,Database Management Systems,4,100,70,Semester 6,false
CSE2021002,Priya Patel,Computer Networks,3,100,68,Semester 6,false
CSE2021002,Priya Patel,Operating Systems,3,100,0,Semester 6,true
CSE2021002,Priya Patel,Machine Learning,3,100,75,Semester 6,false
CSE2021003,Rohan Verma,Data Structures & Algorithms,4,100,94,Semester 6,false
CSE2021003,Rohan Verma,Database Management Systems,4,100,90,Semester 6,false
CSE2021003,Rohan Verma,Computer Networks,3,100,88,Semester 6,false
CSE2021003,Rohan Verma,Operating Systems,3,100,92,Semester 6,false
CSE2021003,Rohan Verma,Machine Learning,3,100,96,Semester 6,false
CSE2021004,Ananya Iyer,Data Structures & Algorithms,4,100,62,Semester 6,false
CSE2021004,Ananya Iyer,Database Management Systems,4,100,65,Semester 6,false
CSE2021004,Ananya Iyer,Computer Networks,3,100,58,Semester 6,false
CSE2021004,Ananya Iyer,Operating Systems,3,100,61,Semester 6,false
CSE2021004,Ananya Iyer,Machine Learning,3,100,67,Semester 6,false
CSE2021005,Vikram Singh,Data Structures & Algorithms,4,100,80,Semester 6,false
CSE2021005,Vikram Singh,Database Management Systems,4,100,78,Semester 6,false
CSE2021005,Vikram Singh,Computer Networks,3,100,0,Semester 6,true
CSE2021005,Vikram Singh,Operating Systems,3,100,72,Semester 6,false
CSE2021005,Vikram Singh,Machine Learning,3,100,81,Semester 6,false
CSE2021006,Neha Gupta,Data Structures & Algorithms,4,100,91,Semester 6,false
CSE2021006,Neha Gupta,Database Management Systems,4,100,86,Semester 6,false
CSE2021006,Neha Gupta,Computer Networks,3,100,84,Semester 6,false
CSE2021006,Neha Gupta,Operating Systems,3,100,88,Semester 6,false
CSE2021006,Neha Gupta,Machine Learning,3,100,89,Semester 6,false`;

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Datasets list & selection
  const [datasets, setDatasets] = useState([]);
  const [activeDatasetId, setActiveDatasetId] = useState(null);
  const [activeDataset, setActiveDataset] = useState(null);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Upload Form State
  const [batchName, setBatchName] = useState('CSE 2024-25 Semester 6 Results');
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  // Student Search, Modal & Re-exam Slip View
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pass, reappear
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalTab, setModalTab] = useState('marksheet'); // 'marksheet' | 'reexam_slip'

  // Fetch all uploaded datasets
  const fetchDatasets = async (selectId = null) => {
    setIsLoadingDatasets(true);
    try {
      const res = await cgpaAPI.getDatasets();
      const list = res.data.datasets || [];
      setDatasets(list);
      if (list.length > 0) {
        const targetId = selectId || list[0].id;
        setActiveDatasetId(targetId);
        loadDatasetDetails(targetId);
      } else {
        setActiveDataset(null);
      }
    } catch (err) {
      console.error('Failed to load datasets', err);
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  // Load single dataset full details
  const loadDatasetDetails = async (id) => {
    if (!id) return;
    setIsLoadingDetails(true);
    try {
      const res = await cgpaAPI.getDataset(id);
      setActiveDataset(res.data);
    } catch (err) {
      console.error('Failed to load dataset details', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      setUploadSuccess(null);
    }
  };

  // Upload Dataset File
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a CSV or JSON file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('batch_name', batchName.trim() || 'CSE Batch Dataset');
    formData.append('academic_year', academicYear);

    try {
      const res = await cgpaAPI.uploadDataset(formData);
      setUploadSuccess(`Successfully uploaded! ${res.data.total_students} students processed.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDatasets(res.data.dataset_id);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to process and upload dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  // 1-Click Load Demo Dataset
  const handleLoadDemoDataset = async () => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const blob = new Blob([SAMPLE_CSV_DATA], { type: 'text/csv' });
    const file = new File([blob], 'cse_sem6_sample_results.csv', { type: 'text/csv' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('batch_name', 'CSE 2024-25 Batch A (Sample)');
    formData.append('academic_year', '2024-25');

    try {
      const res = await cgpaAPI.uploadDataset(formData);
      setUploadSuccess(`Sample dataset loaded with ${res.data.total_students} students!`);
      await fetchDatasets(res.data.dataset_id);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to load sample dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  // Download Sample Template CSV
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_DATA], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_student_dataset.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Delete Dataset
  const handleDeleteDataset = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await cgpaAPI.deleteDataset(id);
      await fetchDatasets();
    } catch (err) {
      alert('Failed to delete dataset.');
    }
  };

  // Filter students
  const filteredStudents = (activeDataset?.student_results || []).filter((s) => {
    const matchesSearch =
      s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const hasReappear = (s.reappear_count || 0) > 0 || (s.subjects || []).some(sub => sub.is_reappear);
    if (filterStatus === 'pass') return !hasReappear;
    if (filterStatus === 'reappear') return hasReappear;
    return true;
  });

  // Calculate Batch Statistics
  const studentsList = activeDataset?.student_results || [];
  const totalStudents = studentsList.length;
  const avgCGPA = totalStudents > 0
    ? (studentsList.reduce((acc, s) => acc + (s.cgpa || 0), 0) / totalStudents).toFixed(2)
    : '0.00';
  const avgTCPA = totalStudents > 0
    ? (studentsList.reduce((acc, s) => acc + (s.tcgpa || 0), 0) / totalStudents).toFixed(2)
    : '0.00';

  const reappearStudents = studentsList.filter(s =>
    (s.reappear_count || 0) > 0 || (s.subjects || []).some(sub => sub.is_reappear)
  ).length;
  const passedStudents = totalStudents - reappearStudents;
  const passPercentage = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;

  const topStudent = studentsList.length > 0
    ? [...studentsList].sort((a, b) => (b.cgpa || 0) - (a.cgpa || 0))[0]
    : null;

  // Rank Map for Topper & Honours Recognition
  const sortedByCGPA = [...studentsList].sort((a, b) => (b.cgpa || 0) - (a.cgpa || 0));
  const studentRankMap = {};
  sortedByCGPA.forEach((s, idx) => {
    if (s.student_id) studentRankMap[s.student_id] = idx + 1;
  });

  // Export Class Results as CSV Gazette
  const handleExportGazette = () => {
    if (studentsList.length === 0) return;
    const headers = ['Roll No', 'Student Name', 'Semester', 'Total Credits', 'CGPA', 'TCPA', 'Status', 'Reappears'];
    const rows = studentsList.map(s => [
      `"${s.student_id || ''}"`,
      `"${s.student_name || ''}"`,
      `"${s.semester || 'Semester 6'}"`,
      s.total_credits || s.subjects?.reduce((a, b) => a + (b.credits || 0), 0) || 17,
      s.cgpa || 0,
      s.tcgpa || 0,
      (s.reappear_count || 0) > 0 ? 'REAPPEAR' : 'PASS',
      s.reappear_count || 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(activeDataset?.batch_name || 'Class_Results').replace(/[^a-zA-Z0-9_-]/g, '_')}_Gazette.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Grade Distribution for Chart
  const gradeDistribution = {
    'O (9.0-10)': 0,
    'A+ (8.0-8.9)': 0,
    'A (7.0-7.9)': 0,
    'B+ (6.0-6.9)': 0,
    'B (5.0-5.9)': 0,
    'Reappear': reappearStudents,
  };

  studentsList.forEach(s => {
    if (!((s.reappear_count || 0) > 0 || (s.subjects || []).some(sub => sub.is_reappear))) {
      const g = s.cgpa || 0;
      if (g >= 9.0) gradeDistribution['O (9.0-10)']++;
      else if (g >= 8.0) gradeDistribution['A+ (8.0-8.9)']++;
      else if (g >= 7.0) gradeDistribution['A (7.0-7.9)']++;
      else if (g >= 6.0) gradeDistribution['B+ (6.0-6.9)']++;
      else gradeDistribution['B (5.0-5.9)']++;
    }
  });

  const barChartData = {
    labels: Object.keys(gradeDistribution),
    datasets: [
      {
        label: 'Students Count',
        data: Object.values(gradeDistribution),
        backgroundColor: [
          '#a78bfa',
          '#4ade80',
          '#38bdf8',
          '#facc15',
          '#fb923c',
          '#f87171',
        ],
        borderRadius: 8,
      },
    ],
  };

  const doughnutData = {
    labels: ['Cleared All Subjects', 'Reappear / Backlog'],
    datasets: [
      {
        data: [passedStudents, reappearStudents],
        backgroundColor: ['rgba(74,222,128,0.8)', 'rgba(248,113,113,0.8)'],
        borderColor: ['#22c55e', '#ef4444'],
        borderWidth: 1.5,
      },
    ],
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Student Results" />
        <div className="page-content space-y-6">

          {/* Top Quick Actions Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div>
              <h1 className="text-lg font-bold text-white">Student Results</h1>
              <p className="text-xs text-slate-400 mt-1">
                Upload marks sheet to calculate CGPA and view class results.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/cgpa-calculator')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Calculator size={14} className="text-emerald-400" />
                CGPA Calculator
              </button>
              <button
                type="button"
                onClick={() => navigate('/mcq-practice')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
              >
                <BookMarked size={14} className="text-blue-400" />
                OMR Practice
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SECTION 1: UPLOAD DATASET CARD                             */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-700/60">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Upload size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Upload Results File</h2>
              </div>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Class / Batch</label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g. CSE Semester 6"
                    className="form-input text-xs w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Academic Year</label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="form-input text-xs w-full"
                  >
                    {['2024-25', '2023-24', '2022-23', '2025-26'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Results File</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv, application/json, text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload-input"
                  />
                  <label
                    htmlFor="file-upload-input"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-600 hover:border-emerald-500/60 bg-slate-900/60 hover:bg-emerald-500/5 cursor-pointer transition text-xs text-slate-300"
                  >
                    <Upload size={13} className="text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {selectedFile ? selectedFile.name : 'Select file'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Status alerts */}
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle size={15} className="text-rose-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* All action buttons arranged in a single clean horizontal line */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/40 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <Download size={13} className="text-blue-400" />
                  Sample CSV
                </button>
                <button
                  type="button"
                  onClick={handleLoadDemoDataset}
                  disabled={isUploading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Sparkles size={13} className="text-emerald-400" />
                  Load Demo Data
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={13} />
                      Upload File
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SECTION 2: DATASETS SELECTOR & HISTORY                     */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {datasets.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet size={15} className="text-blue-400" />
                  Saved Datasets ({datasets.length})
                </span>
                <span className="text-xs text-slate-400">Select a dataset to view</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {datasets.map(d => {
                  const isActive = d.id === activeDatasetId;
                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        setActiveDatasetId(d.id);
                        loadDatasetDetails(d.id);
                      }}
                      className={`cursor-pointer px-4 py-2.5 rounded-xl border transition flex items-center gap-3 shrink-0 ${
                        isActive
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                          : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold leading-tight">{d.batch_name || 'Batch'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {d.total_students} students • CGPA: <b className="text-emerald-400">{d.avg_cgpa}</b>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDataset(d.id, e)}
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                        title="Delete dataset"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SECTION 3: DATASET RESULTS DASHBOARD                      */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {isLoadingDetails ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center">
              <RefreshCw size={32} className="animate-spin text-emerald-400 mb-2" />
              <p className="text-xs text-slate-400">Loading dataset results...</p>
            </div>
          ) : activeDataset ? (
            <div className="space-y-6">

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="glass-card p-4">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Total Students</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-white">{totalStudents}</span>
                    <Users size={20} className="text-emerald-400 opacity-70" />
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">{activeDataset.academic_year || '2024-25'}</span>
                </div>

                <div className="glass-card p-4">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Avg CGPA</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-blue-400">{avgCGPA}</span>
                    <Award size={20} className="text-blue-400 opacity-70" />
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">Scale 10.0</span>
                </div>

                <div className="glass-card p-4">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Avg TCPA</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-teal-300">{avgTCPA}</span>
                    <TrendingUp size={20} className="text-teal-400 opacity-70" />
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">Valid GPA</span>
                </div>

                <div className="glass-card p-4">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Pass Rate</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-purple-400">{passPercentage}%</span>
                    <CheckCircle2 size={20} className="text-purple-400 opacity-70" />
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">{passedStudents} of {totalStudents}</span>
                </div>

                <div className="glass-card p-4 col-span-2 sm:col-span-1">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Top Student</span>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-amber-300 truncate max-w-[120px]">
                      {topStudent ? topStudent.student_name : '—'}
                    </span>
                    <GraduationCap size={20} className="text-amber-400 opacity-70" />
                  </div>
                  <span className="text-[11px] text-amber-300/80 block mt-1">
                    CGPA: {topStudent?.cgpa ?? '—'}
                  </span>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-card p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 size={15} className="text-emerald-400" />
                      Grade Distribution
                    </h3>
                    <span className="text-xs text-slate-400">{totalStudents} Students</span>
                  </div>
                  <div style={{ height: 210 }}>
                    <Bar
                      data={barChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(51,65,85,0.4)' } },
                          y: { ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(51,65,85,0.4)' } },
                        },
                      }}
                    />
                  </div>
                </div>

                <div className="glass-card p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Pass vs Reappear
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Backlogs excluded from TCPA.
                    </p>
                  </div>
                  <div className="flex items-center justify-center my-auto" style={{ height: 160 }}>
                    <Doughnut
                      data={doughnutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { color: '#cbd5e1', font: { size: 11 } }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Student Results Table */}
              <div className="glass-card p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users size={16} className="text-emerald-400" />
                      Student Results ({filteredStudents.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      View student grades and GPA.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleExportGazette}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition"
                      title="Download full class marksheet gazette as CSV"
                    >
                      <Download size={13} className="text-emerald-400" />
                      Export Gazette
                    </button>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search student or ID..."
                        className="form-input text-xs pl-8 py-1.5 w-40 sm:w-48"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="form-input text-xs py-1.5"
                    >
                      <option value="all">All Students ({totalStudents})</option>
                      <option value="pass">All Clear ({passedStudents})</option>
                      <option value="reappear">With Backlog ({reappearStudents})</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-700/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-700/60 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Roll No</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Sem</th>
                        <th className="py-2.5 px-3 text-center">Credits</th>
                        <th className="py-2.5 px-3 text-center">CGPA</th>
                        <th className="py-2.5 px-3 text-center">TCPA</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-8 text-slate-400 text-xs">
                            No student records found.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((st, idx) => {
                          const hasReappear = (st.reappear_count || 0) > 0 || (st.subjects || []).some(s => s.is_reappear);
                          const rank = studentRankMap[st.student_id];
                          return (
                            <tr
                              key={st.student_id || idx}
                              className="hover:bg-slate-800/40 transition cursor-pointer"
                              onClick={() => setSelectedStudent(st)}
                            >
                              <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-3 px-3 font-mono font-semibold text-slate-200">{st.student_id}</td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-white">{st.student_name}</span>
                                  {rank === 1 && (
                                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                                      🥇 Topper
                                    </span>
                                  )}
                                  {rank === 2 && (
                                    <span className="text-[10px] font-bold text-slate-300 bg-slate-500/15 border border-slate-500/30 px-1.5 py-0.5 rounded-md">
                                      🥈 #2
                                    </span>
                                  )}
                                  {rank === 3 && (
                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-700/15 border border-amber-600/30 px-1.5 py-0.5 rounded-md">
                                      🥉 #3
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-slate-400">{st.semester || 'Sem 6'}</td>
                              <td className="py-3 px-3 text-center font-mono text-slate-300">
                                {st.total_credits || st.subjects?.reduce((a, b) => a + (b.credits || 0), 0) || '—'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full font-bold text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  {st.cgpa}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full font-bold text-[11px] bg-teal-500/15 text-teal-300 border border-teal-500/30">
                                  {st.tcgpa}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                {hasReappear ? (
                                  <span className="badge text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    Reappear
                                  </span>
                                ) : (
                                  <span className="badge text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    Pass
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudent(st)}
                                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 border border-slate-700 transition inline-flex items-center gap-1.5"
                                >
                                  <Eye size={12} />
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-card p-12 text-center border border-dashed border-gray-700">
              <FileSpreadsheet size={48} className="mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Academic Dataset Loaded Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                Upload a CSV/JSON student results file using the form above, or click below to load our sample CSE exam dataset with one click.
              </p>
              <button
                type="button"
                onClick={handleLoadDemoDataset}
                disabled={isUploading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 inline-flex items-center gap-2 transition"
              >
                <Sparkles size={14} />
                Load Sample Dataset
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* OFFICIAL ACADEMIC MARKSHEET & RE-EXAM CLEARANCE SLIP MODAL   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl p-6 bg-slate-900 text-slate-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
                  {(selectedStudent.student_name || 'S')[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{selectedStudent.student_name}</h3>
                    <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                      {selectedStudent.student_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedStudent.semester || 'Semester 6'} • {activeDataset?.academic_year || '2024-25'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setModalTab('marksheet');
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation tabs if student has reappear subjects */}
            {(selectedStudent.subjects || []).some(s => s.is_reappear) && (
              <div className="flex bg-slate-950/60 p-1 rounded-xl mb-4 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalTab('marksheet')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    modalTab === 'marksheet'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Official Marksheet
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('reexam_slip')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    modalTab === 'reexam_slip'
                      ? 'bg-rose-500 text-white font-bold shadow'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  <FileText size={12} />
                  Re-Exam Clearance Slip
                </button>
              </div>
            )}

            {/* TAB 1: MARKSHEET VIEW */}
            {modalTab === 'marksheet' ? (
              <>
                {/* Score Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Overall CGPA</span>
                    <span className="text-2xl font-black text-emerald-400">{selectedStudent.cgpa}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Cumulative GPA</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">TCPA</span>
                    <span className="text-2xl font-black text-teal-300">{selectedStudent.tcgpa}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Cleared Credits</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Credits Earned</span>
                    <span className="text-2xl font-black text-blue-400">
                      {selectedStudent.total_credits || selectedStudent.subjects?.reduce((a, b) => a + (b.credits || 0), 0) || '17'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Curriculum Load</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Exam Result</span>
                    <span className={`text-sm font-bold block mt-1 ${selectedStudent.reappear_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {selectedStudent.reappear_count > 0 ? 'Reappear / Backlog' : 'Pass (All Cleared)'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Status</span>
                  </div>
                </div>

                {/* Subject Grade Details */}
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Course Subjects & Grades
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-700/60 mb-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-700/60 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3">Subject Name</th>
                        <th className="py-2.5 px-3 text-center">Credits</th>
                        <th className="py-2.5 px-3 text-center">Marks</th>
                        <th className="py-2.5 px-3 text-center">Score %</th>
                        <th className="py-2.5 px-3 text-center">Grade</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40">
                      {(selectedStudent.subjects || []).map((subj, i) => (
                        <tr
                          key={i}
                          className={subj.is_reappear ? 'bg-rose-950/20' : 'hover:bg-slate-800/30'}
                        >
                          <td className="py-2.5 px-3 font-medium text-slate-200">{subj.subject_name}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">{subj.credits}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {subj.is_reappear ? '—' : `${subj.obtained_marks} / ${subj.total_marks || 100}`}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {subj.is_reappear ? '—' : `${subj.percentage}%`}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className="px-2 py-0.5 rounded font-bold text-[10px]"
                              style={{
                                background: `${subj.grade_color || '#4ade80'}15`,
                                color: subj.grade_color || '#4ade80',
                                border: `1px solid ${subj.grade_color || '#4ade80'}40`,
                              }}
                            >
                              {subj.letter_grade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {subj.is_reappear ? (
                              <span className="badge text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                Reappear
                              </span>
                            ) : (
                              <span className="badge text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Pass
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Practical Backlog Re-Exam Action Box */}
                {(selectedStudent.subjects || []).some(s => s.is_reappear) && (
                  <div className="mb-4 p-4 rounded-xl border border-rose-500/30 bg-rose-950/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                        <span className="text-xs font-bold text-rose-300">
                          Reappear in {(selectedStudent.subjects || []).filter(s => s.is_reappear).map(s => s.subject_name).join(', ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Passing cutoff is 40/100 marks. Clearing this raises overall CGPA to ~7.5+.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate('/mcq-practice')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition"
                      >
                        <Play size={12} />
                        Practice Mock Exam
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalTab('reexam_slip')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition"
                      >
                        <FileText size={12} />
                        Re-Exam Slip
                      </button>
                    </div>
                  </div>
                )}

                {/* Modal Bottom Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition"
                  >
                    <Printer size={14} />
                    Print Marksheet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(null);
                      setModalTab('marksheet');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              /* TAB 2: OFFICIAL RE-EXAMINATION CLEARANCE SLIP */
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border border-slate-700 bg-slate-950/70 text-slate-200">
                  <div className="text-center pb-4 mb-4 border-b border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      University Examination Board
                    </span>
                    <h3 className="text-base font-extrabold text-white mt-1">
                      Official Re-Examination Clearance Slip
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Academic Year {activeDataset?.academic_year || '2024-25'} • Supplementary Session
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Student Name</span>
                      <span className="font-bold text-white text-sm">{selectedStudent.student_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Roll Number</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">{selectedStudent.student_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Semester</span>
                      <span className="text-slate-200">{selectedStudent.semester || 'Semester 6'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Verification Status</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCheck size={13} />
                        Approved & Registered
                      </span>
                    </div>
                  </div>

                  <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Subject(s) Scheduled for Re-Examination
                  </h5>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 mb-5">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase text-slate-400">
                          <th className="py-2 px-3">Subject</th>
                          <th className="py-2 px-3 text-center">Credits</th>
                          <th className="py-2 px-3 text-center">Passing Cutoff</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {(selectedStudent.subjects || []).filter(s => s.is_reappear).map((subj, i) => (
                          <tr key={i} className="hover:bg-slate-900/50">
                            <td className="py-2.5 px-3 font-semibold text-rose-300">{subj.subject_name}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-300">{subj.credits}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-amber-300 font-bold">40 / 100 Marks</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="badge text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                Re-Exam Scheduled
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-slate-800/80 text-center text-xs">
                    <div>
                      <div className="h-10 border-b border-dashed border-slate-600 mb-1"></div>
                      <span className="text-[11px] text-slate-400">Candidate Signature</span>
                    </div>
                    <div>
                      <div className="h-10 border-b border-dashed border-slate-600 mb-1"></div>
                      <span className="text-[11px] text-slate-400">Controller of Examinations</span>
                    </div>
                  </div>
                </div>

                {/* Slip actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white shadow-md flex items-center gap-1.5 transition"
                  >
                    <Printer size={14} />
                    Print Re-Exam Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('marksheet')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Back to Marksheet
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
