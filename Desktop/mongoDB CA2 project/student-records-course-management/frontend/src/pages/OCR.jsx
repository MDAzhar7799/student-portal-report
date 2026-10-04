// =============================================================
// OCR.jsx — Optical Character Recognition Document Scanner
// Technology: React.js + OpenCV + pytesseract + PyMongo (MongoDB)
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { ocrAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import OCRUploader from '../components/OCRUploader';
import {
  ScanLine, FileText, Trash2, Eye, RefreshCw, Cpu,
  CheckCircle, AlertCircle, X, Sparkles
} from 'lucide-react';

export default function OCR() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [alert, setAlert] = useState(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ocrAPI.getDocuments({ limit: 30 });
      setDocuments(res.data.documents || []);
    } catch {
      setAlert({ type: 'error', text: 'Could not load scanned document records' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id, filename) => {
    if (!window.confirm(`Delete document record for "${filename}"?`)) return;
    try {
      await ocrAPI.delete(id);
      setAlert({ type: 'success', text: `Document ${filename} deleted from MongoDB` });
      if (selectedDoc?.id === id) setSelectedDoc(null);
      fetchDocuments();
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.error || 'Failed to delete' });
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="main-content flex-1">
        <Navbar title="Smart OCR Document Scanner" />

        <div className="p-6 space-y-6">
          {/* Tech Explanation Banner */}
          <div className="glass-card p-5 border border-cyan-500/20 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/40">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <Cpu size={18} />
                  <span>Integrated OCR Pipeline: OpenCV + pytesseract + MongoDB</span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Upload mark sheets, transcripts, or student ID cards. The backend executes OpenCV image preprocessing
                  (Grayscale &rarr; Gaussian Blur &rarr; Otsu Thresholding &rarr; Deskewing), extracts text via Tesseract OCR,
                  and parses structured fields directly into MongoDB records.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-green text-xs flex items-center gap-1">
                  <Sparkles size={12} /> OpenCV 4.x
                </span>
                <span className="badge badge-purple text-xs">pytesseract</span>
                <span className="badge badge-blue text-xs">MongoDB Storage</span>
              </div>
            </div>
          </div>

          {/* Feedback message */}
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Uploader Column */}
            <div className="lg:col-span-6 space-y-4">
              <div className="glass-card p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <ScanLine size={18} className="text-emerald-400" />
                  Scan New Document
                </h3>
                <OCRUploader onSuccess={() => {
                  fetchDocuments();
                  setAlert({ type: 'success', text: 'Document scanned and stored successfully!' });
                }} />
              </div>
            </div>

            {/* Scanned Documents History Column */}
            <div className="lg:col-span-6 space-y-4">
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <FileText size={18} className="text-blue-400" />
                    OCR History & MongoDB Documents
                  </h3>
                  <button
                    onClick={fetchDocuments}
                    className="btn-secondary text-xs p-2"
                    title="Refresh List"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="spinner"></div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <FileText size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No processed documents found yet</p>
                    <p className="text-xs text-slate-500 mt-1">Upload an image on the left to start OCR</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                    {documents.map((doc) => {
                      const conf = doc.confidence || 0;
                      const confColor =
                        conf >= 80 ? 'text-emerald-400' : conf >= 60 ? 'text-amber-400' : 'text-rose-400';

                      return (
                        <div
                          key={doc.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            selectedDoc?.id === doc.id
                              ? 'bg-blue-600/15 border-blue-500/40'
                              : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                                <FileText size={16} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white truncate max-w-[200px]">
                                  {doc.filename || doc.original_filename || 'Scanned Document'}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {doc.created_at ? new Date(doc.created_at).toLocaleString() : 'Recent'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold font-mono ${confColor}`}>
                                {conf.toFixed(0)}%
                              </span>
                              <button
                                onClick={() => setSelectedDoc(doc)}
                                className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400"
                                title="View Details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(doc.id, doc.filename || 'Document')}
                                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400"
                                title="Delete Document"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {doc.parsed_data && Object.keys(doc.parsed_data).length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap gap-1.5">
                              {doc.parsed_data.name && (
                                <span className="badge badge-purple text-[10px]">
                                  Name: {doc.parsed_data.name}
                                </span>
                              )}
                              {doc.parsed_data.student_id && (
                                <span className="badge badge-blue text-[10px]">
                                  ID: {doc.parsed_data.student_id}
                                </span>
                              )}
                              {doc.parsed_data.gpa && (
                                <span className="badge badge-green text-[10px]">
                                  GPA: {doc.parsed_data.gpa}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Detail Modal */}
          {selectedDoc && (
            <div
              className="modal-overlay"
              onClick={(e) => e.target === e.currentTarget && setSelectedDoc(null)}
            >
              <div className="modal max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-emerald-400" />
                    <h2 className="text-lg font-bold text-white">
                      Document Details: {selectedDoc.filename || 'Scanned File'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-slate-400 block mb-1">Confidence Score</span>
                      <span className="text-base font-bold text-emerald-400">
                        {(selectedDoc.confidence || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-slate-400 block mb-1">Scanned Date</span>
                      <span className="text-slate-200">
                        {selectedDoc.created_at ? new Date(selectedDoc.created_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {selectedDoc.parsed_data && (
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                        Structured Extracted Fields
                      </h4>
                      <pre className="text-xs text-emerald-300 font-mono overflow-x-auto bg-black/40 p-2.5 rounded-lg">
                        {JSON.stringify(selectedDoc.parsed_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Raw Extracted Text
                    </h4>
                    <div className="bg-black/50 border border-white/10 rounded-xl p-3 max-h-56 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {selectedDoc.raw_text || selectedDoc.extracted_text || 'No text extracted'}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="btn-secondary text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
