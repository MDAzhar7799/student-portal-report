// =============================================================
// MCQPractice.jsx — Two-Step Upload: Question Paper + Answer Key
// Practice Mode: Red for wrong, Green for correct
// Technology: React.js + Flask REST API + PyMongo (MongoDB)
// =============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { mcqAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import {
  Upload, BookMarked, Play, CheckCircle2, XCircle, Trophy,
  RefreshCw, Trash2, ChevronRight, ChevronLeft, FileQuestion,
  AlertCircle, X, History, Target, ArrowLeft,
  Clock, Check, HelpCircle, Eye, Award, CheckCircle, KeyRound, FileText, Brain
} from 'lucide-react';

export default function MCQPractice() {
  // Navigation & view states: 'LIST' | 'PRACTICE' | 'RESULT'
  const [view, setView] = useState('LIST');
  const [activeTab, setActiveTab] = useState('papers'); // 'papers' | 'history'

  // Data states
  const [papers, setPapers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // --- STEP 1: Upload Question Paper ---
  const [showStep1Modal, setShowStep1Modal] = useState(false);
  const [step1File, setStep1File] = useState(null);
  const [step1Title, setStep1Title] = useState('');
  const [isUploadingStep1, setIsUploadingStep1] = useState(false);

  // --- STEP 2: Upload Answer Key ---
  const [showStep2Modal, setShowStep2Modal] = useState(false);
  const [step2File, setStep2File] = useState(null);
  const [step2PaperId, setStep2PaperId] = useState(null);
  const [step2PaperTitle, setStep2PaperTitle] = useState('');
  const [isUploadingStep2, setIsUploadingStep2] = useState(false);

  // Practice State
  const [activePaper, setActivePaper] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Result State
  const [submissionResult, setSubmissionResult] = useState(null);

  // Review Modal
  const [reviewModalSession, setReviewModalSession] = useState(null);

  // Gemini AI loading state (paper id being processed)
  const [geminiLoadingId, setGeminiLoadingId] = useState(null);
  // Gemini AI reveal correct answers on result page
  const [aiRevealLoading, setAiRevealLoading] = useState(false);

  // Timer Ref
  const timerRef = useRef(null);

  // Load papers and session history
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [papersRes, sessionsRes] = await Promise.all([
        mcqAPI.getPapers({ limit: 50 }),
        mcqAPI.getSessions({ limit: 50 }),
      ]);
      setPapers(papersRes.data.papers || []);
      setSessions(sessionsRes.data.sessions || []);
    } catch (err) {
      setAlert({
        type: 'error',
        text: err.response?.data?.error || 'Failed to load MCQ data from MongoDB',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Timer lifecycle during practice
  useEffect(() => {
    if (view === 'PRACTICE') {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── STEP 1: Upload Question Paper ──────────────────────────
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!step1File) { setAlert({ type: 'error', text: 'Please select a question paper file' }); return; }
    const formData = new FormData();
    formData.append('file', step1File);
    formData.append('title', step1Title || step1File.name);
    formData.append('subject', step1Title || 'General');
    setIsUploadingStep1(true);
    setAlert(null);
    try {
      const res = await mcqAPI.upload(formData);
      const newPaperId = res.data.paper?.id;
      setShowStep1Modal(false);
      setStep2PaperId(newPaperId);
      setStep2PaperTitle(step1Title || step1File.name);
      setStep2File(null);
      setShowStep2Modal(true);
      setAlert({ type: 'success', text: 'Question paper uploaded! Now upload the answer key (Step 2).' });
      await loadData();
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to upload question paper' });
    } finally {
      setIsUploadingStep1(false);
      setStep1File(null);
      setStep1Title('');
    }
  };

  // ── STEP 2: Upload Answer Key ──────────────────────────────
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!step2File) { setAlert({ type: 'error', text: 'Please select an answer key file' }); return; }
    const formData = new FormData();
    formData.append('file', step2File);
    formData.append('paper_id', step2PaperId);
    setIsUploadingStep2(true);
    setAlert(null);
    try {
      await mcqAPI.uploadAnswerKey(formData);
      setAlert({ type: 'success', text: 'Answer key uploaded! You can now start practice.' });
      setShowStep2Modal(false);
      setStep2File(null);
      await loadData();
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to upload answer key' });
    } finally {
      setIsUploadingStep2(false);
    }
  };

  // Open answer key modal for existing paper
  const handleOpenAnswerKeyModal = (paper) => {
    setStep2PaperId(paper.id);
    setStep2PaperTitle(paper.title);
    setStep2File(null);
    setShowStep2Modal(true);
  };

  // 🤖 Gemini AI Auto-Answer
  const handleGeminiAutoAnswer = async (paper) => {
    if (geminiLoadingId) return;
    setGeminiLoadingId(paper.id);
    setAlert(null);
    try {
      const res = await mcqAPI.geminiAnswers(paper.id);
      setAlert({
        type: 'success',
        text: res.data.message || '✅ Gemini AI answered all questions!',
      });
      await loadData(); // refresh paper list so has_answer_key turns green
    } catch (err) {
      setAlert({
        type: 'error',
        text: err.response?.data?.error || '❌ Gemini AI failed. Try again.',
      });
    } finally {
      setGeminiLoadingId(null);
    }
  };

  // 🤖 Reveal AI correct answers directly on the result page (no retake needed)
  const handleRevealAIAnswers = async () => {
    if (!activePaper?.id || aiRevealLoading) return;
    setAiRevealLoading(true);
    try {
      const res = await mcqAPI.geminiAnswers(activePaper.id);
      const aiAnswers = res.data.ai_answers || {}; // { 1: 'A', 2: 'C', ... }
      // Patch submissionResult in-place so correct answers show green immediately
      setSubmissionResult(prev => ({
        ...prev,
        results: (prev.results || []).map(item => {
          const qn = item.question_number;
          const ai = aiAnswers[qn];
          if (ai && !item.correct_answer) {
            const wasCorrect = item.user_answer?.toUpperCase() === ai;
            return { ...item, correct_answer: ai, is_correct: wasCorrect };
          }
          return item;
        }),
      }));
      setAlert({ type: 'success', text: `✅ Gemini revealed correct answers for ${Object.keys(aiAnswers).length} questions!` });
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || '❌ AI answer reveal failed.' });
    } finally {
      setAiRevealLoading(false);
    }
  };

  // Delete Paper
  const handleDeletePaper = async (paperId, title) => {
    if (!window.confirm(`Delete question paper "${title}"?`)) return;
    try {
      await mcqAPI.deletePaper(paperId);
      setAlert({ type: 'success', text: `Paper "${title}" deleted from MongoDB.` });
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to delete paper' });
    }
  };

  // Start Practice Session (OMR Exam)
  const handleStartPractice = async (paper) => {
    if (!paper.questions || paper.questions.length === 0) {
      setAlert({
        type: 'error',
        text: 'This paper does not have any extracted MCQ questions.',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await mcqAPI.startSession({ paper_id: paper.id });
      setActivePaper(paper);
      setActiveSessionId(res.data.session_id);
      setUserAnswers({});
      setCurrentQuestionIdx(0);
      setTimerSeconds(0);
      setView('PRACTICE');
      setAlert(null);
    } catch (err) {
      setAlert({
        type: 'error',
        text: err.response?.data?.error || 'Failed to start practice session',
      });
    } finally {
      setLoading(false);
    }
  };

  // Select option in active practice
  const handleSelectOption = (qIdx, optionKey) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qIdx]: optionKey,
    }));
  };

  // Clear answer for current question
  const handleClearCurrentAnswer = () => {
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestionIdx];
      return copy;
    });
  };

  // Submit Practice Session
  const handleSubmitPractice = async () => {
    const answeredCount = Object.keys(userAnswers).length;
    const totalCount = activePaper.questions.length;
    const confirmMsg =
      answeredCount < totalCount
        ? `You answered ${answeredCount} of ${totalCount} questions. Submit now?`
        : 'Submit your answers?';
    if (!window.confirm(confirmMsg)) return;
    setIsSubmitting(true);
    try {
      // Send as array with question_number + selected key
      const formattedAnswers = activePaper.questions.map((q, idx) => ({
        question_number: q.question_number || (idx + 1),
        selected: userAnswers[idx] || null,
      }));
      const res = await mcqAPI.submitSession(activeSessionId, {
        answers: formattedAnswers,
        time_spent_seconds: timerSeconds,
      });
      setSubmissionResult(res.data);
      setView('RESULT');
      loadData();
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to submit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open review modal for a past session
  const handleOpenReviewModal = async (session) => {
    try {
      const res = await mcqAPI.getSession(session.id);
      setReviewModalSession(res.data.session);
    } catch {
      setReviewModalSession(session);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="main-content flex-1">
        <Navbar title="MCQ Exam Practice & Self-Assessment" />

        <div className="page-content space-y-6">
          {/* Global Alert Notification */}
          {alert && (
            <div
              className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm animate-fade-in ${
                alert.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              <div className="flex items-center gap-3">
                {alert.type === 'success' ? (
                  <CheckCircle2 size={18} className="shrink-0" />
                ) : (
                  <AlertCircle size={18} className="shrink-0" />
                )}
                <span>{alert.text}</span>
              </div>
              <button
                onClick={() => setAlert(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 1: QUESTION PAPERS LIST & UPLOAD ZONE               */}
          {/* ======================================================== */}
          {view === 'LIST' && (
            <div className="space-y-6">
              {/* Header Hero Banner (Cleaned up: badges & long text removed per user request) */}
              <div className="glass-card p-5 border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-blue-950/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                    <BookMarked className="text-emerald-400" size={26} />
                    MCQ Exam Practice Room
                  </h2>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setStep1Title(''); setStep1File(null); setShowStep1Modal(true); }}
                      className="btn-primary flex items-center gap-2 px-5 py-2.5 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
                    >
                      <Upload size={18} />
                      Upload Question Paper
                    </button>
                    <button
                      onClick={loadData}
                      disabled={loading}
                      className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('papers')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'papers'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <FileQuestion size={16} />
                  Question Papers ({papers.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'history'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <History size={16} />
                  My Attempt History ({sessions.length})
                </button>
              </div>

              {/* TAB 1: Papers Grid */}
              {activeTab === 'papers' && (
                <div>
                  {loading && papers.length === 0 ? (
                    <div className="glass-card p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                      <RefreshCw size={32} className="animate-spin text-emerald-400" />
                      <p>Loading question papers from MongoDB...</p>
                    </div>
                  ) : papers.length === 0 ? (
                    <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-4 border border-dashed border-slate-700">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Upload size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white">No Question Papers Uploaded</h3>
                        <p className="text-sm text-slate-400 max-w-md">
                          Upload an exam paper image or PDF to start practicing.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="btn-primary flex items-center gap-2 mt-2"
                      >
                        <Upload size={16} />
                        Upload Question Paper
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {papers.map((paper) => (
                        <div
                          key={paper.id}
                          className="glass-card p-5 border border-slate-800 hover:border-emerald-500/40 flex flex-col justify-between transition-all group"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                {paper.subject || 'General Exam'}
                              </span>
                              <button
                                onClick={() => handleDeletePaper(paper.id, paper.title)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                title="Delete Paper"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div>
                              <h3 className="font-bold text-white text-lg group-hover:text-emerald-300 transition-colors line-clamp-1">
                                {paper.title}
                              </h3>
                              {paper.exam_name && (
                                <p className="text-xs text-slate-400 mt-0.5">{paper.exam_name}</p>
                              )}
                            </div>

                          <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-800/80">
                              <div className="text-slate-400">
                                Questions:{' '}
                                <span className="font-semibold text-white">
                                  {paper.total_questions || paper.questions?.length || 0}
                                </span>
                              </div>
                              <div className="text-slate-400">
                                Answer Key:{' '}
                                <span
                                  className={`font-semibold ${
                                    paper.has_answer_key ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                                >
                                  {paper.has_answer_key ? '✓ Uploaded' : '✗ Missing'}
                                </span>
                              </div>
                              <div className="text-slate-400">
                                Uploaded:{' '}
                                <span className="text-slate-300">
                                  {paper.created_at
                                    ? new Date(paper.created_at).toLocaleDateString()
                                    : 'Recent'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 mt-2 space-y-2">
                            {!paper.has_answer_key && (
                              <div className="flex gap-2">
                                {/* 🤖 Gemini AI Auto-Answer Button */}
                                <button
                                  onClick={() => handleGeminiAutoAnswer(paper)}
                                  disabled={geminiLoadingId === paper.id}
                                  title="Let Gemini AI automatically answer all questions"
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-purple-500/50 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-purple-900/30"
                                  style={geminiLoadingId === paper.id ? {} : { boxShadow: '0 0 10px rgba(139,92,246,0.2)' }}
                                >
                                  {geminiLoadingId === paper.id ? (
                                    <><RefreshCw size={13} className="animate-spin" /> Asking AI…</>
                                  ) : (
                                    <><Brain size={13} /> AI Auto-Answer</>
                                  )}
                                </button>
                                {/* Manual Answer Key Upload */}
                                <button
                                  onClick={() => handleOpenAnswerKeyModal(paper)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                >
                                  <KeyRound size={13} /> Upload Key
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => handleStartPractice(paper)}
                              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 text-sm"
                            >
                              <Play size={16} />
                              Start Practice
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Attempts History */}
              {activeTab === 'history' && (
                <div>
                  {sessions.length === 0 ? (
                    <div className="glass-card p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                      <Trophy size={36} className="text-slate-600" />
                      <p>No practice tests completed yet. Start an exam to see your score history!</p>
                    </div>
                  ) : (
                    <div className="glass-card overflow-hidden border border-slate-800">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="py-3.5 px-4">Date & Time</th>
                              <th className="py-3.5 px-4">Paper Title</th>
                              <th className="py-3.5 px-4">Score</th>
                              <th className="py-3.5 px-4">Percentage</th>
                              <th className="py-3.5 px-4">Status</th>
                              <th className="py-3.5 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {sessions.map((sess) => {
                              const pct = sess.percentage || 0;
                              const passed = pct >= 50;
                              return (
                                <tr
                                  key={sess.id}
                                  className="hover:bg-slate-800/40 transition-colors"
                                >
                                  <td className="py-3.5 px-4 text-slate-300 text-xs">
                                    {sess.created_at
                                      ? new Date(sess.created_at).toLocaleString()
                                      : '—'}
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-white">
                                    {sess.paper_title || 'MCQ Practice Paper'}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                                    {sess.score} / {sess.total_questions}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            pct >= 70
                                              ? 'bg-emerald-500'
                                              : pct >= 50
                                              ? 'bg-blue-500'
                                              : 'bg-red-500'
                                          }`}
                                          style={{ width: `${Math.min(100, pct)}%` }}
                                        />
                                      </div>
                                      <span className="font-bold text-xs">{pct}%</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                        passed
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      }`}
                                    >
                                      {passed ? 'Passed' : 'Needs Practice'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      onClick={() => handleOpenReviewModal(sess)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 ml-auto transition-colors"
                                    >
                                      <Eye size={14} />
                                      Review
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: INTERACTIVE OMR EXAM PRACTICE (DIFFERENT COLOR)  */}
          {/* ======================================================== */}
          {view === 'PRACTICE' && activePaper && (
            <div className="space-y-6 animate-fade-in">
              {/* OMR Exam Header — Distinct Royal Indigo & Violet Styling */}
              <div className="p-5 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950/80 shadow-xl shadow-indigo-950/40 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={() => {
                      if (
                        window.confirm('Leave practice exam? Your current OMR sheet will not be graded.')
                      ) {
                        setView('LIST');
                      }
                    }}
                    className="p-2.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-500/30 transition-colors"
                    title="Exit Exam"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/25 text-indigo-300 border border-indigo-400/40">
                        OMR Practice Sheet
                      </span>
                      <span className="text-xs text-indigo-300/80 font-medium">
                        {activePaper.subject || 'MCQ Exam'}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white leading-tight mt-0.5">
                      {activePaper.title}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Digital Exam Timer */}
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-indigo-200 font-mono text-sm shadow-inner">
                    <Clock size={16} className="text-indigo-400 animate-pulse" />
                    <span className="font-bold tracking-wider">{formatTimer(timerSeconds)}</span>
                  </div>

                  {/* Submit OMR Button */}
                  <button
                    onClick={handleSubmitPractice}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                  >
                    <CheckCircle size={16} />
                    {isSubmitting ? 'Grading OMR...' : 'Submit OMR Sheet'}
                  </button>
                </div>
              </div>

              {/* Main OMR Exam Layout: Question Area + Live OMR Answer Sheet Column */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left/Main Column: Active Question (Col 8) */}
                <div className="lg:col-span-8 space-y-5">
                  {(() => {
                    const q = activePaper.questions[currentQuestionIdx];
                    const selectedOpt = userAnswers[currentQuestionIdx];

                    return (
                      <div className="p-6 rounded-2xl border border-indigo-500/30 bg-slate-900/90 shadow-xl space-y-6">
                        {/* Question Top Bar */}
                        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-indigo-500/30">
                              Q{currentQuestionIdx + 1}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                              Question {currentQuestionIdx + 1} of {activePaper.questions.length}
                            </span>
                          </div>
                          {selectedOpt && (
                            <button
                              onClick={handleClearCurrentAnswer}
                              className="text-xs text-indigo-300/70 hover:text-red-400 transition-colors"
                            >
                              Clear Bubble
                            </button>
                          )}
                        </div>

                        {/* Question Text */}
                        <div className="text-lg md:text-xl font-medium text-white leading-relaxed">
                          {q.question_text}
                        </div>

                        {/* OMR Options with Authentic Circular Fill Bubbles */}
                        <div className="space-y-3">
                          {Object.entries(q.options || {}).map(([key, text]) => {
                            const isSelected = selectedOpt === key;
                            return (
                              <button
                                key={key}
                                onClick={() => handleSelectOption(currentQuestionIdx, key)}
                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${
                                  isSelected
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-indigo-950/20 hover:border-indigo-500/40'
                                }`}
                              >
                                {/* Authentic Circular OMR Bubble */}
                                <span
                                  className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 border-2 transition-all ${
                                    isSelected
                                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-500/50 scale-105'
                                      : 'border-indigo-400/60 text-indigo-300 bg-indigo-950/40'
                                  }`}
                                >
                                  {key}
                                </span>
                                <span className="text-sm md:text-base font-normal pt-1 leading-snug">
                                  {text}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Bottom Navigation for Questions */}
                        <div className="flex items-center justify-between border-t border-indigo-500/20 pt-5">
                          <button
                            onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                            disabled={currentQuestionIdx === 0}
                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 transition-colors"
                          >
                            <ChevronLeft size={16} /> Previous
                          </button>

                          <div className="text-xs text-indigo-300 font-medium">
                            {selectedOpt ? (
                              <span className="font-bold text-indigo-400">
                                Marked Bubble: ({selectedOpt})
                              </span>
                            ) : (
                              <span className="text-slate-500">No bubble marked</span>
                            )}
                          </div>

                          {currentQuestionIdx < activePaper.questions.length - 1 ? (
                            <button
                              onClick={() =>
                                setCurrentQuestionIdx((p) =>
                                  Math.min(activePaper.questions.length - 1, p + 1)
                                )
                              }
                              className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                            >
                              Next <ChevronRight size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={handleSubmitPractice}
                              disabled={isSubmitting}
                              className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/30 flex items-center gap-2"
                            >
                              <Check size={16} /> Submit OMR
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Right Column: Live OMR Answer Sheet (Col 4) */}
                <div className="lg:col-span-4">
                  <div className="p-5 rounded-2xl border border-indigo-500/30 bg-slate-900/90 shadow-xl space-y-4 sticky top-6">
                    <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                      <div className="flex items-center gap-2">
                        <Target className="text-indigo-400" size={18} />
                        <h3 className="font-bold text-white text-sm tracking-wide">
                          OMR Answer Sheet
                        </h3>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {Object.keys(userAnswers).length} / {activePaper.questions.length} Filled
                      </span>
                    </div>

                    <p className="text-[11px] text-indigo-300/70">
                      Click any circular bubble to mark or change your answer directly on the sheet.
                    </p>

                    {/* Scrollable OMR Sheet Grid */}
                    <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {activePaper.questions.map((qItem, idx) => {
                        const isCurrent = currentQuestionIdx === idx;
                        const userMark = userAnswers[idx];
                        const optionKeys = ['A', 'B', 'C', 'D'];

                        return (
                          <div
                            key={idx}
                            onClick={() => setCurrentQuestionIdx(idx)}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                              isCurrent
                                ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/50'
                                : 'bg-slate-950/40 border-slate-800 hover:border-indigo-500/30'
                            }`}
                          >
                            <span
                              className={`w-6 text-xs font-bold text-center ${
                                isCurrent ? 'text-indigo-300 font-extrabold' : 'text-slate-400'
                              }`}
                            >
                              {idx + 1}.
                            </span>

                            {/* Circular OMR Bubbles A, B, C, D */}
                            <div className="flex items-center gap-1.5">
                              {optionKeys.map((optKey) => {
                                const isMarked = userMark === optKey;
                                return (
                                  <button
                                    key={optKey}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectOption(idx, optKey);
                                      setCurrentQuestionIdx(idx);
                                    }}
                                    className={`w-7 h-7 rounded-full text-[11px] font-bold transition-all flex items-center justify-center border ${
                                      isMarked
                                        ? 'bg-indigo-600 border-indigo-300 text-white shadow-md shadow-indigo-500/50 scale-110'
                                        : 'bg-slate-900 border-indigo-500/30 text-indigo-300/80 hover:border-indigo-400 hover:text-white'
                                    }`}
                                    title={`Mark Q${idx + 1} as ${optKey}`}
                                  >
                                    {optKey}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: EXAM RESULTS & REVIEW (RED FOR WRONG, GREEN OK)   */}
          {/* ======================================================== */}
          {view === 'RESULT' && submissionResult && (
            <div className="space-y-6 animate-fade-in">
              {/* Score Hero Summary */}
              <div className="glass-card p-6 border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900 to-slate-950">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Award size={14} /> Assessment Completed
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Exam Result & Review</h2>
                  </div>

                  {/* Score Indicator */}
                  <div className="flex items-center gap-6">
                    <div className="text-center p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                      <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                        Final Score
                      </div>
                      <div className="text-4xl font-extrabold text-white font-mono">
                        {submissionResult.score}{' '}
                        <span className="text-lg text-slate-500 font-normal">
                          / {submissionResult.total}
                        </span>
                      </div>
                      <div
                        className={`text-sm font-bold mt-1 ${
                          submissionResult.percentage >= 50
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {submissionResult.percentage}% •{' '}
                        {submissionResult.percentage >= 70
                          ? 'Excellent'
                          : submissionResult.percentage >= 50
                          ? 'Passed'
                          : 'Review Needed'}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* 🤖 Reveal AI Answers button — shown when any result lacks correct_answer */}
                      {submissionResult.results?.some(r => !r.correct_answer) && (
                        <button
                          onClick={handleRevealAIAnswers}
                          disabled={aiRevealLoading}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border-2 border-purple-500/60 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-all disabled:opacity-60 shadow-md shadow-purple-900/30"
                          style={{ boxShadow: aiRevealLoading ? undefined : '0 0 14px rgba(139,92,246,0.25)' }}
                        >
                          {aiRevealLoading
                            ? <><RefreshCw size={15} className="animate-spin" /> Asking Gemini…</>
                            : <><Brain size={15} /> Reveal AI Answers</>}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (activePaper) {
                            handleStartPractice(activePaper);
                          }
                        }}
                        className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
                      >
                        <RefreshCw size={16} /> Retake Test
                      </button>
                      <button
                        onClick={() => setView('LIST')}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                      >
                        <ArrowLeft size={16} /> Back to Papers
                      </button>
                    </div>
                  </div>
                </div>

                {/* Score Stats Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <div className="text-xs text-emerald-400 font-medium">Correct Answers</div>
                    <div className="text-2xl font-bold text-emerald-300 font-mono mt-0.5">
                      {submissionResult.score}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <div className="text-xs text-red-400 font-medium">Wrong Answers</div>
                    <div className="text-2xl font-bold text-red-300 font-mono mt-0.5">
                      {submissionResult.results.filter((r) => r.is_correct === false && r.user_answer !== null).length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <div className="text-xs text-amber-400 font-medium">Skipped / Unattempted</div>
                    <div className="text-2xl font-bold text-amber-300 font-mono mt-0.5">
                      {submissionResult.results.filter((r) => r.user_answer === null).length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <div className="text-xs text-blue-400 font-medium">Accuracy</div>
                    <div className="text-2xl font-bold text-blue-300 font-mono mt-0.5">
                      {submissionResult.percentage}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Per-Question Detailed Review List (Red = Wrong, Green = Correct) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Target className="text-emerald-400" size={20} />
                    Detailed Answer Review
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                      Correct Answer
                    </span>
                    <span className="flex items-center gap-1.5 text-red-400">
                      <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                      Wrong Answer Marked
                    </span>
                  </div>
                </div>

                {submissionResult.results.map((item, idx) => {
                  const isCorrect = item.is_correct;
                  const isSkipped = item.user_answer === null || item.user_answer === undefined;

                  return (
                    <div
                      key={idx}
                      className={`glass-card p-5 border transition-all ${
                        isCorrect
                          ? 'border-emerald-500/30 bg-emerald-950/10'
                          : isSkipped
                          ? 'border-amber-500/30 bg-amber-950/10'
                          : 'border-red-500/40 bg-red-950/10'
                      }`}
                    >
                      {/* Question Top Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                              isCorrect
                                ? 'bg-emerald-500 text-white'
                                : isSkipped
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-red-500 text-white'
                            }`}
                          >
                            Q{idx + 1}
                          </span>
                          <span className="font-semibold text-white text-base">
                            {item.question || item.question_text}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {isCorrect ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                              <CheckCircle2 size={14} /> Correct (+1)
                            </span>
                          ) : isSkipped ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                              <HelpCircle size={14} /> Skipped
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1.5">
                              <XCircle size={14} /> Incorrect (0)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Options with Exact Red / Green Color Coding */}
                      <div className="space-y-2 mt-4">
                        {Object.entries(item.options || {}).map(([optKey, optText]) => {
                          const isUserAnswer = item.user_answer === optKey;
                          const isCorrectAnswer = item.correct_answer === optKey;

                          let optionClass = 'bg-slate-900/40 border-slate-800 text-slate-400';
                          let badgeText = null;
                          let badgeClass = '';

                          if (isCorrectAnswer) {
                            // CORRECT ANSWER IS ALWAYS GREEN
                            optionClass =
                              'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-semibold shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30';
                            badgeText = isUserAnswer
                              ? 'Your Answer (Correct) ✓'
                              : 'Correct Answer ✓';
                            badgeClass = 'bg-emerald-500 text-white';
                          } else if (isUserAnswer && !isCorrect) {
                            // USER WRONG ANSWER IS EXPLICITLY RED
                            optionClass =
                              'bg-red-500/20 border-red-500 text-red-200 font-semibold shadow-md shadow-red-500/10 ring-1 ring-red-500/30';
                            badgeText = 'Your Answer (Wrong) ✗';
                            badgeClass = 'bg-red-500 text-white';
                          }

                          return (
                            <div
                              key={optKey}
                              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-sm transition-all ${optionClass}`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                    isCorrectAnswer
                                      ? 'bg-emerald-500 text-white'
                                      : isUserAnswer && !isCorrect
                                      ? 'bg-red-500 text-white'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {optKey}
                                </span>
                                <span className="leading-snug pt-0.5">{optText}</span>
                              </div>

                              {badgeText && (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 tracking-wide ${badgeClass}`}
                                >
                                  {badgeText}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                        {/* ✅ GREEN "Correct Answer" callout — shown prominently when user was WRONG */}
                        {!isCorrect && !isSkipped && item.correct_answer && (
                          <div className="mt-3 flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/50 shadow-lg shadow-emerald-900/30">
                            <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white text-sm font-extrabold flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/40">
                              {item.correct_answer}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-0.5">✅ Correct Answer</div>
                              <div className="text-sm font-semibold text-emerald-200 leading-snug">
                                {item.options?.[item.correct_answer] || `Option ${item.correct_answer}`}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* No Answer Key notice */}
                        {!item.correct_answer && !isSkipped && (
                          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                            <span>⚠️</span>
                            <span>No answer key for this question. Use <strong>🤖 AI Auto-Answer</strong> on the paper card to let Gemini fill in correct answers, then retake the test.</span>
                          </div>
                        )}
                        {/* Explanation / Notes if available */}
                        {item.explanation && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                            <span className="font-bold text-slate-200">Explanation:</span>{' '}
                            {item.explanation}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL: STEP 1 — Upload Question Paper                    */}
          {/* ======================================================== */}
          {showStep1Modal && (
            <div className="modal-overlay">
              <div className="glass-card p-6 w-full max-w-md space-y-5 animate-scale-up border border-slate-700 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="text-emerald-400" size={20} />
                    <div>
                      <h3 className="text-lg font-bold text-white">Step 1: Question Paper</h3>
                      <p className="text-xs text-slate-400">Upload your MCQ question paper</p>
                    </div>
                  </div>
                  <button onClick={() => setShowStep1Modal(false)} className="text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleStep1Submit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Title or Subject</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="e.g. DSA Mid-Term, MongoDB CA2"
                      value={step1Title}
                      onChange={e => setStep1Title(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      MCQ Question Paper (Image or PDF)
                    </label>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.bmp,.tiff,.gif,.pdf"
                      onChange={e => setStep1File(e.target.files[0])}
                      className="input w-full file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30"
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                    After uploading, you'll be asked to upload the <strong>answer key</strong> in Step 2.
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button type="button" onClick={() => setShowStep1Modal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={isUploadingStep1} className="btn-primary flex items-center gap-2 px-5 py-2 text-sm">
                      {isUploadingStep1
                        ? <><RefreshCw size={16} className="animate-spin" /> Uploading...</>
                        : <><Upload size={16} /> Upload & Continue</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL: STEP 2 — Upload Answer Key                        */}
          {/* ======================================================== */}
          {showStep2Modal && (
            <div className="modal-overlay">
              <div className="glass-card p-6 w-full max-w-md space-y-5 animate-scale-up border border-amber-500/30 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="text-amber-400" size={20} />
                    <div>
                      <h3 className="text-lg font-bold text-white">Step 2: Answer Key</h3>
                      <p className="text-xs text-slate-400 truncate max-w-[220px]">For: {step2PaperTitle}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowStep2Modal(false)} className="text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleStep2Submit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Answer Key File (Image or PDF)
                    </label>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.bmp,.tiff,.gif,.pdf"
                      onChange={e => setStep2File(e.target.files[0])}
                      className="input w-full file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/20 file:text-amber-400 hover:file:bg-amber-500/30"
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300">
                    Answer key format: <code className="text-emerald-400">1-A, 2-B, 3-C</code> or <code className="text-emerald-400">Answer: A</code> per question.
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowStep2Modal(false)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      Skip for Now
                    </button>
                    <button type="submit" disabled={isUploadingStep2} className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-lg transition-all">
                      {isUploadingStep2
                        ? <><RefreshCw size={16} className="animate-spin" /> Uploading...</>
                        : <><KeyRound size={16} /> Upload Answer Key</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL: PAST SESSION REVIEW DETAILS                       */}
          {/* ======================================================== */}
          {reviewModalSession && (
            <div className="modal-overlay">
              <div className="glass-card p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-5 animate-scale-up border border-slate-700 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {reviewModalSession.paper_title || 'Past Exam Review'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Score: {reviewModalSession.score} / {reviewModalSession.total_questions} (
                      {reviewModalSession.percentage}%) •{' '}
                      {reviewModalSession.created_at
                        ? new Date(reviewModalSession.created_at).toLocaleString()
                        : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setReviewModalSession(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  {(reviewModalSession.results || []).map((item, idx) => {
                    const isCorrect = item.is_correct;
                    const isSkipped = item.user_answer === null || item.user_answer === undefined;

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border ${
                          isCorrect
                            ? 'border-emerald-500/30 bg-emerald-950/10'
                            : isSkipped
                            ? 'border-amber-500/30 bg-amber-950/10'
                            : 'border-red-500/30 bg-red-950/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="font-semibold text-white text-sm">
                            <span className="text-emerald-400 mr-1.5 font-bold">Q{idx + 1}.</span>
                            {item.question_text}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isSkipped
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {isCorrect ? 'Correct ✓' : isSkipped ? 'Skipped' : 'Wrong ✗'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          {Object.entries(item.options || {}).map(([optKey, optText]) => {
                            const isUser = item.user_answer === optKey;
                            const isCorr = item.correct_answer === optKey;

                            let optStyle = 'text-slate-400 bg-slate-900/30 border-slate-800';
                            if (isCorr) {
                              optStyle =
                                'text-emerald-300 bg-emerald-500/20 border-emerald-500/60 font-semibold';
                            } else if (isUser && !isCorrect) {
                              optStyle =
                                'text-red-300 bg-red-500/20 border-red-500/60 font-semibold';
                            }

                            return (
                              <div
                                key={optKey}
                                className={`p-2 rounded-lg border flex items-center justify-between ${optStyle}`}
                              >
                                <span>
                                  <strong className="mr-1">{optKey}.</strong> {optText}
                                </span>
                                {isCorr && (
                                  <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded">
                                    Correct Answer
                                  </span>
                                )}
                                {isUser && !isCorrect && (
                                  <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded">
                                    Your Choice (Wrong)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setReviewModalSession(null)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Close Review
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
