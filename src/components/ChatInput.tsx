import React, { useState, useRef } from 'react';
import { Image, X, Upload, BookOpen, Clock, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { NewSSCReport } from '../types';
import { compressImage } from '../lib/imageCompressor';

interface ChatInputProps {
  studentName: string;
  role: 'student' | 'teacher';
  onSend: (report: NewSSCReport) => Promise<void>;
  isDarkMode: boolean;
}

// Topic suggestions by subject to make selection super simple!
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

export default function ChatInput({ studentName, role, onSend, isDarkMode }: ChatInputProps) {
  const [subject, setSubject] = useState('History');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('1 hour');
  const [message, setMessage] = useState('');
  
  // Local array of attached base64 images (cap at 10)
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle native file selection and client-side compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Calculate total if we add these
    const totalSelected = attachedPhotos.length + files.length;
    if (totalSelected > 10) {
      setUploadError('Maximum limit is 10 photos per study report.');
      // Proceed with what fits
    }

    setIsCompressing(true);
    const compressedList: string[] = [...attachedPhotos];

    try {
      // Loop over files up to the maximum 10-pic limit
      for (let i = 0; i < files.length; i++) {
        if (compressedList.length >= 10) break;
        const file = files[i];
        
        // Ensure it's an image
        if (!file.type.startsWith('image/')) {
          continue;
        }

        const compressedBase64 = await compressImage(file);
        compressedList.push(compressedBase64);
      }
      setAttachedPhotos(compressedList);
    } catch (err) {
      console.error('Image compression failed:', err);
      setUploadError('Failed to process one or more images. Please try again.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input element
      }
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setUploadError(null);
    setAttachedPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      // Serialize array of base64 photos into the single photo_url text column
      const photoPayload = attachedPhotos.length > 0 ? JSON.stringify(attachedPhotos) : undefined;

      await onSend({
        student_name: studentName,
        role: role,
        subject: subject,
        topic_covered: topic.trim(),
        study_duration: duration,
        message_text: message.trim(),
        photo_url: photoPayload,
      });

      // Clear form states upon successful upload
      setTopic('');
      setMessage('');
      setAttachedPhotos([]);
      setUploadError(null);
    } catch (err) {
      console.error(err);
      setUploadError('Submission failed. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`border-t p-4 sm:p-5 rounded-2xl transition-all duration-300 ${
      isDarkMode 
        ? 'bg-slate-900 border-slate-800' 
        : 'bg-white border-slate-200'
    }`}>
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-3.5 flex items-center gap-2 ${
        isDarkMode ? 'text-blue-400' : 'text-blue-800'
      }`}>
        <FileText className="w-4 h-4" />
        Log Your Daily Study Report
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {uploadError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Input Parameters Row: Subject & Study Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Subject Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              Academic Subject
            </label>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setTopic(''); // Reset topic for new suggestions
              }}
              className={`w-full border rounded-xl py-2.5 px-3.5 text-xs outline-none font-semibold cursor-pointer transition-all ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600'
              }`}
            >
              {['History', 'Geography', 'Civics', 'Economics'].map((sub) => (
                <option key={sub} value={sub} className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Duration of Study
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={`w-full border rounded-xl py-2.5 px-3.5 text-xs outline-none font-semibold cursor-pointer transition-all ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600'
              }`}
            >
              {['30 mins', '1 hour', '1.5 hours', '2 hours', '3 hours', '4 hours+'].map((t) => (
                <option key={t} value={t} className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Topic Suggestions Section */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Suggested Board Exam Chapters</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar select-none">
            {SUBJECT_SUGGESTIONS[subject]?.map((sugg) => (
              <button
                key={sugg}
                type="button"
                onClick={() => setTopic(sugg)}
                className={`text-[10px] px-3.5 py-1.5 rounded-full shrink-0 border transition-all uppercase tracking-wider font-extrabold ${
                  topic === sugg 
                    ? isDarkMode
                      ? 'bg-blue-950/40 border-blue-500 text-blue-400' 
                      : 'bg-blue-50 border-blue-600 text-blue-800'
                    : isDarkMode
                      ? 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:border-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {sugg}
              </button>
            ))}
          </div>
        </div>

        {/* Specific Chapter / Subtopic Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Specific Topic or Chapter Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Map Marking of Major Iron & Steel Plants"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className={`w-full border rounded-xl py-2.5 px-3.5 text-xs outline-none transition-all ${
              isDarkMode
                ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500 placeholder:text-slate-700'
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600 placeholder:text-slate-400'
            }`}
          />
        </div>

        {/* Message Notes Textarea */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Revision Summary & Tasks Completed
          </label>
          <textarea
            required
            rows={2.5}
            placeholder="Write details of what you revised, what textbook exercises were solved, or maps practiced..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`w-full border rounded-xl py-2.5 px-3.5 text-xs outline-none transition-all resize-none ${
              isDarkMode
                ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500 placeholder:text-slate-700'
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600 placeholder:text-slate-400'
            }`}
          />
        </div>

        {/* Native Multi-Photo Direct Upload Area */}
        <div className="space-y-2">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Study Photo Evidence (Up to 10 Pictures)</span>
            <span className={attachedPhotos.length >= 10 ? 'text-red-500 font-bold' : 'text-slate-400'}>
              {attachedPhotos.length} / 10 Attached
            </span>
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            className="hidden"
          />

          {/* Clickable upload area */}
          <button
            type="button"
            disabled={attachedPhotos.length >= 10 || isCompressing}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-4.5 px-4 border border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
              attachedPhotos.length >= 10
                ? 'bg-slate-500/5 border-slate-800 text-slate-500 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-blue-500 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-600 hover:bg-slate-100/50'
            }`}
          >
            {isCompressing ? (
              <>
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-xs font-semibold">Processing and compressing photos...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-bold">Upload Photos Directly</span>
                <span className="text-[10px] text-slate-500">Camera roll, file manager, or gallery (JPEG/PNG)</span>
              </>
            )}
          </button>

          {/* Preview list of attached files with deletion option */}
          {attachedPhotos.length > 0 && (
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mt-2">
              {attachedPhotos.map((photo, index) => (
                <div 
                  key={index} 
                  className={`relative aspect-square rounded-lg overflow-hidden border bg-slate-950 group ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <img src={photo} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  
                  {/* Remove hover button */}
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  {/* Image number indicator */}
                  <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[8px] font-extrabold px-1 rounded">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={isSubmitting || !topic.trim() || !message.trim() || isCompressing}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting Study Report...</span>
            </>
          ) : (
            <span>Submit Study Report</span>
          )}
        </button>

      </form>
    </div>
  );
}
