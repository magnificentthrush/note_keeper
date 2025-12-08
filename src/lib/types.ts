export interface Keypoint {
  timestamp: number;
  note: string;
}

export interface Lecture {
  id: string;
  user_id: string;
  title: string;
  audio_url: string | null;
  transcript_json: TranscriptResponse | null;
  user_keypoints: Keypoint[];
  final_notes: string | null;
  status: 'recording' | 'processing' | 'completed' | 'error';
  created_at: string;
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


