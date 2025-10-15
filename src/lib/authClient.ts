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
  ErrorResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  AssignTherapistRequest,
  AssignTherapistResponse,
  GetTherapistResponse,
  GetPatientsResponse,
  GetProfileResponse,
  UnassignTherapistResponse,
  Profile,
  UploadAvatarResponse,
  DeleteAvatarResponse
} from '@/types/auth';

/**
 * Register a new user with email and password
 */
export async function register(
  email: string, 
  password: string, 
  role: 'therapist' | 'patient',
  full_name: string,
  first_name: string,
  phone?: string
): Promise<RegisterResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      email, 
      password, 
      role, 
      full_name, 
      first_name, 
      phone 
    } as RegisterRequest),
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
  const response = await fetch('/api/auth/login', {
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
  const response = await fetch('/api/auth/logout', {
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

/**
 * Request a password reset email
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email } as ForgotPasswordRequest),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to send password reset email');
  }

  return data as ForgotPasswordResponse;
}

/**
 * Reset password with the token from the reset email
 */
export async function resetPassword(password: string, accessToken: string, refreshToken: string): Promise<ResetPasswordResponse> {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password, accessToken, refreshToken } as ResetPasswordRequest),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to reset password');
  }

  return data as ResetPasswordResponse;
}

// ========================================
// Patient-Therapist Management Functions
// ========================================

/**
 * Assign a therapist to a patient
 */
export async function assignTherapist(patientId: string, therapistId: string): Promise<AssignTherapistResponse> {
  const response = await fetch(`/api/patients/${patientId}/therapist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ therapistId } as AssignTherapistRequest),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to assign therapist');
  }

  return data as AssignTherapistResponse;
}

/**
 * Get a patient's assigned therapist
 */
export async function getPatientTherapist(patientId: string): Promise<Profile | null> {
  const response = await fetch(`/api/patients/${patientId}/therapist`, {
    method: 'GET',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to fetch therapist');
  }

  return (data as GetTherapistResponse).therapist;
}

/**
 * Unassign a therapist from a patient
 */
export async function unassignTherapist(patientId: string): Promise<UnassignTherapistResponse> {
  const response = await fetch(`/api/patients/${patientId}/therapist`, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to unassign therapist');
  }

  return data as UnassignTherapistResponse;
}

/**
 * Update a patient's therapist
 */
export async function updatePatientTherapist(patientId: string, therapistId: string): Promise<AssignTherapistResponse> {
  const response = await fetch(`/api/patients/${patientId}/therapist`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ therapistId } as AssignTherapistRequest),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to update therapist');
  }

  return data as AssignTherapistResponse;
}

/**
 * Get all patients assigned to a therapist
 */
export async function getTherapistPatients(therapistId: string): Promise<Profile[]> {
  const response = await fetch(`/api/therapists/${therapistId}/patients`, {
    method: 'GET',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to fetch patients');
  }

  return (data as GetPatientsResponse).patients;
}

/**
 * Get a therapist's profile
 */
export async function getTherapistProfile(therapistId: string): Promise<Profile> {
  const response = await fetch(`/api/therapists/${therapistId}`, {
    method: 'GET',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to fetch therapist profile');
  }

  return (data as GetProfileResponse).profile;
}

/**
 * Get a patient's profile
 */
export async function getPatientProfile(patientId: string): Promise<Profile> {
  const response = await fetch(`/api/patients/${patientId}`, {
    method: 'GET',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to fetch patient profile');
  }

  return (data as GetProfileResponse).profile;
}

// ========================================
// Avatar Upload Functions
// ========================================

/**
 * Upload a profile avatar image
 */
export async function uploadAvatar(file: File): Promise<UploadAvatarResponse> {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch('/api/profile/avatar', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to upload avatar');
  }

  return data as UploadAvatarResponse;
}

/**
 * Delete the user's profile avatar
 */
export async function deleteAvatar(): Promise<DeleteAvatarResponse> {
  const response = await fetch('/api/profile/avatar', {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ErrorResponse).error || 'Failed to delete avatar');
  }

  return data as DeleteAvatarResponse;
}
