export interface Keypoint {
  timestamp: number;
  note: string;
}

export interface FactCheckItem {
  claim: string;
  correction: string;
  rationale: string;
  confidence: number; // 0..1
  severity: 'low' | 'medium' | 'high';
  source_quote?: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  lecture_count?: number; // Optional: computed field for UI
}

export interface Lecture {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  audio_url: string | null;
  transcript_json: TranscriptResponse | null;
  user_keypoints: Keypoint[];
  final_notes: string | null;
  ai_notes?: string | null;
  notes_edited?: boolean;
  fact_checks?: FactCheckItem[] | null;
  status: 'recording' | 'processing' | 'completed' | 'error';
  created_at: string;
  soniox_job_id?: string | null;
}

export interface TranscriptUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
  words: TranscriptWord[];
}

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string;
}

export interface TranscriptResponse {
  id: string;
  status: string;
  text: string;
  utterances: TranscriptUtterance[];
  audio_duration: number;
}

export interface User {
  id: string;
  email: string;
}


