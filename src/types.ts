export interface SSCReport {
  id: string;
  created_at: string;
  student_name: string;
  role: 'student' | 'teacher';
  subject: string;
  topic_covered: string;
  study_duration: string; // e.g., "1.5 hours"
  message_text: string;
  photo_url?: string;
  reactions?: Record<string, number>; // emoji reactions mapped to counts
}

export type NewSSCReport = Omit<SSCReport, 'id' | 'created_at'>;

export interface SSCMessage {
  id: string;
  created_at: string;
  sender_name: string;
  sender_role: 'student' | 'teacher';
  recipient: string; // 'Ashish Sir' or student_name or group_channel_name
  message_text: string;
  photo_url?: string;
}

export type NewSSCMessage = Omit<SSCMessage, 'id' | 'created_at'>;

export interface SSCChannel {
  id: string;
  created_at: string;
  name: string;
  is_global: boolean;
  allowed_students: string[]; // list of student names permitted, or empty if global
}

export type NewSSCChannel = Omit<SSCChannel, 'id' | 'created_at'>;

export type SSCFeedItem = 
  | (SSCReport & { feedType: 'report' })
  | (SSCMessage & { feedType: 'message' });


