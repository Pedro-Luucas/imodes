/**
 * Client-side authentication utilities
 * These functions make requests to the backend API routes
 */

import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest,
  RegisterResponse,
  ProfileResponse, 
  ErrorResponse 
} from '@/types/auth';

/**
 * Register a new user with email and password
 */
export async function register(
  email: string, 
  password: string, 
  userData?: Record<string, unknown>
): Promise<RegisterResponse> {
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, userData } as RegisterRequest),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Registration failed');
  }

  return data as RegisterResponse;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password } as LoginRequest),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Login failed');
  }

  return data as LoginResponse;
}

/**
 * Get the current user's profile
 */
export async function getProfile(): Promise<ProfileResponse> {
  const response = await fetch('/api/profile', {
    method: 'GET',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to fetch profile');
  }

  return data as ProfileResponse;
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  const response = await fetch('/api/logout', {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Logout failed');
  }
}

/**
 * Check if the user is authenticated
 * Returns true if the user has a valid session
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    await getProfile();
    return true;
  } catch {
    return false;
  }
}
