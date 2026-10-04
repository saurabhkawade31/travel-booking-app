import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { validateEmail, validatePassword } from '../lib/validation';
import { Map, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import GenuineIndiaMap from '../components/GenuineIndiaMap';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const setError = (msg: string) => { if (msg) toast.error(msg); };
  const setSuccess = (msg: string) => { if (msg) toast.success(msg); };
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      // Clear the state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(email, true);
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
      
      if (user.role !== 'customer') {
        throw new Error('Please use the appropriate portal for your role.');
      }
      
      login(user);
      localStorage.setItem('customerActiveTab', 'dashboard');
      navigate(`/dashboard/customer`);
    } catch (err: any) {
      let errorMessage = 'Failed to login';
      try {
        const parsedError = JSON.parse(err.message);
        errorMessage = parsedError.error || errorMessage;
      } catch (e) {
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
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
              <Map className="h-10 w-10 text-indigo-600" />
            </Link>
          </div>
          <h2 className="relative z-10 text-center text-3xl font-extrabold text-gray-900 drop-shadow-sm transition-colors duration-500">
            Welcome Back
          </h2>
          <p className="relative z-10 mt-2 text-center text-sm text-gray-500 transition-colors duration-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
              Register here
            </Link>
          </p>

          <form className="relative z-10 mt-6 sm:mt-8 space-y-3 sm:space-y-6" onSubmit={handleSubmit}>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 ml-1 transition-colors duration-500">
                Email address
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
                  className="appearance-none block w-full px-4 py-2.5 sm:py-3 bg-white/50 border border-gray-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm"
                  placeholder="you@example.com"
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
                  className="appearance-none block w-full px-4 py-2.5 sm:py-3 bg-white/50 border border-gray-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm pr-10"
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
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transform hover:scale-[1.02] transition-all duration-200"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
