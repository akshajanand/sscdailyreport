import React, { useState } from 'react';
import { SSCFeedItem } from '../types';
import { BookOpen, Clock, Trash2, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReportBubbleProps {
  key?: React.Key;
  item: SSCFeedItem;
  currentUser: { name: string; role: 'student' | 'teacher' };
  onReactionUpdate: () => void;
  onDeleteItem: (id: string, feedType: 'report' | 'message') => void | Promise<void>;
  isDarkMode: boolean;
}

export default function ReportBubble({ item, currentUser, onDeleteItem, isDarkMode }: ReportBubbleProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Parse photos safely. Could be a single string or a JSON array of up to 10 base64 strings
  const getPhotos = (): string[] => {
    if (!item.photo_url) return [];
    try {
      if (item.photo_url.trim().startsWith('[')) {
        const parsed = JSON.parse(item.photo_url);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      }
    } catch (e) {
      // Fallback below
    }
    return [item.photo_url];
  };

  const photos = getPhotos();

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
  };

  const isReport = item.feedType === 'report';

  // Group chat identifiers
  const GROUP_DOUBTS = 'Ask Doubts Get Them Solved From Peers';
  const GROUP_NOTES = 'Share Notes To Everyone';
  
  let isGroupChat = false;
  let senderName = '';
  let displayTopic = '';
  let isMe = false;

  if (isReport) {
    const report = item;
    isGroupChat = report.student_name === GROUP_DOUBTS || report.student_name === GROUP_NOTES;
    senderName = isGroupChat 
      ? (report.topic_covered && report.topic_covered.includes(' | ') ? report.topic_covered.split(' | ')[0] : report.topic_covered)
      : (report.role === 'teacher' ? 'Ashish Sir' : report.student_name);
    displayTopic = isGroupChat && report.topic_covered && report.topic_covered.includes(' | ')
      ? report.topic_covered.split(' | ')[1]
      : report.topic_covered;
    isMe = report.role === currentUser.role && 
           (report.role === 'teacher' || (isGroupChat ? senderName === currentUser.name : report.student_name === currentUser.name));
  } else {
    const message = item;
    isGroupChat = message.recipient === GROUP_DOUBTS || message.recipient === GROUP_NOTES;
    senderName = message.sender_name;
    displayTopic = '';
    isMe = message.sender_name === currentUser.name && message.sender_role === currentUser.role;
  }

  // Check if this is a plain direct chat message
  const isPlainChat = !isReport;

  const formatMessageTime = () => {
    try {
      const date = new Date(item.created_at);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getSubjectBadgeStyle = (subject: string) => {
    const sub = subject.toLowerCase();
    if (isDarkMode) {
      if (sub.includes('history')) return 'bg-amber-950/40 text-amber-300 border border-amber-900/50';
      if (sub.includes('geography')) return 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/50';
      if (sub.includes('civics')) return 'bg-blue-950/40 text-blue-300 border border-blue-900/50';
      if (sub.includes('economics')) return 'bg-purple-950/40 text-purple-300 border border-purple-900/50';
      return 'bg-slate-800 text-slate-300 border border-slate-700';
    } else {
      if (sub.includes('history')) return 'bg-amber-50 border border-amber-250 text-amber-800 font-bold';
      if (sub.includes('geography')) return 'bg-emerald-50 border border-emerald-250 text-emerald-800 font-bold';
      if (sub.includes('civics')) return 'bg-blue-50 border border-blue-250 text-blue-800 font-bold';
      if (sub.includes('economics')) return 'bg-purple-50 border border-purple-250 text-purple-800 font-bold';
      return 'bg-slate-100 border border-slate-200 text-slate-700 font-bold';
    }
  };

  return (
    <div className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'} mb-2.5`}>
      {/* Lightbox Modal with navigation controls */}
      {activePhotoIndex !== null && photos[activePhotoIndex] && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 select-none"
          onClick={() => setActivePhotoIndex(null)}
        >
          {/* Close Button */}
          <button 
            onClick={() => setActivePhotoIndex(null)}
            className="absolute top-4 right-4 p-2.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl transition-all border border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Arrow */}
          {photos.length > 1 && (
            <button 
              onClick={handlePrevPhoto}
              className="absolute left-4 p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl transition-all border border-slate-800"
              title="Previous Photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Main Photo */}
          <img 
            src={photos[activePhotoIndex]} 
            alt={`Attached Document ${activePhotoIndex + 1}`} 
            className="max-w-full max-h-[75vh] sm:max-h-[80vh] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />

          {/* Right Arrow */}
          {photos.length > 1 && (
            <button 
              onClick={handleNextPhoto}
              className="absolute right-4 p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl transition-all border border-slate-800"
              title="Next Photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Picture Index & Title */}
          <div className="mt-4 text-center max-w-lg px-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-bold text-sm sm:text-base">{senderName}'s Record Attachment</p>
            <p className="text-slate-400 text-xs mt-1.5 font-medium truncate">{isReport ? item.topic_covered : 'Attached Media'}</p>
            {photos.length > 1 && (
              <span className="inline-block mt-3 bg-blue-600 text-white text-[10px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full">
                Image {activePhotoIndex + 1} of {photos.length}
              </span>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Styled Message Bubble */}
      <div className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 sm:p-4 border shadow-xs transition-all ${
        isMe 
          ? isDarkMode 
            ? 'bg-emerald-950/30 border-emerald-900/50 text-slate-100 rounded-tr-none' 
            : 'bg-emerald-50 border-emerald-100 text-slate-900 rounded-tr-none'
          : isDarkMode 
            ? 'bg-slate-900 border-slate-800 text-slate-100 rounded-tl-none' 
            : 'bg-white border-slate-200 text-slate-900 rounded-tl-none'
      }`}>
        {/* Sender Name Banner inside bubble (for quick context) */}
        <div className="flex items-center justify-between gap-6 mb-1 pb-1 border-b border-dashed border-slate-200/50 dark:border-slate-800/40">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-extrabold tracking-wider uppercase ${isMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {isMe ? 'Me' : senderName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] text-slate-400 font-medium">
              {formatMessageTime()}
            </span>
            {currentUser.role === 'teacher' && (
              <button 
                onClick={() => onDeleteItem(item.id, item.feedType)}
                className="p-1 rounded transition-all text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                title="Delete Message"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Bubble Content Area */}
        {isPlainChat ? (
          /* Plain Direct Message */
          <div className="space-y-2">
            <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
              isDarkMode ? 'text-slate-200' : 'text-slate-800'
            }`}>
              {item.message_text}
            </p>

            {/* Evidence photos in Chat Messages */}
            {photos.length > 0 && (
              <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800/40">
                <div className={`grid gap-1 ${
                  photos.length === 1 
                    ? 'grid-cols-1' 
                    : photos.length === 2 
                      ? 'grid-cols-2' 
                      : 'grid-cols-3'
                }`}>
                  {photos.map((photo, index) => (
                    <div 
                      key={index}
                      onClick={() => setActivePhotoIndex(index)}
                      className="group relative rounded-lg overflow-hidden border cursor-pointer aspect-square bg-slate-950 border-slate-200/20"
                    >
                      <img 
                        src={photo} 
                        alt="Evidence" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Rich Study Log Card */
          <div className="space-y-3 mt-1.5">
            {/* Header Study Banner */}
            <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 text-[11px] ${
              isDarkMode ? 'bg-slate-950/45 border-slate-850/60' : 'bg-slate-50/80 border-slate-100'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-extrabold ${getSubjectBadgeStyle(item.subject)}`}>
                  {item.subject}
                </span>
                <span className="text-slate-400 text-[9px] font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" />
                  {item.study_duration}
                </span>
              </div>
              <div className="flex items-start gap-1.5 mt-0.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                <p className={`font-bold leading-snug ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  {displayTopic}
                </p>
              </div>
            </div>

            {/* Note text */}
            <div className="space-y-0.5">
              <p className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Session Notes</p>
              <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {item.message_text}
              </p>
            </div>

            {/* Evidence photos */}
            {photos.length > 0 && (
              <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800/40">
                <div className={`grid gap-1 ${
                  photos.length === 1 
                    ? 'grid-cols-1' 
                    : photos.length === 2 
                      ? 'grid-cols-2' 
                      : 'grid-cols-3'
                }`}>
                  {photos.map((photo, index) => (
                    <div 
                      key={index}
                      onClick={() => setActivePhotoIndex(index)}
                      className="group relative rounded-lg overflow-hidden border cursor-pointer aspect-square bg-slate-950 border-slate-200/20"
                    >
                      <img 
                        src={photo} 
                        alt="Evidence" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
