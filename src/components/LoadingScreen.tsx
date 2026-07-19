import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Globe, Compass, BookOpen, Clock, CheckCircle, Shield } from 'lucide-react';

interface LoadingScreenProps {
  isDarkMode: boolean;
  userName: string;
  role: 'student' | 'teacher' | null;
}

export default function LoadingScreen({ isDarkMode, userName, role }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);

  // Classroom academic quotes & tips to display during loading
  const academicTips = [
    { icon: <Compass className="w-4 h-4 text-rose-500" />, text: "History isn't just about dates—it's about understanding human choices and their consequences." },
    { icon: <Globe className="w-4 h-4 text-emerald-500" />, text: "Geography helps us see how climate, terrain, and resources shape civilizations." },
    { icon: <BookOpen className="w-4 h-4 text-blue-500" />, text: "Civics empowers you as a citizen—understanding governance is your key to change." },
    { icon: <Clock className="w-4 h-4 text-amber-500" />, text: "Consistent daily study of 30-45 minutes is proven to boost Social Science retention." }
  ];

  // Rotate tips every 1300ms to keep the 5.2s loading screen dynamic
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % academicTips.length);
    }, 1300);
    return () => clearInterval(tipInterval);
  }, []);

  // Precise 5.2-second progression logic (0 to 100)
  useEffect(() => {
    const startTime = Date.now();
    const duration = 5200;
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);
      
      if (elapsed >= duration) {
        clearInterval(progressInterval);
      }
    }, 16); // ~60fps updates for supreme fluid rendering

    return () => clearInterval(progressInterval);
  }, []);

  // Determine sub-label description based on progress percentage
  const getProgressLabel = () => {
    if (progress < 25) return "Securing secure portal socket...";
    if (progress < 55) return "Synching Class Syllabus & Roster...";
    if (progress < 80) return "Compiling study report metrics...";
    if (progress < 95) return "Refining visual layout...";
    return "Entering classroom dashboard...";
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300 font-sans ${
      isDarkMode 
        ? 'bg-slate-950 text-slate-100' 
        : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Dynamic backdrop ambient grid */}
      <div className={`absolute inset-0 opacity-[0.025] pointer-events-none ${
        isDarkMode ? 'bg-[radial-gradient(#ffffff_1px,transparent_1px)]' : 'bg-[radial-gradient(#000000_1px,transparent_1px)]'
      } [background-size:20px_20px]`}></div>

      {/* Decorative floating blurred orbs for premium aesthetic */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none"></div>

      {/* Main Container Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`w-full max-w-md rounded-3xl p-8 border shadow-2xl relative z-10 text-center ${
          isDarkMode 
            ? 'bg-slate-900/90 border-slate-800/80 backdrop-blur-md shadow-slate-950/60' 
            : 'bg-white/95 border-slate-200/80 backdrop-blur-md shadow-slate-200/60'
        }`}
      >
        {/* Animated Icon Container */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Pulsing ring outer */}
          <div className={`absolute inset-0 rounded-full border-2 animate-ping opacity-25 ${
            isDarkMode ? 'border-blue-500' : 'border-blue-600'
          }`}></div>
          
          {/* Animated SVG ring loader */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle 
              cx="50" 
              cy="50" 
              r="42" 
              className={`stroke-current fill-none ${
                isDarkMode ? 'text-slate-800' : 'text-slate-100'
              }`} 
              strokeWidth="6"
            />
            <motion.circle 
              cx="50" 
              cy="50" 
              r="42" 
              className={`stroke-current fill-none ${
                isDarkMode ? 'text-blue-500' : 'text-blue-600'
              }`} 
              strokeWidth="6"
              strokeDasharray="264"
              strokeDashoffset={264 - (264 * progress) / 100}
              strokeLinecap="round"
              transition={{ ease: "easeInOut" }}
            />
          </svg>

          {/* Absolute Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {role === 'teacher' ? (
              <Shield className={`w-8 h-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            ) : (
              <GraduationCap className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            )}
          </div>
        </div>

        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-1"
        >
          <span className={`text-[10px] tracking-widest font-extrabold uppercase px-3 py-1 rounded-full border ${
            role === 'teacher' 
              ? isDarkMode ? 'bg-indigo-950/50 border-indigo-900 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-700'
              : isDarkMode ? 'bg-blue-950/50 border-blue-900 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'
          }`}>
            {role === 'teacher' ? 'Teacher Access' : 'Student Access'}
          </span>
          <h2 className={`text-xl font-bold tracking-tight mt-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Welcome, {userName}
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
            Entering the SST Classroom Space
          </p>
        </motion.div>

        {/* Custom Progress Bar and Percent */}
        <div className="mt-8 space-y-2">
          <div className="flex justify-between items-center text-[11px] font-bold">
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {getProgressLabel()}
            </span>
            <span className={`font-mono ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {progress}%
            </span>
          </div>
          
          <div className={`w-full h-2 rounded-full overflow-hidden ${
            isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            <div 
              style={{ width: `${progress}%` }}
              className={`h-full transition-all duration-75 ease-out rounded-full ${
                role === 'teacher' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600'
              }`}
            />
          </div>
        </div>

        {/* Rotating Academic Quote Box */}
        <div className={`mt-8 p-4 rounded-2xl border text-left flex items-start gap-3 transition-all duration-300 min-h-[84px] ${
          isDarkMode 
            ? 'bg-slate-950/50 border-slate-850/80' 
            : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="mt-0.5 shrink-0">
            {academicTips[currentTip].icon}
          </div>
          <div className="space-y-1">
            <span className={`text-[9px] uppercase tracking-wider font-extrabold block ${
              isDarkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Classroom Wisdom
            </span>
            <p className={`text-[11px] leading-relaxed font-semibold transition-all duration-300 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              {academicTips[currentTip].text}
            </p>
          </div>
        </div>

        {/* Footer info branding */}
        <div className={`text-[9px] font-extrabold uppercase tracking-widest mt-8 ${
          isDarkMode ? 'text-slate-600' : 'text-slate-400'
        }`}>
          SST Daily Study Tracker • Board Prep 2026
        </div>
      </motion.div>
    </div>
  );
}
