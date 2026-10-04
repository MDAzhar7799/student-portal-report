// =============================================================
// Analytics.jsx — Academic Analytics & Machine Learning Prediction
// Technology: React.js + Chart.js + PyMongo Aggregations + ML Predictor
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  BarChart3, BrainCircuit, RefreshCw, Layers, Award,
  Sparkles, CheckCircle, TrendingUp
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [gradeDist, setGradeDist] = useState(null);
  const [deptStats, setDeptStats] = useState(null);
  const [scoreTrends, setScoreTrends] = useState(null);

  // ML Predictor state
  const [mlInputs, setMlInputs] = useState({
    attendance: 85,
    assignments_avg: 78,
    midterm_score: 72
  });
  const [mlResult, setMlResult] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  const fetchAllAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, gradeRes, deptRes, trendRes] = await Promise.all([
        analyticsAPI.dashboard(),
        analyticsAPI.gradeDistribution(),
        analyticsAPI.departments(),
        analyticsAPI.scoreTrends()
      ]);
      setDashboard(dashRes.data);
      setGradeDist(gradeRes.data);
      setDeptStats(deptRes.data.departments || []);
      setScoreTrends(trendRes.data.trends || []);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  const handlePredict = async (e) => {
    e.preventDefault();
    setMlLoading(true);
    try {
      const res = await analyticsAPI.predictGrade(mlInputs);
      setMlResult(res.data);
    } catch (err) {
      console.error('ML Prediction failed', err);
    } finally {
      setMlLoading(false);
    }
  };

  // Grade Distribution Chart Data
  const doughnutData = {
    labels: gradeDist?.labels || [],
    datasets: [
      {
        data: gradeDist?.data || [],
        backgroundColor: [
          '#22c55e', '#4ade80', '#86efac',
          '#3b82f6', '#60a5fa', '#93c5fd',
          '#f59e0b', '#fbbf24', '#f97316',
          '#ef4444', '#dc2626'
        ],
        borderWidth: 1,
        borderColor: '#0f172a'
      }
    ]
  };

  // Department Stats Bar Data
  const deptLabels = deptStats?.map((d) => d.department) || [];
  const deptStudents = deptStats?.map((d) => d.student_count) || [];
  const deptAvgCgpa = deptStats?.map((d) => d.avg_cgpa) || [];

  const barData = {
    labels: deptLabels,
    datasets: [
      {
        label: 'Student Enrolled',
        data: deptStudents,
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 6
      },
      {
        label: 'Average CGPA',
        data: deptAvgCgpa,
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  // Score Trends Line Data
  const trendLabels = scoreTrends?.map((t) => t.label) || ['Recent'];
  const trendScores = scoreTrends?.map((t) => t.avg_score) || [0];

  const lineData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Avg Exam Score (%)',
        data: trendScores,
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#c084fc',
        pointRadius: 5
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 11 } }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      y: {
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="main-content flex-1">
        <Navbar title="Academic Analytics & Intelligence" />

        <div className="p-6 space-y-6">
          {/* Top Aggregation Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-emerald-400" size={22} />
              <div>
                <h2 className="text-lg font-bold text-white">MongoDB Aggregation Analytics</h2>
                <p className="text-xs text-slate-400">
                  Real-time pipeline calculations: $match, $group, $avg, $sum, $sort
                </p>
              </div>
            </div>
            <button
              onClick={fetchAllAnalytics}
              className="btn-secondary text-sm p-2.5"
              title="Refresh Analytics"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Quick Metrics */}
          {dashboard && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-label">Active Students</div>
                <div className="stat-value text-emerald-400">{dashboard.total_students}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">System Avg CGPA</div>
                <div className="stat-value text-blue-400">{dashboard.average_cgpa} / 4.0</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Exam Score</div>
                <div className="stat-value text-purple-400">{dashboard.average_score}%</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Results Evaluated</div>
                <div className="stat-value text-amber-400">{dashboard.total_results}</div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Department Bar Chart */}
            <div className="lg:col-span-8 glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Layers size={16} className="text-blue-400" />
                Department Enrollment & Average CGPA ($group by department)
              </h3>
              <div className="h-72">
                {loading ? (
                  <div className="h-full flex items-center justify-center"><div className="spinner"></div></div>
                ) : (
                  <Bar data={barData} options={chartOptions} />
                )}
              </div>
            </div>

            {/* Grade Doughnut Chart */}
            <div className="lg:col-span-4 glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                Grade Distribution ($group by letter_grade)
              </h3>
              <div className="h-72 flex items-center justify-center">
                {loading ? (
                  <div className="spinner"></div>
                ) : (
                  <Doughnut
                    data={doughnutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ML Grade Prediction & Trends Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Machine Learning Prediction Form Card */}
            <div className="lg:col-span-6 glass-card p-5 border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-slate-900/40">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <BrainCircuit size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    Machine Learning Grade Predictor
                    <Sparkles size={14} className="text-purple-400" />
                  </h3>
                  <span className="text-xs text-slate-400">
                    Model: Weighted Linear Performance Regression
                  </span>
                </div>
              </div>

              <form onSubmit={handlePredict} className="space-y-3.5 mt-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label className="text-slate-300 font-medium">Class Attendance Rate (%)</label>
                    <span className="text-emerald-400 font-bold">{mlInputs.attendance}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    value={mlInputs.attendance}
                    onChange={(e) => setMlInputs({ ...mlInputs, attendance: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label className="text-slate-300 font-medium">Assignments Average (0 - 100)</label>
                    <span className="text-blue-400 font-bold">{mlInputs.assignments_avg} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={mlInputs.assignments_avg}
                    onChange={(e) => setMlInputs({ ...mlInputs, assignments_avg: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label className="text-slate-300 font-medium">Midterm Exam Score (0 - 100)</label>
                    <span className="text-purple-400 font-bold">{mlInputs.midterm_score} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={mlInputs.midterm_score}
                    onChange={(e) => setMlInputs({ ...mlInputs, midterm_score: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={mlLoading}
                  className="btn-primary w-full justify-center text-sm py-2.5 mt-2"
                >
                  {mlLoading ? 'Computing Model...' : 'Calculate Predicted Grade'}
                </button>
              </form>

              {/* ML Result Display */}
              {mlResult && (
                <div className="mt-5 p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 animate-fadeIn">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-purple-300 font-semibold flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-400" />
                      Predicted Outcome
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Conf: {(mlResult.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-black/40">
                      <span className="text-[11px] text-slate-400 block">Est. Score</span>
                      <span className="text-lg font-bold text-white">{mlResult.predicted_score}%</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40">
                      <span className="text-[11px] text-slate-400 block">Grade</span>
                      <span className="text-xl font-extrabold text-emerald-400">{mlResult.predicted_grade}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40">
                      <span className="text-[11px] text-slate-400 block">Est. GPA</span>
                      <span className="text-lg font-bold text-blue-400">{mlResult.predicted_gpa.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Score Trends Line Chart */}
            <div className="lg:col-span-6 glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-400" />
                Score Trend Analysis ($group by month, $avg score)
              </h3>
              <div className="h-72">
                {loading ? (
                  <div className="h-full flex items-center justify-center"><div className="spinner"></div></div>
                ) : (
                  <Line data={lineData} options={chartOptions} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
