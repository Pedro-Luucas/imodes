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
  userData?: Record<string, unknown>;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string | undefined;
    email_confirmed_at: string | undefined;
    created_at: string;
  };
  message: string;
  requiresEmailConfirmation: boolean;
}
