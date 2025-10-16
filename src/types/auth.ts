/**
 * Type definitions for authentication-related data structures
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string | undefined;
    email_confirmed_at: string | undefined;
    created_at: string;
  };
}

export interface ProfileResponse {
  profile: Profile;
}

export interface ErrorResponse {
  error: string;
}

export interface LogoutResponse {
  message: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'therapist' | 'patient';
  full_name: string;
  first_name: string;
  phone?: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string | undefined;
    email_confirmed_at: string | undefined;
    created_at: string;
  };
  profile?: {
    id: string;
    role: string;
    full_name: string;
    first_name: string;
    email: string;
  };
  message: string;
  requiresEmailConfirmation: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  password: string;
  accessToken: string;
  refreshToken: string;
}

export interface ResetPasswordResponse {
  message: string;
}

// Patient and Therapist Types

export interface Profile {
  id: string;
  role: 'therapist' | 'patient' | 'admin';
  full_name: string;
  first_name: string;
  email: string;
  phone?: string;
  therapist_id?: string | null;
  avatar_url?: string;
  is_active: boolean;
  subscription_active: boolean;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface AssignTherapistRequest {
  therapistId: string;
}

export interface AssignTherapistResponse {
  message: string;
  patient: Profile;
}

export interface GetTherapistResponse {
  therapist: Profile | null;
}

export interface GetPatientsResponse {
  patients: Profile[];
}

export interface GetProfileResponse {
  profile: Profile;
}

export interface UnassignTherapistResponse {
  message: string;
}

// Avatar Upload Types

export interface UploadAvatarResponse {
  message: string;
  avatar_url: string;
  signed_url: string;
}

export interface DeleteAvatarResponse {
  message: string;
}