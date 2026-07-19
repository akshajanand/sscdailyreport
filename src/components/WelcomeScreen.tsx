import React, { useState } from 'react';
import { motion } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GraduationCap, ChevronRight, Sun, Moon, AlertCircle, Loader2 } from 'lucide-react';

interface WelcomeScreenProps {
  onJoin: (name: string, role: 'student' | 'teacher') => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function WelcomeScreen({ onJoin, isDarkMode, onToggleTheme }: WelcomeScreenProps) {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = loginInput.trim();
    const pwd = passwordInput.trim();

    if (!name) {
      setError('Please enter your registered student name or teacher credentials.');
      return;
    }

    // Teacher authorization check
    const isTeacherLogin = name === '1221' || pwd === '1221';

    if (isTeacherLogin) {
      onJoin('Ashish Sir', 'teacher');
      return;
    }

    // Otherwise, treat as student login - password required
    if (!pwd) {
      setError('Please enter your student password. Default is "gurukul".');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: dbErr } = await supabase
        .from('ssc_students')
        .select('*')
        .ilike('name', name);

      if (dbErr) {
        setError('Database lookup error. Ensure your Supabase database is connected and initialized.');
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const studentRecord = data[0];
        const dbPassword = studentRecord.password || 'gurukul';
        
        if (pwd === dbPassword) {
          onJoin(studentRecord.name, 'student');
        } else {
          setError('Incorrect password. The default password for new students is "gurukul".');
        }
      } else {
        setError(`Access Denied: "${name}" is not registered on the class roster. Only your Social Science Teacher can add you.`);
      }
    } catch (err) {
      setError('Connection failure. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 font-sans ${
      isDarkMode 
        ? 'bg-slate-950 text-slate-100' 
        : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Subtle formal background pattern */}
      <div className={`absolute inset-0 opacity-[0.015] pointer-events-none ${
        isDarkMode ? 'bg-[radial-gradient(#ffffff_1px,transparent_1px)]' : 'bg-[radial-gradient(#000000_1px,transparent_1px)]'
      } [background-size:24px_24px]`}></div>

      {/* Main Container Card with Spring Animation */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className={`w-full max-w-md rounded-3xl overflow-hidden relative z-10 border shadow-2xl transition-all duration-300 ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800 shadow-slate-950/60' 
            : 'bg-white border-slate-200 shadow-slate-200/50'
        }`}
      >
        
        {/* Banner */}
        <div className={`p-6 text-center relative border-b transition-all ${
          isDarkMode 
            ? 'bg-slate-950 border-slate-800 text-white' 
            : 'bg-slate-100 border-slate-200 text-slate-900'
        }`}>
          {/* Quick theme switcher */}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-all border ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 15 }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border transition-all ${
              isDarkMode
                ? 'bg-blue-950/50 border-blue-800 text-blue-400'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            <GraduationCap className="w-6 h-6" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-bold tracking-tight"
          >
            SST Classroom Portal
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className={`text-[10px] mt-1 uppercase tracking-widest font-extrabold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
          >
            Social Science Study Tracker
          </motion.p>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-start gap-2.5 font-semibold leading-relaxed overflow-hidden"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-1.5"
            >
              <label htmlFor="login-input" className={`text-[10px] uppercase tracking-wider font-extrabold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Full Name / Passcode
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="login-input"
                  placeholder="e.g. Rohan Verma"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  disabled={isLoading}
                  required
                  className={`w-full border rounded-xl py-3 px-4 text-xs outline-none transition-all ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-850 text-white focus:border-blue-500 placeholder:text-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600 placeholder:text-slate-400'
                  }`}
                />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="space-y-1.5"
            >
              <label htmlFor="password-input" className={`text-[10px] uppercase tracking-wider font-extrabold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password-input"
                  placeholder="Student password (default is gurukul)"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  disabled={isLoading}
                  className={`w-full border rounded-xl py-3 px-4 text-xs outline-none transition-all ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-850 text-white focus:border-blue-500 placeholder:text-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600 placeholder:text-slate-400'
                  }`}
                />
              </div>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Enter Classroom Portal</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
