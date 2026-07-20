import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { SSCReport, NewSSCReport, SSCMessage, NewSSCMessage, SSCFeedItem, SSCChannel } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import LoadingScreen from './components/LoadingScreen';
import ReportBubble from './components/ReportBubble';
import ChatInput from './components/ChatInput';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from './lib/imageCompressor';
import { 
  Search, 
  LogOut, 
  RefreshCw, 
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  BookOpen,
  Filter,
  Sun,
  Moon,
  GraduationCap,
  Shield,
  FileText,
  Key,
  Clock,
  Users,
  TrendingUp,
  Sparkles,
  Award,
  Send,
  Paperclip,
  MessageSquare,
  Plus,
  Loader2,
  Image,
  Upload,
  X,
  Zap
} from 'lucide-react';

const getAvatarColor = (name: string, isDark: boolean) => {
  const colorsLight = [
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
  ];
  const colorsDark = [
    'bg-rose-950/40 text-rose-300 border-rose-900/50',
    'bg-emerald-950/40 text-emerald-300 border-emerald-900/50',
    'bg-blue-950/40 text-blue-300 border-blue-900/50',
    'bg-amber-950/40 text-amber-300 border-amber-900/50',
    'bg-purple-950/40 text-purple-300 border-purple-900/50',
    'bg-indigo-950/40 text-indigo-300 border-indigo-900/50',
    'bg-cyan-950/40 text-cyan-300 border-cyan-900/50',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorsLight.length;
  return isDark ? colorsDark[index] : colorsLight[index];
};

const SUBJECT_SUGGESTIONS: Record<string, string[]> = {
  'History': [
    'Rise of Nationalism in Europe',
    'Nationalism in India',
    'The Making of a Global World',
    'The Age of Industrialisation'
  ],
  'Geography': [
    'Resources and Development',
    'Water Resources',
    'Agriculture',
    'Minerals and Energy Resources'
  ],
  'Civics': [
    'Power Sharing',
    'Federalism',
    'Political Parties',
    'Outcomes of Democracy'
  ],
  'Economics': [
    'Sectors of the Indian Economy',
    'Money and Credit',
    'Globalisation',
    'Development Concepts'
  ]
};

export default function App() {
  // Theme state: default is Light Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('ssc_theme');
    return saved === 'dark';
  });

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newVal = !prev;
      localStorage.setItem('ssc_theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Authentication & Roles
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem('ssc_user_name'));
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(() => {
    const role = localStorage.getItem('ssc_user_role');
    return (role === 'student' || role === 'teacher') ? role : null;
  });

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  // Chat-specific Search State (decouples sidebar search from conversation search)
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);

  // Student Chat view category tab ('all' | 'channels' | 'peers')
  const [studentChatTab, setStudentChatTab] = useState<'all' | 'channels' | 'peers'>('all');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reports State
  const [reports, setReports] = useState<SSCReport[]>([]);
  // Messages State
  const [messages, setMessages] = useState<SSCMessage[]>([]);
  
  // Dynamic Channels State
  const [channels, setChannels] = useState<SSCChannel[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelIsGlobal, setNewChannelIsGlobal] = useState(true);
  const [newChannelAllowedStudents, setNewChannelAllowedStudents] = useState<string[]>([]);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Classroom Students Roster State (Managed by Teacher)
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [rosterRefresh, setRosterRefresh] = useState(0);
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Student Settings Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsStatus, setSettingsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Transition loading states
  const [isTransitionLoading, setIsTransitionLoading] = useState(false);
  const [tempUserName, setTempUserName] = useState<string>('');
  const [tempUserRole, setTempUserRole] = useState<'student' | 'teacher' | null>(null);
  const [selectedStudentChat, setSelectedStudentChat] = useState<string | null>(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState<boolean>(false);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Custom premium Toast notification state
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Auto-dismiss toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ isOpen: true, message, type });
  }, []);

  useEffect(() => {
    if (toast?.isOpen) {
      const timer = setTimeout(() => {
        setToast(prev => prev ? { ...prev, isOpen: false } : null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast?.isOpen]);

  // WhatsApp Workspace Interactive Input states
  const [chatInputText, setChatInputText] = useState('');
  const [isLogTrayOpen, setIsLogTrayOpen] = useState(false);
  const [logSubject, setLogSubject] = useState('History');
  const [logTopic, setLogTopic] = useState('');
  const [logDuration, setLogDuration] = useState('1 hour');
  const [logPhotos, setLogPhotos] = useState<string[]>([]);
  const [isCompressingLogPhotos, setIsCompressingLogPhotos] = useState(false);
  const [logTrayError, setLogTrayError] = useState<string | null>(null);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  
  const logFileInputRef = React.useRef<HTMLInputElement>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // Fetch registered student profiles
  const fetchStudents = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error: fetchErr } = await supabase
        .from('ssc_students')
        .select('id, created_at, name')
        .order('name', { ascending: true });
      if (!fetchErr && data) {
        setStudents(data);
      }
    } catch (err) {
      console.error('Failed to fetch student profiles:', err);
    }
  }, []);

  // Fetch students if user is logged in
  useEffect(() => {
    if (userName) {
      fetchStudents();
    }
  }, [fetchStudents, userName, rosterRefresh]);

  // Fetch Reports from Supabase
  const fetchReports = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('ssc_reports')
        .select('*')
        .order('created_at', { ascending: false }); // Show newest first for high-level academic dashboard feel

      if (fetchError) throw fetchError;
      setReports(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch academic reports.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch separated chat messages from Supabase
  const fetchMessages = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error: fetchErr } = await supabase
        .from('ssc_messages')
        .select('*')
        .order('created_at', { ascending: true }); // chronological chat history

      if (!fetchErr && data) {
        setMessages(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  // Fetch dynamic channels from Supabase
  const fetchChannels = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error: fetchErr } = await supabase
        .from('ssc_channels')
        .select('*')
        .order('name', { ascending: true });

      if (!fetchErr && data) {
        setChannels(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  }, []);

  // Initial fetch channels when userName is ready
  useEffect(() => {
    if (userName) {
      fetchChannels();
    }
  }, [userName, fetchChannels]);

  // Poll for updates every 15 seconds (as a fallback)
  useEffect(() => {
    fetchReports();
    fetchMessages();
    fetchChannels();
    const interval = setInterval(() => {
      fetchReports();
      fetchMessages();
      fetchChannels();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchReports, fetchMessages, fetchChannels, refreshTrigger]);

  // Real-time Supabase replication subscription for true WhatsApp-like instantaneous updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const reportsChannel = supabase
      .channel('realtime-reports')
      .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ssc_reports' },
          () => {
            fetchReports();
          }
      )
      .subscribe();

    const studentsChannel = supabase
      .channel('realtime-students')
      .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ssc_students' },
          () => {
            fetchStudents();
          }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('realtime-messages')
      .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ssc_messages' },
          () => {
            fetchMessages();
          }
      )
      .subscribe();

    const channelsChannel = supabase
      .channel('realtime-channels')
      .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ssc_channels' },
          () => {
            fetchChannels();
          }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(channelsChannel);
    };
  }, [fetchReports, fetchStudents, fetchMessages, fetchChannels]);

  // Student study log photos handler
  const handleLogPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogTrayError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (logPhotos.length + files.length > 10) {
      setLogTrayError('Maximum limit is 10 photos per study report.');
    }

    setIsCompressingLogPhotos(true);
    const compressedList = [...logPhotos];

    try {
      for (let i = 0; i < files.length; i++) {
        if (compressedList.length >= 10) break;
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const base64 = await compressImage(file);
        compressedList.push(base64);
      }
      setLogPhotos(compressedList);
    } catch (err) {
      console.error(err);
      setLogTrayError('Failed to compress one or more images. Please retry.');
    } finally {
      setIsCompressingLogPhotos(false);
      if (logFileInputRef.current) {
        logFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogPhoto = (idxToRemove: number) => {
    setLogPhotos(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Submit report to Supabase
  const handleSendReport = async (newReport: NewSSCReport) => {
    if (!isSupabaseConfigured) {
      setError('Database variables missing.');
      return;
    }

    try {
      const userPassword = localStorage.getItem('ssc_user_password') || '';
      const { error: insertError } = await supabase
        .rpc('submit_report_secure', {
          student_name: newReport.student_name,
          student_password: userPassword,
          subject: newReport.subject,
          topic_covered: newReport.topic_covered,
          study_duration: newReport.study_duration,
          message_text: newReport.message_text,
          photo_url: newReport.photo_url || null
        });

      if (insertError) throw insertError;
      setRefreshTrigger(prev => prev + 1);
      fetchReports();
    } catch (err: any) {
      setError(err.message || 'Failed to submit study report.');
      throw err;
    }
  };

  // Submit chat message to Supabase (separated table ssc_messages)
  const handleSendChatMessageRow = async (newMessage: NewSSCMessage) => {
    if (!isSupabaseConfigured) {
      setError('Database variables missing.');
      return;
    }

    try {
      const userPassword = localStorage.getItem('ssc_user_password') || '';
      const { error: insertError } = await supabase
        .rpc('send_message_secure', {
          sender_name: newMessage.sender_name,
          student_password: userPassword,
          sender_role: newMessage.sender_role,
          recipient: newMessage.recipient,
          message_text: newMessage.message_text,
          photo_url: newMessage.photo_url || null
        });

      if (insertError) throw insertError;
      fetchMessages();
    } catch (err: any) {
      setError(err.message || 'Failed to submit chat message.');
      throw err;
    }
  };

  // Direct text chat message sending
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInputText.trim();
    if (!text || isSubmittingMessage) return;

    setIsSubmittingMessage(true);
    setLogTrayError(null);

    try {
      const isGroup = channels.some(c => c.name === selectedStudentChat);

      if (userRole === 'student') {
        if (isLogTrayOpen) {
          // Submit as formal study log report under the student's personal name
          if (!logTopic.trim()) {
            setLogTrayError('Please enter a topic or chapter covered.');
            setIsSubmittingMessage(false);
            return;
          }
          const photosPayload = logPhotos.length > 0 ? JSON.stringify(logPhotos) : undefined;
          
          await handleSendReport({
            student_name: userName!,
            role: 'student',
            subject: logSubject,
            topic_covered: logTopic.trim(),
            study_duration: logDuration,
            message_text: text,
            photo_url: photosPayload,
          });

          // Reset tray states
          setLogTopic('');
          setLogPhotos([]);
          setIsLogTrayOpen(false);
        } else {
          // Submit as plain text message to ssc_messages table
          await handleSendChatMessageRow({
            sender_name: userName!,
            sender_role: 'student',
            recipient: isGroup ? selectedStudentChat! : (selectedStudentChat || 'Ashish Sir'),
            message_text: text,
          });
        }
      } else {
        // Teacher message (Feedback or Group Channel response)
        if (!selectedStudentChat) return;
        await handleSendChatMessageRow({
          sender_name: 'Ashish Sir',
          sender_role: 'teacher',
          recipient: selectedStudentChat,
          message_text: text,
        });
      }

      setChatInputText('');
    } catch (err: any) {
      console.error(err);
      setLogTrayError('Message failed to deliver. Please check connection.');
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  // Handle Login
  const handleJoin = (name: string, role: 'student' | 'teacher') => {
    setTempUserName(name);
    setTempUserRole(role);
    setIsTransitionLoading(true);

    setTimeout(() => {
      localStorage.setItem('ssc_user_name', name);
      localStorage.setItem('ssc_user_role', role);
      setUserName(name);
      setUserRole(role);
      setIsTransitionLoading(false);
      
      // Instantly refresh dashboard data upon successful login
      fetchReports();
      fetchMessages();
      if (role === 'teacher') {
        fetchStudents();
      }
    }, 5200); // precisely 5.2 seconds
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('ssc_user_name');
    localStorage.removeItem('ssc_user_role');
    localStorage.removeItem('ssc_user_password');
    setUserName(null);
    setUserRole(null);
    setSelectedStudentChat(null);
  };

  // Delete item (either study report or chat message)
  const handleDeleteItem = async (id: string, feedType: 'report' | 'message') => {
    if (userRole !== 'teacher') return;
    
    const itemLabel = feedType === 'report' ? 'study report' : 'chat message';
    setConfirmModal({
      isOpen: true,
      title: 'Delete Classroom Item',
      message: `Are you sure you want to delete this ${itemLabel}? This action is irreversible and will remove it for all classroom participants.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const teacherPassword = localStorage.getItem('ssc_user_password') || '';
          const { error: deleteError } = await supabase
            .rpc('delete_item_secure', {
              teacher_pwd: teacherPassword,
              item_id: id,
              item_type: feedType
            });

          if (deleteError) throw deleteError;
          
          if (feedType === 'report') {
            fetchReports();
          } else {
            fetchMessages();
          }
          showToast(`Successfully deleted the ${itemLabel}.`, 'success');
        } catch (err: any) {
          showToast(err.message || `Failed to delete ${itemLabel}.`, 'error');
        }
      }
    });
  };

  // Add a student to the roster (Teacher action)
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStudentName.trim();
    if (!name) return;

    setIsAddingStudent(true);
    try {
      const teacherPassword = localStorage.getItem('ssc_user_password') || '';
      const { error: insertErr } = await supabase
        .rpc('add_student_secure', {
          teacher_pwd: teacherPassword,
          student_name: name
        });

      if (insertErr) {
        if (insertErr.code === '23505') {
          showToast('This student name is already registered on the classroom roster.', 'error');
        } else {
          throw insertErr;
        }
      } else {
        setNewStudentName('');
        setRosterRefresh(prev => prev + 1);
        showToast(`Successfully added ${name} to the roster!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to add student to roster.', 'error');
    } finally {
      setIsAddingStudent(false);
    }
  };

  // Update student password (Student action)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsStatus(null);

    if (newPassword !== confirmPassword) {
      setSettingsStatus({ type: 'error', message: 'New passwords do not match.' });
      showToast('New passwords do not match.', 'error');
      return;
    }

    if (newPassword.length < 4) {
      setSettingsStatus({ type: 'error', message: 'Password must be at least 4 characters long.' });
      showToast('Password must be at least 4 chars long.', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error: updateErr } = await supabase
        .rpc('update_student_password_secure', {
          student_name: userName,
          current_password: currentPassword,
          new_password: newPassword
        });

      if (updateErr) throw updateErr;

      // Update locally cached password
      localStorage.setItem('ssc_user_password', newPassword);

      setSettingsStatus({ type: 'success', message: 'Password updated successfully!' });
      showToast('Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSettingsStatus({ type: 'error', message: err.message || 'Failed to update password.' });
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Delete a student from the roster (Teacher action)
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Student from Roster',
      message: `Are you sure you want to remove "${studentName}" from the classroom roster? They will no longer be able to log in or submit study logs.`,
      confirmText: 'Remove Student',
      onConfirm: async () => {
        try {
          const teacherPassword = localStorage.getItem('ssc_user_password') || '';
          const { error: deleteErr } = await supabase
            .rpc('delete_student_secure', {
              teacher_pwd: teacherPassword,
              student_id: studentId
            });

          if (deleteErr) throw deleteErr;
          setRosterRefresh(prev => prev + 1);
          showToast(`Successfully removed "${studentName}" from the class roster.`, 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to remove student from roster.', 'error');
        }
      }
    });
  };

  // Add a channel (Teacher action)
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setIsAddingChannel(true);

    try {
      const name = newChannelName.trim();
      const is_global = newChannelIsGlobal;
      const allowed_students = is_global ? [] : newChannelAllowedStudents;

      // Check duplicate
      const duplicate = channels.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (duplicate) {
        showToast('A channel with this name already exists.', 'error');
        setIsAddingChannel(false);
        return;
      }

      const teacherPassword = localStorage.getItem('ssc_user_password') || '';
      const { error: insertError } = await supabase
        .rpc('create_channel_secure', {
          teacher_pwd: teacherPassword,
          channel_name: name,
          is_global,
          allowed_students
        });

      if (insertError) throw insertError;

      setNewChannelName('');
      setNewChannelIsGlobal(true);
      setNewChannelAllowedStudents([]);
      fetchChannels();
      showToast(`Successfully created channel "${name}"!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add channel.', 'error');
    } finally {
      setIsAddingChannel(false);
    }
  };

  // Delete a channel (Teacher action)
  const handleDeleteChannel = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Discussion Channel',
      message: `Are you sure you want to delete the channel "${name}"? All chat history in this channel will be permanently deleted and inaccessible.`,
      confirmText: 'Delete Channel',
      onConfirm: async () => {
        try {
          const teacherPassword = localStorage.getItem('ssc_user_password') || '';
          const { error: deleteError } = await supabase
            .rpc('delete_channel_secure', {
              teacher_pwd: teacherPassword,
              channel_id: id
            });

          if (deleteError) throw deleteError;
          
          if (selectedStudentChat === name) {
            setSelectedStudentChat(null);
          }
          fetchChannels();
          showToast(`Successfully deleted channel "${name}".`, 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to delete channel.', 'error');
        }
      }
    });
  };

  // Filter reports
  const filteredReports = reports.filter((r) => {
    // If logged in as student, they should ONLY be able to see their own work
    if (userRole === 'student' && r.student_name !== userName) {
      return false;
    }

    const matchesSearch = r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.topic_covered.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.message_text.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = subjectFilter === 'All' || r.subject === subjectFilter;
    
    return matchesSearch && matchesSubject;
  });

  // Analytics & Stats Calculations
  const studentReports = reports.filter(r => r.student_name === userName);
  const studentTotalSessions = studentReports.length;
  const studentTotalHours = studentReports.reduce((acc, r) => {
    const d = r.study_duration || '';
    if (d.includes('30 mins')) return acc + 0.5;
    if (d.includes('1.5 hours')) return acc + 1.5;
    if (d.includes('1 hour')) return acc + 1.0;
    if (d.includes('2 hours')) return acc + 2.0;
    if (d.includes('3 hours')) return acc + 3.0;
    if (d.includes('4 hours+')) return acc + 4.0;
    return acc + 1.0;
  }, 0);

  const statsTotalSessions = reports.length;
  const statsTotalHours = reports.reduce((acc, r) => {
    const d = r.study_duration || '';
    if (d.includes('30 mins')) return acc + 0.5;
    if (d.includes('1.5 hours')) return acc + 1.5;
    if (d.includes('1 hour')) return acc + 1.0;
    if (d.includes('2 hours')) return acc + 2.0;
    if (d.includes('3 hours')) return acc + 3.0;
    if (d.includes('4 hours+')) return acc + 4.0;
    return acc + 1.0;
  }, 0);

  // Compute subject distribution based on logged-in role
  const statsReportsList = userRole === 'teacher' ? reports : studentReports;
  const subjectDistribution = statsReportsList.reduce((acc, r) => {
    const sub = r.subject || 'Other';
    acc[sub] = (acc[sub] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let statsTopSubject = 'N/A';
  let statsTopSubjectCount = 0;
  for (const sub in subjectDistribution) {
    const count = subjectDistribution[sub];
    if (count > statsTopSubjectCount) {
      statsTopSubjectCount = count;
      statsTopSubject = sub;
    }
  }

  const statsActiveStudents = Array.from(new Set(reports.map(r => r.student_name))).filter(Boolean).length;

  // Memoize WhatsApp-style conversations list for the teacher dashboard
  const studentChatsList = React.useMemo(() => {
    const namesFromReports = Array.from(new Set(reports.map(r => r.student_name))).filter(Boolean);
    const namesFromRoster = students.map(s => s.name);
    const allUniqueNames = Array.from(new Set([...namesFromReports, ...namesFromRoster])).sort();
    
    return allUniqueNames.map(name => {
      const pReports = reports.filter(r => r.student_name === name);
      const pMessages = messages.filter(m => 
        (m.sender_name === name && m.recipient === 'Ashish Sir') || 
        (m.sender_name === 'Ashish Sir' && m.recipient === name)
      );

      const latestReport = pReports.length > 0 ? pReports[0] : null;
      const latestMessage = pMessages.length > 0 ? pMessages[pMessages.length - 1] : null;

      let latestFeedItem: { created_at: string; text: string } | null = null;
      if (latestReport && latestMessage) {
        if (new Date(latestReport.created_at).getTime() > new Date(latestMessage.created_at).getTime()) {
          latestFeedItem = { created_at: latestReport.created_at, text: `Report: ${latestReport.subject} - ${latestReport.topic_covered}` };
        } else {
          latestFeedItem = { created_at: latestMessage.created_at, text: latestMessage.message_text };
        }
      } else if (latestReport) {
        latestFeedItem = { created_at: latestReport.created_at, text: `Report: ${latestReport.subject} - ${latestReport.topic_covered}` };
      } else if (latestMessage) {
        latestFeedItem = { created_at: latestMessage.created_at, text: latestMessage.message_text };
      }

      const totalHours = pReports.reduce((acc, r) => {
        const d = r.study_duration || '';
        if (d.includes('30 mins')) return acc + 0.5;
        if (d.includes('1.5 hours')) return acc + 1.5;
        if (d.includes('1 hour')) return acc + 1.0;
        if (d.includes('2 hours')) return acc + 2.0;
        if (d.includes('3 hours')) return acc + 3.0;
        if (d.includes('4 hours+')) return acc + 4.0;
        return acc + 1.0;
      }, 0);

      return {
        name,
        reportsCount: pReports.length,
        latestText: latestFeedItem ? latestFeedItem.text : 'No messages exchanged',
        latestTime: latestFeedItem ? latestFeedItem.created_at : null,
        totalHours,
      };
    });
  }, [reports, messages, students]);

  // Filter student contact cards based on active searches
  const filteredStudentChats = React.useMemo(() => {
    if (!searchQuery) return studentChatsList;
    const query = searchQuery.toLowerCase();
    return studentChatsList.filter(chat => {
      const matchesName = chat.name.toLowerCase().includes(query);
      const matchesLatestText = chat.latestText.toLowerCase().includes(query);
      return matchesName || matchesLatestText;
    });
  }, [studentChatsList, searchQuery]);

  // Compute the student-side dynamic chats list (including direct chat, channels, and peer-to-peer chats)
  const studentSideChats = React.useMemo(() => {
    // 1-to-1 with Ashish Sir
    const directMessages = messages.filter(m => 
      (m.sender_name === userName && m.recipient === 'Ashish Sir') || 
      (m.sender_name === 'Ashish Sir' && m.recipient === userName)
    );
    const latestDirect = directMessages.length > 0 ? directMessages[directMessages.length - 1] : null;

    const directChat = {
      id: 'Ashish Sir',
      name: 'Ashish Sir',
      latestMessage: latestDirect ? latestDirect.message_text : 'Start your study dialog now',
      latestTime: latestDirect ? latestDirect.created_at : null,
      type: 'direct' as const
    };

    // Filter channels the student is allowed to see:
    // Either is_global is true OR their name is explicitly in the allowed_students array
    const allowedChannels = channels.filter(c => 
      c.is_global || 
      (c.allowed_students && c.allowed_students.some(s => s.toLowerCase() === userName?.toLowerCase()))
    );

    const channelChats = allowedChannels.map(c => {
      const channelMessages = messages.filter(m => m.recipient === c.name);
      const latestMsg = channelMessages.length > 0 ? channelMessages[channelMessages.length - 1] : null;
      return {
        id: c.name,
        name: c.name,
        latestMessage: latestMsg 
          ? `${latestMsg.sender_name}: ${latestMsg.message_text}`
          : 'Talk to your peers in this channel',
        latestTime: latestMsg ? latestMsg.created_at : null,
        type: 'group' as const
      };
    });

    // 1-to-1 DMs with peers/classmates
    const peerChats = students
      .filter(s => s.name !== userName)
      .map(s => {
        const peerMessages = messages.filter(m => 
          (m.sender_name === userName && m.recipient === s.name) || 
          (m.sender_name === s.name && m.recipient === userName)
        );
        const latestMsg = peerMessages.length > 0 ? peerMessages[peerMessages.length - 1] : null;
        return {
          id: s.name,
          name: s.name,
          latestMessage: latestMsg ? latestMsg.message_text : 'Tap to start a private conversation',
          latestTime: latestMsg ? latestMsg.created_at : null,
          type: 'peer' as const
        };
      });

    const rawChats = [directChat, ...channelChats, ...peerChats];
    if (!searchQuery) return rawChats;
    const query = searchQuery.toLowerCase();
    return rawChats.filter(chat => 
      chat.name.toLowerCase().includes(query) || 
      chat.latestMessage.toLowerCase().includes(query)
    );
  }, [messages, channels, userName, searchQuery, students]);

  // Filter student-side chats by selected category tab
  const filteredStudentSideChats = React.useMemo(() => {
    return studentSideChats.filter(chat => {
      if (studentChatTab === 'channels') {
        return chat.type === 'group';
      }
      if (studentChatTab === 'peers') {
        return chat.type === 'peer' || chat.type === 'direct';
      }
      return true;
    });
  }, [studentSideChats, studentChatTab]);

  // Clear chat search when switching chats
  useEffect(() => {
    setChatSearchQuery('');
    setShowChatSearch(false);
  }, [selectedStudentChat]);

  // Auto initialize student default chat (Desktop only)
  useEffect(() => {
    if (userRole === 'student' && !selectedStudentChat && !isMobile) {
      setSelectedStudentChat('Ashish Sir');
    }
  }, [userRole, selectedStudentChat, isMobile]);

  // Filter and sort the active conversation thread reports chronologically
  const activeChatReports = React.useMemo<SSCFeedItem[]>(() => {
    const targetStudent = userRole === 'student' 
      ? (selectedStudentChat === 'Ashish Sir' || !selectedStudentChat ? userName : selectedStudentChat)
      : selectedStudentChat;
    if (!targetStudent) return [];
    
    const isGroup = channels.some(c => c.name === selectedStudentChat);

    // 1. Get study reports (not group channels)
    const rawReports = isGroup ? [] : reports.filter(r => r.student_name === targetStudent);
    const feedReports = rawReports.map(r => ({ ...r, feedType: 'report' as const }));

    // 2. Get messages
    let rawMessages = [];
    if (isGroup) {
      rawMessages = messages.filter(m => m.recipient === selectedStudentChat);
    } else {
      if (userRole === 'teacher') {
        rawMessages = messages.filter(m => 
          (m.sender_name === targetStudent && m.recipient === 'Ashish Sir') || 
          (m.sender_name === 'Ashish Sir' && m.recipient === targetStudent)
        );
      } else {
        const otherUser = selectedStudentChat === 'Ashish Sir' || !selectedStudentChat ? 'Ashish Sir' : selectedStudentChat;
        rawMessages = messages.filter(m => 
          (m.sender_name === userName && m.recipient === otherUser) || 
          (m.sender_name === otherUser && m.recipient === userName)
        );
      }
    }
    const feedMessages = rawMessages.map(m => ({ ...m, feedType: 'message' as const }));

    // 3. Combine and sort
    const combined = [...feedReports, ...feedMessages].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return combined.filter(item => {
      const isRep = item.feedType === 'report';
      const matchesSubject = subjectFilter === 'All' || !isRep || item.subject === subjectFilter;
      
      // Decoupled chat search
      if (showChatSearch && chatSearchQuery) {
        const query = chatSearchQuery.toLowerCase();
        const matchesSearch = isRep
          ? (item.topic_covered?.toLowerCase().includes(query) || item.message_text?.toLowerCase().includes(query))
          : item.message_text?.toLowerCase().includes(query);
        return matchesSearch && matchesSubject;
      }
      
      return matchesSubject;
    });
  }, [reports, messages, userRole, userName, selectedStudentChat, chatSearchQuery, showChatSearch, subjectFilter, channels]);

  // Keep chat thread viewport scrolled to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [activeChatReports.length]);

  // Render structure with AnimatePresence
  return (
    <AnimatePresence mode="wait">
      {isTransitionLoading ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <LoadingScreen 
            isDarkMode={isDarkMode} 
            userName={tempUserName} 
            role={tempUserRole} 
          />
        </motion.div>
      ) : (!userName || !userRole) ? (
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <WelcomeScreen onJoin={handleJoin} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={`min-h-screen flex flex-col font-sans transition-colors duration-300 w-full ${
            isDarkMode 
              ? 'bg-slate-950 text-slate-100' 
              : 'bg-slate-50 text-slate-800'
          }`}
        >
          {/* Background patterns */}
          <div className={`absolute inset-0 opacity-[0.015] pointer-events-none z-0 ${
            isDarkMode ? 'bg-[radial-gradient(#ffffff_1px,transparent_1px)]' : 'bg-[radial-gradient(#000000_1px,transparent_1px)]'
          } [background-size:24px_24px]`}></div>

          {/* Main Container Wrapper */}
          <div className="w-full max-w-7xl mx-auto px-4 py-4 sm:py-6 flex-1 flex flex-col gap-5 relative z-10">
        
        {/* Formal Navbar */}
        <header className={`w-full rounded-3xl border p-4 sm:px-6 sm:py-4 flex items-center justify-between shadow-md transition-all duration-300 ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800 shadow-slate-950/20' 
            : 'bg-white border-slate-200 shadow-slate-100'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              isDarkMode 
                ? 'bg-slate-950 border-slate-800 text-blue-400' 
                : 'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
              <GraduationCap className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <h1 className={`text-sm sm:text-base font-bold tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                SST Classroom Tracker
              </h1>
              <p className="text-[9px] font-extrabold tracking-widest text-slate-500 uppercase">
                Official Study Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* User credentials banner */}
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{userName}</span>
              <span className={`text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1 mt-0.5 ${
                userRole === 'teacher' ? 'text-indigo-500' : 'text-blue-500'
              }`}>
                {userRole === 'teacher' ? <Shield className="w-2.5 h-2.5" /> : <GraduationCap className="w-2.5 h-2.5" />}
                {userRole}
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'text-amber-400 bg-slate-950 border-slate-800 hover:bg-slate-800' 
                  : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Account Settings (Student only) */}
            {userRole === 'student' && (
              <button
                onClick={() => setIsAccountSettingsOpen(true)}
                className={`p-2 rounded-xl border transition-all ${
                  isDarkMode 
                    ? 'text-slate-300 bg-slate-950 border-slate-800 hover:bg-slate-800' 
                    : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
                title="Account Settings"
              >
                <Key className="w-4 h-4" />
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={fetchReports}
              disabled={isLoading}
              className={`p-2 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'text-slate-300 bg-slate-950 border-slate-800 hover:bg-slate-800' 
                  : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
              title="Refresh feed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`p-2 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'text-slate-400 bg-slate-950 border-slate-800 hover:text-red-400 hover:bg-red-950/20 hover:border-red-900' 
                  : 'text-slate-500 bg-slate-50 border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-100'
              }`}
              title="Logout / Exit Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Database Missing Alert */}
        {!isSupabaseConfigured && (
          <div className={`rounded-3xl p-5 border shadow-sm ${
            isDarkMode 
              ? 'bg-slate-900 border-amber-500/20' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start gap-3.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className={`text-sm font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>Database Connection Offline</h3>
                <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  To enable database storage for student reports, please apply the contents of <code className="px-1 rounded bg-slate-200 dark:bg-slate-950 text-xs font-mono font-bold">supabase-schema.sql</code> inside your Supabase Editor and configure the environment variables:
                </p>
                <pre className="mt-2.5 p-3 rounded-xl bg-slate-950 text-white text-[10px] font-mono leading-normal">
                  VITE_SUPABASE_URL=your-project-url{'\n'}
                  VITE_SUPABASE_ANON_KEY=your-anon-key
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* User Identity Banner for small mobile screens */}
        <div className="md:hidden flex items-center justify-between p-3.5 rounded-2xl border transition-colors border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{userName}</p>
              <p className={`text-[9px] uppercase tracking-wider font-extrabold ${
                userRole === 'teacher' ? 'text-indigo-500' : 'text-blue-500'
              }`}>{userRole}</p>
            </div>
          </div>
          <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Active Session
          </span>
        </div>

        {/* MAIN BODY: Dual Column Layout (Settings/Filters on left, WhatsApp on right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT COLUMN: Administrative & Filtering Panels (col-span-4) */}
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-5 order-2 lg:order-1">

            {/* Classroom Analytics Hub (Teacher view) */}
            {userRole === 'teacher' && (
              <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800' 
                  : 'bg-white border-slate-200'
              }`}>
                <h4 className={`text-xs font-extrabold uppercase tracking-widest mb-4 flex items-center gap-1.5 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-850'
                }`}>
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  Classroom Analytics Hub
                </h4>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Total Class Study</span>
                    <div className="flex items-baseline gap-1 mt-1.5">
                      <span className="text-sm sm:text-base font-extrabold tracking-tight">{statsTotalHours}</span>
                      <span className="text-[9px] font-bold text-slate-400">hours</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Total Reports</span>
                    <div className="flex items-baseline gap-1 mt-1.5">
                      <span className="text-sm sm:text-base font-extrabold tracking-tight">{statsTotalSessions}</span>
                      <span className="text-[9px] font-bold text-slate-400">logs</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Personal Academic Progress Panel (Student view) */}
            {userRole === 'student' && (
              <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800' 
                  : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <h4 className={`text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5 ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-800'
                  }`}>
                    <Award className="w-4 h-4 shrink-0" />
                    Academic Study Center
                  </h4>
                  {/* Badge / Rank based on student hours */}
                  <span className="text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 tracking-wider shrink-0">
                    {studentTotalHours === 0 ? "SST Novice" : 
                     studentTotalHours < 2 ? "SST Beginner" :
                     studentTotalHours < 5 ? "SST Explorer" :
                     studentTotalHours < 10 ? "SST Champion" : "SST Sage 👑"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className="text-[8.5px] uppercase font-extrabold text-slate-500 tracking-wider">My Study Hours</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-sm sm:text-base font-extrabold tracking-tight">{studentTotalHours}</span>
                      <span className="text-[9px] font-bold text-slate-400">hours</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className="text-[8.5px] uppercase font-extrabold text-slate-500 tracking-wider">Sessions Logged</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-sm sm:text-base font-extrabold tracking-tight">{studentTotalSessions}</span>
                      <span className="text-[9px] font-bold text-slate-400">logs</span>
                    </div>
                  </div>
                </div>

                {/* Subject Breakdown Progress Bars */}
                <div className="space-y-3">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                    Subject Distribution
                  </p>
                  <div className="space-y-2">
                    {['History', 'Geography', 'Civics', 'Economics'].map((sub) => {
                      const count = subjectDistribution[sub] || 0;
                      const total = studentTotalSessions || 1;
                      const percent = studentTotalSessions > 0 ? (count / total) * 100 : 0;
                      
                      const colors = {
                        History: 'bg-amber-500',
                        Geography: 'bg-emerald-500',
                        Civics: 'bg-blue-500',
                        Economics: 'bg-purple-500'
                      }[sub] || 'bg-slate-500';

                      return (
                        <div key={sub} className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-semibold">
                            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{sub}</span>
                            <span className="text-slate-400">{count} logs ({Math.round(percent)}%)</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${colors}`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Classroom Roster Management Panel (Only visible to the Teacher) */}
            {userRole === 'teacher' && (
              <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800' 
                  : 'bg-white border-slate-200'
              }`}>
                <h4 className={`text-xs font-extrabold uppercase tracking-widest mb-3 flex items-center gap-1.5 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-800'
                }`}>
                  <Shield className="w-4 h-4 shrink-0" />
                  Classroom Roster Manager
                </h4>
                
                {/* Register Student Form */}
                <form onSubmit={handleAddStudent} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Register Student Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rohan Verma"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        disabled={isAddingStudent}
                        className={`flex-1 border rounded-xl py-2 px-3 text-xs outline-none transition-all ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-850 text-white focus:border-blue-500 placeholder:text-slate-700'
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600 placeholder:text-slate-400'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={isAddingStudent || !newStudentName.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
                      >
                        {isAddingStudent ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Registered Students List */}
                <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
                    Authorized Class Roster ({students.length})
                  </p>
                  
                  {students.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No registered students found.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 no-scrollbar pr-1">
                      {students.map((student) => (
                        <div key={student.id} className="flex items-center justify-between py-2.5">
                          <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {student.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student.id, student.name)}
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-transparent transition-all ${
                              isDarkMode 
                                ? 'text-red-400 hover:text-red-300 hover:bg-red-950/30' 
                                : 'text-red-600 hover:bg-red-50 hover:border-red-100'
                            }`}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Channel Management Panel (Only visible to the Teacher) */}
            {userRole === 'teacher' && (
              <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800' 
                  : 'bg-white border-slate-200'
              }`}>
                <h4 className={`text-xs font-extrabold uppercase tracking-widest mb-3 flex items-center gap-1.5 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-800'
                }`}>
                  <Users className="w-4 h-4 shrink-0" />
                  Channel Manager
                </h4>

                {/* Create Channel Form */}
                <form onSubmit={handleAddChannel} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Channel Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Science Doubts"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      disabled={isAddingChannel}
                      className={`w-full border rounded-xl py-2 px-3 text-xs outline-none transition-all ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-850 text-white focus:border-indigo-500 placeholder:text-slate-700'
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-indigo-600 placeholder:text-slate-400'
                      }`}
                    />
                  </div>

                  {/* Audience Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Channel Audience
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="audience"
                          checked={newChannelIsGlobal}
                          onChange={() => setNewChannelIsGlobal(true)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>All Students</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="audience"
                          checked={!newChannelIsGlobal}
                          onChange={() => setNewChannelIsGlobal(false)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Specific Students</span>
                      </label>
                    </div>
                  </div>

                  {/* Specific Students Checklist */}
                  {!newChannelIsGlobal && (
                    <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 max-h-36 overflow-y-auto no-scrollbar space-y-1.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                        Select Allowed Students
                      </p>
                      {students.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">No registered students to select.</p>
                      ) : (
                        students.map((student) => {
                          const isChecked = newChannelAllowedStudents.includes(student.name);
                          return (
                            <label key={student.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setNewChannelAllowedStudents(prev => prev.filter(name => name !== student.name));
                                  } else {
                                    setNewChannelAllowedStudents(prev => [...prev, student.name]);
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                              />
                              <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{student.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAddingChannel || !newChannelName.trim() || (!newChannelIsGlobal && newChannelAllowedStudents.length === 0)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
                  >
                    {isAddingChannel ? 'Creating...' : 'Create Channel'}
                  </button>
                </form>

                {/* Active Channels List */}
                <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
                    Active Channels ({channels.length})
                  </p>
                  
                  {channels.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No custom channels created yet.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 no-scrollbar pr-1">
                      {channels.map((chan) => (
                        <div key={chan.id} className="flex items-center justify-between py-2.5">
                          <div className="flex flex-col">
                            <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                              {chan.name}
                            </span>
                            <span className="text-[8px] font-extrabold uppercase text-slate-400 mt-0.5">
                              {chan.is_global 
                                ? 'Global (All Students)' 
                                : `Restricted (${chan.allowed_students?.length || 0} students)`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteChannel(chan.id, chan.name)}
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-transparent transition-all ${
                              isDarkMode 
                                ? 'text-red-400 hover:text-red-300 hover:bg-red-950/30' 
                                : 'text-red-600 hover:bg-red-50 hover:border-red-100'
                            }`}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Highly Styled WhatsApp Work Space Container (col-span-8) */}
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-3 order-1 lg:order-2">
            
            <div className={`w-full rounded-3xl border shadow-md flex overflow-hidden h-[650px] lg:h-[750px] xl:h-[800px] max-h-[85vh] ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-250'
            }`}>
              
              {/* WhatsApp Left Contacts Sidebar */}
              <div className={`w-full md:w-72 border-r flex flex-col shrink-0 ${
                selectedStudentChat ? 'hidden md:flex' : 'flex'
              } ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50/50'}`}>
                
                {/* Contact List Header */}
                <div className={`p-4 border-b shrink-0 flex items-center justify-between ${
                  isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-100/40'
                }`}>
                  <p className={`text-[10px] font-extrabold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {userRole === 'teacher' 
                      ? `Students (${filteredStudentChats.length})` 
                      : studentChatTab === 'all'
                        ? 'My Discussions'
                        : studentChatTab === 'channels'
                          ? 'Class Channels'
                          : 'Peers & Private DMs'
                    }
                  </p>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="System Live" />
                </div>

                {/* Search & Subject Filters Bar inside Sidebar */}
                <div className={`p-3 border-b shrink-0 flex flex-col gap-2 ${
                  isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-100/30'
                }`}>
                  {/* Search Input */}
                  <div className="relative">
                    <Search className={`absolute left-3 top-2.5 w-3.5 h-3.5 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder="Search chats or logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border outline-none transition-all font-semibold ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-850 text-white focus:border-blue-500 placeholder:text-slate-700'
                          : 'bg-white border-slate-200 text-slate-800 focus:border-blue-600 placeholder:text-slate-400'
                      }`}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Chat Category Filter Tabs (Student Side Only) */}
                  {userRole === 'student' && (
                    <div className="flex bg-slate-200/50 dark:bg-slate-950/55 p-0.5 rounded-xl gap-0.5 mt-0.5">
                      {([
                        { id: 'all', label: 'All' },
                        { id: 'channels', label: 'Channels' },
                        { id: 'peers', label: 'Peers' }
                      ] as const).map((tab) => {
                        const isSelected = studentChatTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStudentChatTab(tab.id)}
                            className={`flex-1 text-[9.5px] py-1 rounded-lg font-extrabold tracking-wide uppercase transition-all shrink-0 cursor-pointer text-center ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : isDarkMode
                                  ? 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Subject Quick Filter Chips */}
                  <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
                    {['All', 'History', 'Geography', 'Civics', 'Economics'].map((sub) => {
                      const isSelected = subjectFilter === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSubjectFilter(sub)}
                          className={`text-[9px] px-2 py-0.5 rounded-md border font-extrabold tracking-wide uppercase transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : isDarkMode
                                ? 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contacts List Feed */}
                <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-150 dark:divide-slate-850">
                  {userRole === 'teacher' ? (
                    <>
                      {/* Teacher Side Dynamic Channels */}
                      {channels.map((chan) => {
                        const channelMessages = messages.filter(m => m.recipient === chan.name);
                        const latestMsg = channelMessages.length > 0 ? channelMessages[channelMessages.length - 1] : null;
                        const displayText = latestMsg 
                          ? `${latestMsg.sender_name}: ${latestMsg.message_text}`
                          : 'Talk to students in this channel';
                        const isSelected = selectedStudentChat === chan.name;

                        const initials = chan.name
                          .split(' ')
                          .filter(word => word.length > 1)
                          .slice(0, 2)
                          .map(word => word[0].toUpperCase())
                          .join('') || chan.name.slice(0, 2).toUpperCase();

                        return (
                          <button
                            key={chan.id}
                            type="button"
                            onClick={() => setSelectedStudentChat(chan.name)}
                            className={`w-full text-left p-3.5 flex items-center gap-3 transition-all outline-none border-l-4 ${
                              isSelected
                                ? isDarkMode
                                  ? 'bg-slate-850/90 border-blue-500 text-white'
                                  : 'bg-blue-50/70 border-blue-600 text-slate-900'
                                : isDarkMode
                                  ? 'border-transparent text-slate-300 hover:bg-slate-850/30'
                                  : 'border-transparent text-slate-700 hover:bg-slate-100/60'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 border bg-gradient-to-tr from-emerald-600 to-teal-600 text-white border-emerald-400 uppercase">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <h4 className="text-xs font-bold truncate pr-1">
                                    {chan.name}
                                  </h4>
                                  {!chan.is_global && (
                                    <span className="text-[7.5px] px-1 py-0.2 rounded font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase shrink-0">
                                      Private
                                    </span>
                                  )}
                                </div>
                                {latestMsg && (
                                  <span className="text-[8px] text-slate-400 shrink-0 font-medium">
                                    {new Date(latestMsg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] font-medium truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {displayText}
                              </p>
                            </div>
                          </button>
                        );
                      })}

                      {/* Regular student roster cards */}
                      {filteredStudentChats.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 font-semibold italic">
                          No students matching search.
                        </div>
                      ) : (
                        filteredStudentChats.map((chat) => {
                          const isSelected = selectedStudentChat === chat.name;
                          const avatarColor = getAvatarColor(chat.name, isDarkMode);
                          
                          return (
                            <button
                              key={chat.name}
                              type="button"
                              onClick={() => setSelectedStudentChat(chat.name)}
                              className={`w-full text-left p-3.5 flex items-center gap-3 transition-all outline-none border-l-4 ${
                                isSelected
                                  ? isDarkMode
                                    ? 'bg-slate-850/90 border-blue-500 text-white'
                                    : 'bg-blue-50/70 border-blue-600 text-slate-900'
                                  : isDarkMode
                                    ? 'border-transparent text-slate-300 hover:bg-slate-850/30'
                                    : 'border-transparent text-slate-700 hover:bg-slate-100/60'
                              }`}
                            >
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 border uppercase ${avatarColor}`}>
                                {chat.name.slice(0, 2)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-baseline mb-0.5">
                                  <h4 className="text-xs font-bold truncate pr-1">
                                    {chat.name}
                                  </h4>
                                  {chat.latestTime && (
                                    <span className="text-[8px] text-slate-400 shrink-0 font-medium">
                                      {new Date(chat.latestTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[10.5px] truncate font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {chat.latestText}
                                </p>
                                <div className="flex gap-1.5 mt-1.5">
                                  <span className={`text-[8px] px-1.5 py-0.2 rounded font-extrabold ${
                                    isDarkMode ? 'bg-slate-800 text-blue-400' : 'bg-slate-150 text-slate-600'
                                  }`}>
                                    {chat.reportsCount} logs
                                  </span>
                                  {chat.totalHours > 0 && (
                                    <span className={`text-[8px] px-1.5 py-0.2 rounded font-extrabold ${
                                      isDarkMode ? 'bg-slate-800 text-amber-400' : 'bg-slate-150 text-slate-600'
                                    }`}>
                                      {chat.totalHours} hrs
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </>
                  ) : (
                    /* STUDENT SIDE: Dynamic list of chats with dynamic category tabs */
                    filteredStudentSideChats.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 font-semibold italic">
                        No chats found under this category.
                      </div>
                    ) : (
                      filteredStudentSideChats.map((chat) => {
                        const isSelected = selectedStudentChat === chat.id;
                        const avatarColor = chat.type === 'direct' 
                          ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white border-blue-400'
                          : chat.type === 'peer'
                            ? getAvatarColor(chat.name, isDarkMode)
                            : 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white border-emerald-400';
                        const initials = chat.name === 'Ashish Sir' 
                          ? 'AS' 
                          : chat.name
                              .split(' ')
                              .filter(word => word.length > 1)
                              .slice(0, 2)
                              .map(word => word[0].toUpperCase())
                              .join('') || chat.name.slice(0, 2).toUpperCase();

                        return (
                          <button
                            key={chat.id}
                            type="button"
                            onClick={() => setSelectedStudentChat(chat.id)}
                            className={`w-full text-left p-3.5 flex items-center gap-3 transition-all outline-none border-l-4 ${
                              isSelected
                                ? isDarkMode
                                  ? 'bg-slate-850/90 border-blue-500 text-white'
                                  : 'bg-blue-50/70 border-blue-600 text-slate-900'
                                : isDarkMode
                                  ? 'border-transparent text-slate-300 hover:bg-slate-850/30'
                                  : 'border-transparent text-slate-700 hover:bg-slate-100/60'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 border uppercase ${avatarColor}`}>
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <h4 className="text-xs font-bold truncate pr-1 flex items-center gap-1">
                                  {chat.name}
                                  {chat.type === 'direct' && <Award className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                                  {chat.type === 'peer' && (
                                    <span className="text-[7.5px] px-1 py-0.2 rounded font-extrabold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase shrink-0">
                                      Peer DM
                                    </span>
                                  )}
                                </h4>
                                {chat.latestTime && (
                                  <span className="text-[8px] text-slate-400 shrink-0 font-medium">
                                    {new Date(chat.latestTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] font-medium truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {chat.latestMessage}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )
                  )}
                </div>
              </div>

              {/* WhatsApp Active Thread Details (Right Window) */}
              <div className={`flex-1 flex flex-col h-full bg-slate-950/5 dark:bg-slate-950/25 ${
                !selectedStudentChat ? 'hidden md:flex' : 'flex'
              }`}>
                {selectedStudentChat ? (
                  <>
                    {/* Thread Active Header Banner */}
                    <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
                      isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                    }`}>
                      <div className="flex items-center gap-3">
                        {/* Mobile Back Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedStudentChat(null)}
                          className={`md:hidden p-1.5 rounded-lg border ${
                            isDarkMode 
                              ? 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white' 
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        {/* Thread Avatar */}
                        {(() => {
                          const isGroupChannel = channels.some(c => c.name === selectedStudentChat);
                          const initials = selectedStudentChat === 'Ashish Sir' || (userRole === 'student' && !selectedStudentChat)
                            ? 'AS'
                            : isGroupChannel
                              ? selectedStudentChat!
                                  .split(' ')
                                  .filter(word => word.length > 1)
                                  .slice(0, 2)
                                  .map(word => word[0].toUpperCase())
                                  .join('') || selectedStudentChat!.slice(0, 2).toUpperCase()
                              : selectedStudentChat!.slice(0, 2);

                          return (
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold border uppercase shrink-0 ${
                              selectedStudentChat === 'Ashish Sir' || (userRole === 'student' && !selectedStudentChat)
                                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white border-blue-400'
                                : isGroupChannel
                                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white border-emerald-400'
                                  : getAvatarColor(selectedStudentChat!, isDarkMode)
                            }`}>
                              {initials}
                            </div>
                          );
                        })()}

                        {/* Thread User Identity & Status Metrics */}
                        <div>
                          <h3 className={`text-xs font-bold leading-tight flex items-center gap-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {selectedStudentChat === 'Ashish Sir' || (userRole === 'student' && !selectedStudentChat) ? 'Ashish Sir' : selectedStudentChat}
                            {(selectedStudentChat === 'Ashish Sir' || (userRole === 'student' && !selectedStudentChat)) && <Award className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          </h3>
                          <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {(() => {
                              const currentChan = channels.find(c => c.name === selectedStudentChat);
                              if (currentChan) {
                                if (currentChan.is_global) return 'Group Support Channel • All Students & Teacher';
                                return `Restricted Channel • Allowed: ${currentChan.allowed_students?.join(', ') || 'None'}`;
                              }
                              const stats = studentChatsList.find(c => c.name === selectedStudentChat);
                              return stats 
                                ? `${stats.reportsCount} study logs • ${stats.totalHours} hrs`
                                : 'Ashish Sir';
                            })()}
                          </p>
                        </div>
                      </div>

                      {/* Search in Chat Button & Inline Input */}
                      <div className="flex items-center gap-2">
                        {showChatSearch ? (
                          <div className="flex items-center gap-1.5 transition-all">
                            <input
                              type="text"
                              placeholder="Search messages..."
                              value={chatSearchQuery}
                              onChange={(e) => setChatSearchQuery(e.target.value)}
                              autoFocus
                              className={`px-3 py-1 text-xs rounded-lg border outline-none font-semibold w-24 sm:w-44 ${
                                isDarkMode
                                  ? 'bg-slate-950 border-slate-850 text-white focus:border-blue-500 placeholder:text-slate-700'
                                  : 'bg-slate-50 border-slate-250 text-slate-800 focus:border-blue-600 placeholder:text-slate-400'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setChatSearchQuery('');
                                setShowChatSearch(false);
                              }}
                              className={`p-1.5 rounded-lg border hover:text-red-500 transition-colors ${
                                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-250 text-slate-500'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowChatSearch(true)}
                            className={`p-1.5 rounded-lg border hover:text-blue-500 transition-colors ${
                              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-250 text-slate-500'
                            }`}
                            title="Search in this conversation"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chat Messages Log Scroll Feed */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar bg-slate-100/50 dark:bg-slate-950/10">

                      {activeChatReports.length === 0 ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center">
                          <MessageSquare className="w-7 h-7 text-blue-500/60 mb-2 animate-bounce" />
                          <h4 className="text-xs font-bold">No messages logged yet</h4>
                          <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">
                            {userRole === 'student' 
                              ? 'Ask a study question or log your study session below to initiate chat.' 
                              : 'Send feedback to start the support dialog.'}
                          </p>
                        </div>
                      ) : (
                        activeChatReports.map((item) => (
                          <ReportBubble
                            key={item.id}
                            item={item}
                            currentUser={{ name: userName!, role: userRole! }}
                            onReactionUpdate={fetchReports}
                            onDeleteItem={handleDeleteItem}
                            isDarkMode={isDarkMode}
                          />
                        ))
                      )}
                      
                      {/* Anchor for auto scroll */}
                      <div ref={chatEndRef} />
                    </div>

                    {/* COLLAPSIBLE LOG STUDY SESSION TRAY (Students only) */}
                    {userRole === 'student' && isLogTrayOpen && (
                      <div className={`p-4 border-t border-b ${
                        isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-blue-500 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 shrink-0" />
                            Configure Study Session Log
                          </h4>
                          <button 
                            type="button" 
                            onClick={() => setIsLogTrayOpen(false)}
                            className="text-slate-400 hover:text-slate-200 p-1 rounded-md"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {logTrayError && (
                          <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold">
                            {logTrayError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          {/* Subject Dropdown */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                              Subject Domain
                            </label>
                            <select
                              value={logSubject}
                              onChange={(e) => {
                                setLogSubject(e.target.value);
                                setLogTopic(''); 
                              }}
                              className={`w-full border rounded-xl py-2 px-3 text-xs outline-none ${
                                isDarkMode
                                  ? 'bg-slate-900 border-slate-800 text-white'
                                  : 'bg-white border-slate-250 text-slate-800'
                              }`}
                            >
                              <option value="History">History</option>
                              <option value="Geography">Geography</option>
                              <option value="Civics">Civics</option>
                              <option value="Economics">Economics</option>
                            </select>
                          </div>

                          {/* Duration Dropdown */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                              Study Duration
                            </label>
                            <select
                              value={logDuration}
                              onChange={(e) => setLogDuration(e.target.value)}
                              className={`w-full border rounded-xl py-2 px-3 text-xs outline-none ${
                                isDarkMode
                                  ? 'bg-slate-900 border-slate-800 text-white'
                                  : 'bg-white border-slate-250 text-slate-800'
                              }`}
                            >
                              <option value="30 mins">30 mins</option>
                              <option value="1 hour">1 hour</option>
                              <option value="1.5 hours">1.5 hours</option>
                              <option value="2 hours">2 hours</option>
                              <option value="3 hours">3 hours</option>
                              <option value="4 hours+">4 hours+</option>
                            </select>
                          </div>
                        </div>

                        {/* Topic Covered */}
                        <div className="space-y-1 mb-3">
                          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                            Chapter / Topic Covered
                          </label>
                          <input
                            type="text"
                            placeholder="Type chapter or topic title..."
                            value={logTopic}
                            onChange={(e) => setLogTopic(e.target.value)}
                            className={`w-full border rounded-xl py-2 px-3 text-xs outline-none ${
                              isDarkMode
                                ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500'
                                : 'bg-white border-slate-250 text-slate-800 focus:border-blue-600'
                            }`}
                          />
                        </div>

                        {/* Image attachment section */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                            Attached Study Evidence (Photos)
                          </label>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Hidden native input */}
                            <input
                              type="file"
                              ref={logFileInputRef}
                              onChange={handleLogPhotosChange}
                              multiple
                              accept="image/*"
                              className="hidden"
                            />

                            {/* Attach trigger */}
                            <button
                              type="button"
                              onClick={() => logFileInputRef.current?.click()}
                              disabled={isCompressingLogPhotos || logPhotos.length >= 10}
                              className={`px-3.5 py-2 rounded-xl border text-[10px] font-extrabold flex items-center gap-1.5 transition-all ${
                                isDarkMode
                                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                  : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {isCompressingLogPhotos ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5 text-blue-500" />
                                  Attach Photo Evidence ({logPhotos.length}/10)
                                </>
                              )}
                            </button>

                            {/* Thumbnail list of uploaded files */}
                            {logPhotos.map((photo, pIdx) => (
                              <div key={pIdx} className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-300/40 shrink-0">
                                <img src={photo} className="w-full h-full object-cover" alt="Log evidence" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLogPhoto(pIdx)}
                                  className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Templates Bar */}
                    <div className={`px-4 py-2.5 flex items-center gap-2 border-t shrink-0 ${
                      isDarkMode ? 'border-slate-850 bg-slate-900/10' : 'border-slate-150 bg-slate-50/50'
                    }`}>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 select-none ${
                        isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-500/5 text-amber-600'
                      }`}>
                        <Zap className="w-3 h-3 animate-pulse text-amber-500" />
                        <span>Quick Replies</span>
                      </div>
                      
                      <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {(userRole === 'teacher' ? [
                          "Good progress! Keep it up. 👍",
                          "Very well written report! 🌟",
                          "Please upload your notes for this chapter.",
                          "Great effort! Practise more map questions.",
                          "Revision is looking solid. Keep going! 📚",
                          "Please complete Civics outstanding questions.",
                          "Important for board exams! 📝",
                          "Let's discuss this in tomorrow's class."
                        ] : [
                          "Yes sir, I'll complete it today.",
                          "Completed today's revision target.",
                          "Doubt in this topic.",
                          "Could you please review my map work?",
                          "I'll upload pictures of my notes soon.",
                          "Thank you, sir! 🙏",
                          "SST revision is going well."
                        ]).map((tmpl) => (
                          <button
                            key={tmpl}
                            type="button"
                            onClick={() => setChatInputText(tmpl)}
                            className={`text-[10px] px-3 py-1.5 rounded-xl border shrink-0 transition-all font-bold tracking-tight ${
                              isDarkMode
                                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:border-blue-500 hover:bg-slate-950'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-blue-600 hover:bg-slate-100'
                            }`}
                          >
                            {tmpl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat Text Input Bar */}
                    <form onSubmit={handleSendChatMessage} className={`p-4 border-t flex gap-2.5 items-center shrink-0 ${
                      isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                    }`}>
                      {/* Attach Paperclip trigger (Students only) */}
                      {userRole === 'student' && (
                        <button
                          type="button"
                          onClick={() => setIsLogTrayOpen(!isLogTrayOpen)}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isLogTrayOpen
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : isDarkMode
                                ? 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                                : 'bg-white border-slate-250 text-slate-500 hover:text-slate-800'
                          }`}
                          title="Attach Study Session log"
                        >
                          <Paperclip className="w-4.5 h-4.5" />
                        </button>
                      )}

                      {/* Main Message Input Bar */}
                      <input
                        type="text"
                        required
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                        placeholder={
                          userRole === 'student'
                            ? isLogTrayOpen 
                              ? "Type study session summary notes..." 
                              : "Ask a question or type a direct message..."
                            : `Reply to ${selectedStudentChat}...`
                        }
                        className={`flex-1 border rounded-xl py-2.5 px-4 text-xs outline-none transition-all font-semibold ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-850 text-white focus:border-blue-500 placeholder:text-slate-700'
                            : 'bg-white border-slate-250 text-slate-800 focus:border-blue-600 placeholder:text-slate-400'
                        }`}
                      />

                      {/* Submit Send Button */}
                      <button
                        type="submit"
                        disabled={isSubmittingMessage || !chatInputText.trim()}
                        className={`p-2.5 rounded-xl text-white font-extrabold flex items-center justify-center transition-all shrink-0 ${
                          isSubmittingMessage || !chatInputText.trim()
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : isLogTrayOpen 
                              ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                              : 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        }`}
                      >
                        {isSubmittingMessage ? (
                          <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        ) : isLogTrayOpen ? (
                          <BookOpen className="w-4.5 h-4.5" />
                        ) : (
                          <Send className="w-4.5 h-4.5" />
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  /* SELECTED CHAT EMPTY PLACEHOLDER (TEACHER VIEW) */
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className={`p-4 rounded-3xl border mb-3 ${
                      isDarkMode ? 'bg-slate-900 border-slate-850 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <Sparkles className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className={`text-sm font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      Select Student Logs
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed">
                      Please pick a student from the real-time roster list on the left to review their study metrics, verify logged activities, and exchange support chats.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Account Settings Modal */}
      <AnimatePresence>
        {isAccountSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with spring-fade entrance */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAccountSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl relative z-10 transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-white' 
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsAccountSettingsOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Close"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Account Settings</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage security settings for {userName}</p>
                </div>
              </div>

              {/* Password update form */}
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {settingsStatus && (
                  <div className={`p-3 rounded-xl text-[11px] font-bold leading-relaxed border ${
                    settingsStatus.type === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {settingsStatus.message}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="e.g. gurukul"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full border rounded-xl py-2.5 px-3 text-xs outline-none transition-all ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-850 text-white focus:border-blue-500 placeholder:text-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 4 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full border rounded-xl py-2.5 px-3 text-xs outline-none transition-all ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-850 text-white focus:border-blue-500 placeholder:text-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full border rounded-xl py-2.5 px-3 text-xs outline-none transition-all ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-850 text-white focus:border-blue-500 placeholder:text-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-250 dark:disabled:bg-slate-850 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center shrink-0"
                >
                  {isUpdatingPassword ? 'Updating Password...' : 'Change Password'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl relative z-10 transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-white shadow-slate-950/60' 
                  : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/60'
              }`}
            >
              <h3 className="text-sm font-bold tracking-tight mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                {confirmModal.title}
              </h3>
              <p className={`text-xs leading-relaxed mb-6 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {confirmModal.message}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    isDarkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    confirmModal.onConfirm();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all animate-none"
                >
                  {confirmModal.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Toast Notification */}
      <AnimatePresence>
        {toast && toast.isOpen && (
          <div className="fixed top-5 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold pointer-events-auto max-w-sm w-full transition-all ${
                toast.type === 'success'
                  ? isDarkMode 
                    ? 'bg-emerald-950/90 border-emerald-800 text-emerald-350 shadow-emerald-950/30' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-200/30'
                  : toast.type === 'error'
                  ? isDarkMode
                    ? 'bg-red-950/90 border-red-800 text-red-350 shadow-slate-950/30'
                    : 'bg-red-50 border-red-200 text-red-800 shadow-red-200/30'
                  : isDarkMode
                  ? 'bg-slate-900/90 border-slate-850 text-slate-300 shadow-slate-950/30'
                  : 'bg-slate-100 border-slate-200 text-slate-800 shadow-slate-250/30'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              ) : (
                <Info className="w-4 h-4 shrink-0 text-blue-500" />
              )}
              <span className="flex-1 leading-relaxed">{toast.message}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
    )}
  </AnimatePresence>
);
}
