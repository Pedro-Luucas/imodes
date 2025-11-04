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
}

export interface ParsedCardData {
  number: number;
  name: string;
  description: string;
}

export type ToolMode = 'select' | 'hand' | 'text';

export interface PostItNote {
  id: string;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
  isEditing?: boolean;
}

export interface PersonalSettings {
  zoomLevel: number;
}

export interface CanvasState {
  cards: CanvasCard[];
  gender: Gender;
  patientSettings: PersonalSettings;
  therapistSettings: PersonalSettings;
}

export interface CanvasSession {
  id: string;
  patient_id: string;
  therapist_id: string;
  name: string | null;
  status: string | null;
  data: CanvasState | null;
  created_at: string;
  updated_at: string;
}

