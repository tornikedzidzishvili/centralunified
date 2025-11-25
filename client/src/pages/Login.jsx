import { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { LogIn, Building2, Globe, User } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [authMode, setAuthMode] = useState('domain'); // 'domain' or 'local'
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch public settings to get logo
    api.get('/settings/public').then(res => {
      if (res.data.logoUrl) {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        setLogoUrl(`${baseUrl}${res.data.logoUrl}`);
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/login', { username, password, authMode });
      if (res.data.success) {
        onLogin(res.data.user);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'არასწორი მონაცემები');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-12 sm:h-16 mx-auto mb-3 sm:mb-4 object-contain" />
            ) : (
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Central MFO</h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">Unified Platform</p>
          </div>
          
          {/* Auth Mode Toggle */}
          <div className="flex mb-5 sm:mb-6 bg-slate-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setAuthMode('domain')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all ${
                authMode === 'domain'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Globe size={14} className="sm:w-4 sm:h-4" />
              დომენი (AD)
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('local')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all ${
                authMode === 'local'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <User size={14} className="sm:w-4 sm:h-4" />
              ლოკალური
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                {authMode === 'domain' ? 'დომენის მომხმარებელი' : 'მომხმარებელი'}
              </label>
              <input 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm sm:text-base" 
                placeholder="შეიყვანეთ მომხმარებლის სახელი" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">პაროლი</label>
              <input 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm sm:text-base" 
                type="password" 
                placeholder="შეიყვანეთ პაროლი" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 sm:py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              <LogIn size={16} className="sm:w-[18px] sm:h-[18px]" />
              {loading ? 'შესვლა...' : 'შესვლა'}
            </button>
          </form>
        </div>
        <p className="text-center text-slate-500 text-xs sm:text-sm mt-4 sm:mt-6">© 2025 Central MFO. ყველა უფლება დაცულია.</p>
      </div>
    </div>
  );
}
