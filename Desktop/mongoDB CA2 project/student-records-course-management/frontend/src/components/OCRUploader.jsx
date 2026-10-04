// =============================================================
// OCRUploader.jsx — OCR Image Upload Component
// Technology: React.js + Axios + OpenCV + pytesseract (backend)
// =============================================================

import { useState, useRef, useCallback } from 'react';
import { ocrAPI } from '../services/api';
import { Upload, ScanLine, CheckCircle, XCircle, FileImage } from 'lucide-react';

export default function OCRUploader({ onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
    setResult(null);
    setError('');
  }, []);

  const handleFile = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select a file first'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await ocrAPI.upload(formData);
      setResult(res.data);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'OCR processing failed. Ensure Tesseract is installed.');
    } finally {
      setLoading(false);
    }
  };

  const confidence = result?.document?.confidence || 0;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Drop Zone */}
      <div
        className={`upload-zone ${dragging ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleFile} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-600/20 flex items-center justify-center">
            <ScanLine size={28} style={{color:'#4ade80'}} />
          </div>
          {file ? (
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center mb-1">
                <FileImage size={16} style={{color:'#60a5fa'}} />
                <span className="text-sm font-semibold" style={{color:'var(--text-primary)'}}>{file.name}</span>
              </div>
              <span className="text-xs" style={{color:'var(--text-muted)'}}>{(file.size/1024).toFixed(1)} KB</span>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold mb-1" style={{color:'var(--text-primary)'}}>
                Drag & drop an image or click to browse
              </p>
              <p className="text-xs" style={{color:'var(--text-muted)'}}>
                Supports PNG, JPG, JPEG, BMP, TIFF
              </p>
              <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>
                Powered by OpenCV + pytesseract (Tesseract OCR)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      {file && (
        <button onClick={handleUpload} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? (
            <><div className="spinner" style={{width:'16px',height:'16px'}} /> Processing with OCR...</>
          ) : (
            <><Upload size={16} /> Extract Text with OCR</>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* OCR Result */}
      {result && (
        <div className="space-y-4 animate-slideUp">
          {/* Success Banner */}
          <div className="alert alert-success">
            <CheckCircle size={16} />
            OCR Processing Complete — {result.document?.original_name}
          </div>

          {/* Confidence Score */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{color:'var(--text-secondary)'}}>OCR Confidence</span>
              <span className="text-sm font-bold" style={{color: confidence > 80 ? '#4ade80' : confidence > 50 ? '#fbbf24' : '#f87171'}}>
                {confidence.toFixed(1)}%
              </span>
            </div>
            <div className="confidence-bar">
              <div className="confidence-fill" style={{
                width: `${confidence}%`,
                background: confidence > 80 ? '#4ade80' : confidence > 50 ? '#fbbf24' : '#f87171'
              }} />
            </div>
          </div>

          {/* Extracted Text */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-3" style={{color:'var(--text-secondary)'}}>
              Extracted Text (pytesseract)
            </h3>
            <pre className="text-xs whitespace-pre-wrap rounded-lg p-3"
              style={{background:'var(--bg-elevated)',color:'var(--text-primary)',fontFamily:'monospace',maxHeight:'200px',overflowY:'auto'}}>
              {result.ocr_result?.text || 'No text extracted'}
            </pre>
          </div>

          {/* Parsed Data */}
          {result.ocr_result?.parsed_data && Object.keys(result.ocr_result.parsed_data).length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold mb-3" style={{color:'var(--text-secondary)'}}>
                Parsed Student Data
              </h3>
              <div className="space-y-2">
                {Object.entries(result.ocr_result.parsed_data).map(([key, val]) => (
                  key !== 'raw_text_length' && key !== 'fields_extracted' && (
                    <div key={key} className="flex items-start gap-3">
                      <span className="text-xs badge badge-green" style={{minWidth:'90px',textAlign:'center'}}>{key}</span>
                      <span className="text-xs" style={{color:'var(--text-primary)'}}>
                        {Array.isArray(val) ? val.join(', ') : String(val)}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
