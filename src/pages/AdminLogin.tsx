import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { validateEmail, validatePassword } from '../lib/validation';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import GenuineIndiaMap from '../components/GenuineIndiaMap';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const setError = (msg: string) => { if (msg) toast.error(msg); };
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For admin, we might not want to restrict domains, so pass false
    const emailError = validateEmail(email, false);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const user = await api.login({ email, password });
      
      if (user.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.');
      }
      
      login(user);
      navigate(`/dashboard/admin`);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[100dvh] relative flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500 overflow-y-auto"
    >
      {/* Background Image */}
      <div className="fixed inset-0 z-0 bg-[#F5F5F7] dark:bg-[#060608] transition-colors duration-500">
        <GenuineIndiaMap />
      </div>

      <div className="relative z-20 w-full max-w-md mx-auto">
        <div 
          className="rounded-[24px] p-6 sm:p-12 shadow-2xl w-full bg-white/20 backdrop-blur-3xl border border-gray-200 transition-colors duration-500 relative overflow-hidden"
        >
          {/* Subtle noise for premium dark mode */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
          
          <div className="relative z-10 flex justify-center mb-6">
            <Link to="/" className="hover:opacity-80 transition-opacity bg-white/50 p-3 rounded-full border border-gray-200">
              <ShieldCheck className="h-10 w-10 text-indigo-600" />
            </Link>
          </div>
          <h2 className="relative z-10 text-center text-3xl font-extrabold text-gray-900 drop-shadow-sm transition-colors duration-500">
            Admin Portal
          </h2>

          <form className="relative z-10 mt-6 sm:mt-8 space-y-3 sm:space-y-6" onSubmit={handleSubmit}>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 ml-1 transition-colors duration-500">
                Admin Email
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-2.5 sm:py-3 bg-white/50 border border-gray-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 ml-1 transition-colors duration-500">
                Password
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-2.5 sm:py-3 bg-white/50 border border-gray-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full relative flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transform active:scale-[0.98]"
              >
                {loading ? 'Signing in...' : 'Sign in as Admin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
