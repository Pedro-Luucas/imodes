export type CardCategory = 'modes' | 'needs' | 'strengths' | 'boat' | 'wave';
export type Gender = 'male' | 'female';

export interface CanvasCard {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  color: string;
  width: number;
  height: number;
  rotation?: number;
  imageUrl?: string;
  category?: CardCategory;
  cardNumber?: number;
  gender?: Gender;
  locked?: boolean;
}

export interface CardMetadata {
  name: string;
  path: string;
  category: CardCategory;
  cardNumber: number;
  gender?: Gender;
  publicUrl?: string;
}

export interface ParsedCardData {
  number: number;
  name: string;
  description: string;
}

export type ToolMode = 'select' | 'hand' | 'text' | 'draw';

export interface DrawPath {
  id: string;
  points: number[];
  color: string;
  strokeWidth: number;
  opacity?: number;
  x?: number;
  y?: number;
}

export interface PostItNote {
  id: string;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
  isEditing?: boolean;
}

export interface PatientSettings {
  zoomLevel: number;
}

export interface TherapistSettings {
  zoomLevel: number;
  notes?: string;
}

export interface TimeSpentEntry {
  timestamp: string; // ISO timestamp of when the session started
  timeSpent: number; // Time spent in seconds
}

export interface CanvasState {
  cards: CanvasCard[];
  notes: PostItNote[];
  drawPaths?: DrawPath[];
  gender: Gender;
  patientSettings: PatientSettings;
  therapistSettings: TherapistSettings;
  timeSpent?: TimeSpentEntry[]; // Array of time spent entries
  version?: number; // Incremented on each persisted update
  updatedAt?: string; // ISO timestamp of last persisted update
}

export interface CanvasSession {
  id: string;
  patient_id?: string | null;
  therapist_id: string;
  name: string | null;
  status: string | null;
  type?: string | null;
  data: CanvasState | null;
  created_at: string;
  updated_at: string;
}

