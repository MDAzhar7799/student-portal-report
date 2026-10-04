// =============================================================
// api.js — Axios API Service Layer
// =============================================================
// Technology: React.js + Axios + REST API (Flask backend)
// Base URL: http://localhost:5000/api
// =============================================================

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

// Create Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ─── Request Interceptor — Attach JWT Token ───
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — Handle 401 ───
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth Endpoints ───
export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout:   ()     => api.post('/auth/logout'),
  me:       ()     => api.get('/auth/me'),
};

// ─── Students Endpoints ───
export const studentsAPI = {
  getAll:        (params) => api.get('/students/', { params }),
  getOne:        (id)     => api.get(`/students/${id}`),
  create:        (data)   => api.post('/students/', data),
  update:        (id, data) => api.put(`/students/${id}`, data),
  delete:        (id)     => api.delete(`/students/${id}`),
  search:        (params) => api.get('/students/search/advanced', { params }),
};

// ─── Courses Endpoints ───
export const coursesAPI = {
  getAll:  (params)    => api.get('/courses/', { params }),
  getOne:  (id)        => api.get(`/courses/${id}`),
  create:  (data)      => api.post('/courses/', data),
  update:  (id, data)  => api.put(`/courses/${id}`, data),
  delete:  (id)        => api.delete(`/courses/${id}`),
};

// ─── Enrollments Endpoints ───
export const enrollmentsAPI = {
  getAll:          (params) => api.get('/enrollments/', { params }),
  enroll:          (data)   => api.post('/enrollments/', data),
  drop:            (id)     => api.delete(`/enrollments/${id}`),
  getByStudent:    (id)     => api.get(`/enrollments/student/${id}`),
  getByCourse:     (id)     => api.get(`/enrollments/course/${id}`),
};

// ─── Results Endpoints ───
export const resultsAPI = {
  getAll:       (params)   => api.get('/results/', { params }),
  addResult:    (data)     => api.post('/results/', data),
  update:       (id, data) => api.put(`/results/${id}`, data),
  delete:       (id)       => api.delete(`/results/${id}`),
  getByStudent: (id)       => api.get(`/results/student/${id}`),
  getByCourse:  (id)       => api.get(`/results/course/${id}`),
};

// ─── Analytics Endpoints ───
export const analyticsAPI = {
  dashboard:       ()     => api.get('/analytics/dashboard'),
  gradeDistribution: ()   => api.get('/analytics/grades'),
  departments:     ()     => api.get('/analytics/departments'),
  topStudents:     (n)    => api.get('/analytics/top-students', { params: { limit: n } }),
  courseStats:     ()     => api.get('/analytics/course-stats'),
  scoreTrends:     ()     => api.get('/analytics/score-trends'),
  predictGrade:    (data) => api.post('/analytics/predict-grade', data),
  enrollmentTrends: ()    => api.get('/analytics/enrollment-trends'),
};

// ─── OCR Endpoints ───
export const ocrAPI = {
  upload:      (formData) => api.post('/ocr/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDocuments: (params)  => api.get('/ocr/documents', { params }),
  getOne:       (id)      => api.get(`/ocr/documents/${id}`),
  delete:       (id)      => api.delete(`/ocr/documents/${id}`),
};

// ─── MCQ Practice Endpoints ───
export const mcqAPI = {
  // Papers
  upload:          (formData) => api.post('/mcq/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadAnswerKey: (formData) => api.post('/mcq/upload-answer-key', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  geminiAnswers:   (paperId)  => api.post('/mcq/gemini-answers', { paper_id: paperId }),
  getPapers:    (params)     => api.get('/mcq/papers', { params }),
  getPaper:     (id)         => api.get(`/mcq/papers/${id}`),
  deletePaper:  (id)         => api.delete(`/mcq/papers/${id}`),

  // Sessions
  startSession: (data)       => api.post('/mcq/sessions', data),
  submitSession:(id, data)   => api.post(`/mcq/sessions/${id}/submit`, data),
  getSessions:  (params)     => api.get('/mcq/sessions', { params }),
  getSession:   (id)         => api.get(`/mcq/sessions/${id}`),
};

// ─── Health Check ───
export const healthCheck = () => api.get('/health');

// ─── CGPA Calculator Endpoints ───
export const cgpaAPI = {
  calculate:      (data)       => api.post('/cgpa/calculate', data),
  uploadDataset:  (formData)   => api.post('/cgpa/upload-dataset', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDatasets:    ()           => api.get('/cgpa/datasets'),
  getDataset:     (id)         => api.get(`/cgpa/datasets/${id}`),
  deleteDataset:  (id)         => api.delete(`/cgpa/datasets/${id}`),
  getHistory:     (params)     => api.get('/cgpa/history', { params }),
  predict:        (data)       => api.post('/cgpa/predict', data),
};

export default api;
