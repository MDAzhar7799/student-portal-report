import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { LogIn, UserPlus, Eye, EyeOff, GraduationCap } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [form, setForm] = useState({
    username: 'admin',
    password: 'admin123',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        const res = await authAPI.login({
          username: form.username.trim(),
          password: form.password,
        });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      } else {
        // Register mode: if email is empty, construct a valid default email
        const safeEmail = form.email.trim() || `${form.username.trim().toLowerCase()}@student.edu`;
        
        const regRes = await authAPI.register({
          username: form.username.trim(),
          email: safeEmail,
          password: form.password,
          role: 'student',
        });

        // Auto login right after registration
        const loginRes = await authAPI.login({
          username: form.username.trim(),
          password: form.password,
        });

        localStorage.setItem('token', loginRes.data.token);
        localStorage.setItem('user', JSON.stringify(loginRes.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        (mode === 'login' ? 'Invalid username or password.' : 'Failed to create account. Try another username.')
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    if (newMode === 'register') {
      setForm({ username: '', password: '', email: '' });
    } else {
      setForm({ username: 'admin', password: 'admin123', email: '' });
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo and App Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <GraduationCap size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Student Portal</h1>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' ? 'Sign in to access your records' : 'Create your student account'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl mb-5 border border-slate-700/60">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
              User ID / Username
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder={mode === 'login' ? 'e.g. admin' : 'Choose a User ID'}
              className="form-input text-sm w-full"
              required
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. student@college.edu"
                className="form-input text-sm w-full"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Optional — defaults to your User ID if left blank
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter password'}
                className="form-input text-sm w-full pr-10"
                required
                minLength={mode === 'register' ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="spinner" style={{ width: '16px', height: '16px' }} />
            ) : mode === 'login' ? (
              <>
                <LogIn size={16} />
                Sign In
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Create & Sign In
              </>
            )}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-5 pt-4 border-t border-slate-700/60 text-center">
            <span className="text-xs text-slate-400">Default Admin: </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              admin / admin123
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
