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
  user: {
    id: string;
    email: string | undefined;
    email_confirmed_at: string | undefined;
    phone: string | undefined;
    created_at: string;
    updated_at: string | undefined;
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
  };
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