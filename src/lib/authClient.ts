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
  DeleteAvatarResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  DeleteAccountResponse
} from '@/types/auth';

/**
 * Get translated error messages for the current locale
 * These are fallbacks for when API doesn't return an error message
 */
function getClientErrorMessages() {
  const locale = typeof document !== 'undefined' 
    ? document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] || 'en'
    : 'en';
  
  const messages = {
    en: {
      networkError: 'Connection error. Please check your internet and try again.',
      loginFailed: 'Login failed. Please try again.',
      registrationFailed: 'Registration failed. Please try again.',
      profileFetchFailed: 'Failed to fetch profile. Please try again.',
      logoutFailed: 'Logout failed. Please try again.',
      passwordResetFailed: 'Failed to send password reset email. Please try again.',
      passwordUpdateFailed: 'Failed to reset password. Please try again.',
      assignTherapistFailed: 'Failed to assign therapist. Please try again.',
      fetchTherapistFailed: 'Failed to fetch therapist. Please try again.',
      unassignTherapistFailed: 'Failed to unassign therapist. Please try again.',
      updateTherapistFailed: 'Failed to update therapist. Please try again.',
      fetchPatientsFailed: 'Failed to fetch patients. Please try again.',
      fetchTherapistProfileFailed: 'Failed to fetch therapist profile. Please try again.',
      fetchPatientProfileFailed: 'Failed to fetch patient profile. Please try again.',
      uploadAvatarFailed: 'Failed to upload avatar. Please try again.',
      deleteAvatarFailed: 'Failed to delete avatar. Please try again.',
      updateProfileFailed: 'Failed to update profile. Please try again.',
      changePasswordFailed: 'Failed to change password. Please try again.',
      deleteAccountFailed: 'Failed to delete account. Please try again.',
    },
    pt: {
      networkError: 'Erro de conexão. Verifique sua internet e tente novamente.',
      loginFailed: 'Falha ao entrar. Por favor, tente novamente.',
      registrationFailed: 'Falha no registro. Por favor, tente novamente.',
      profileFetchFailed: 'Falha ao buscar perfil. Por favor, tente novamente.',
      logoutFailed: 'Falha ao sair. Por favor, tente novamente.',
      passwordResetFailed: 'Falha ao enviar e-mail de redefinição. Por favor, tente novamente.',
      passwordUpdateFailed: 'Falha ao redefinir senha. Por favor, tente novamente.',
      assignTherapistFailed: 'Falha ao atribuir terapeuta. Por favor, tente novamente.',
      fetchTherapistFailed: 'Falha ao buscar terapeuta. Por favor, tente novamente.',
      unassignTherapistFailed: 'Falha ao remover terapeuta. Por favor, tente novamente.',
      updateTherapistFailed: 'Falha ao atualizar terapeuta. Por favor, tente novamente.',
      fetchPatientsFailed: 'Falha ao buscar pacientes. Por favor, tente novamente.',
      fetchTherapistProfileFailed: 'Falha ao buscar perfil do terapeuta. Por favor, tente novamente.',
      fetchPatientProfileFailed: 'Falha ao buscar perfil do paciente. Por favor, tente novamente.',
      uploadAvatarFailed: 'Falha ao enviar avatar. Por favor, tente novamente.',
      deleteAvatarFailed: 'Falha ao excluir avatar. Por favor, tente novamente.',
      updateProfileFailed: 'Falha ao atualizar perfil. Por favor, tente novamente.',
      changePasswordFailed: 'Falha ao alterar senha. Por favor, tente novamente.',
      deleteAccountFailed: 'Falha ao excluir conta. Por favor, tente novamente.',
    },
  };
  
  return locale.startsWith('pt') ? messages.pt : messages.en;
}

/**
 * Helper to check if an error is a network error
 */
function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && 
    (error.message.includes('fetch') || 
     error.message.includes('network') || 
     error.message.includes('Failed to fetch'));
}

/**
 * Register a new user with email and password
 */
export async function register(
  email: string, 
  password: string, 
  role: 'therapist' | 'patient',
  full_name: string,
  first_name: string,
  phone?: string,
  inviteToken?: string
): Promise<RegisterResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
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
        phone,
        inviteToken,
      } as RegisterRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.registrationFailed);
    }

    return data as RegisterResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password } as LoginRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.loginFailed);
    }

    return data as LoginResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Get the current user's profile
 */
export async function getProfile(): Promise<ProfileResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch('/api/profile', {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.profileFetchFailed);
    }

    return data as ProfileResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.logoutFailed);
    }
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
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
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email } as ForgotPasswordRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.passwordResetFailed);
    }

    return data as ForgotPasswordResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Reset password with the token from the reset email
 */
export async function resetPassword(password: string, accessToken: string, refreshToken: string): Promise<ResetPasswordResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password, accessToken, refreshToken } as ResetPasswordRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.passwordUpdateFailed);
    }

    return data as ResetPasswordResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

// ========================================
// Patient-Therapist Management Functions
// ========================================

/**
 * Assign a therapist to a patient
 */
export async function assignTherapist(patientId: string, therapistId: string): Promise<AssignTherapistResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch(`/api/patients/${patientId}/therapist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ therapistId } as AssignTherapistRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.assignTherapistFailed);
    }

    return data as AssignTherapistResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Get a patient's assigned therapist
 */
export async function getPatientTherapist(patientId: string): Promise<Profile | null> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch(`/api/patients/${patientId}/therapist`, {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.fetchTherapistFailed);
    }

    return (data as GetTherapistResponse).therapist;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Unassign a therapist from a patient
 */
export async function unassignTherapist(patientId: string): Promise<UnassignTherapistResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch(`/api/patients/${patientId}/therapist`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.unassignTherapistFailed);
    }

    return data as UnassignTherapistResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Update a patient's therapist
 */
export async function updatePatientTherapist(patientId: string, therapistId: string): Promise<AssignTherapistResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch(`/api/patients/${patientId}/therapist`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ therapistId } as AssignTherapistRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.updateTherapistFailed);
    }

    return data as AssignTherapistResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Get all patients assigned to a therapist
 */
export async function getTherapistPatients(therapistId: string): Promise<Profile[]> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch(`/api/therapists/${therapistId}/patients`, {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.fetchPatientsFailed);
    }

    return (data as GetPatientsResponse).patients;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Get a therapist's profile
 */
export async function getTherapistProfile(therapistId: string): Promise<Profile> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch(`/api/therapists/${therapistId}`, {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.fetchTherapistProfileFailed);
    }

    return (data as GetProfileResponse).profile;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Get a patient's profile
 */
export async function getPatientProfile(patientId: string): Promise<Profile> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch(`/api/patients/${patientId}`, {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.fetchPatientProfileFailed);
    }

    return (data as GetProfileResponse).profile;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

// ========================================
// Avatar Upload Functions
// ========================================

/**
 * Upload a profile avatar image
 */
export async function uploadAvatar(file: File): Promise<UploadAvatarResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.uploadAvatarFailed);
    }

    return data as UploadAvatarResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Delete the user's profile avatar
 */
export async function deleteAvatar(): Promise<DeleteAvatarResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch('/api/profile/avatar', {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.deleteAvatarFailed);
    }

    return data as DeleteAvatarResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

// ========================================
// Profile Management Functions
// ========================================

/**
 * Update the current user's profile information
 */
export async function updateProfile(updates: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.updateProfileFailed);
    }

    return data as UpdateProfileResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Change the current user's password
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch('/api/profile/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword } as ChangePasswordRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.changePasswordFailed);
    }

    return data as ChangePasswordResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}

/**
 * Delete the current user's account and all associated data
 */
export async function deleteAccount(): Promise<DeleteAccountResponse> {
  const errorMessages = getClientErrorMessages();
  
  try {
    const response = await fetch('/api/profile/delete-account', {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ErrorResponse).error || errorMessages.deleteAccountFailed);
    }

    return data as DeleteAccountResponse;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(errorMessages.networkError);
    }
    throw error;
  }
}
