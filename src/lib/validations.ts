import { z } from 'zod';

/**
 * Validation schema for login requests
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password is required'),
});

/**
 * Validation schema for registration requests
 */
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must not exceed 100 characters'),
  role: z.enum(['therapist', 'patient'], {
    message: 'Role must be either therapist or patient',
  }),
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must not exceed 255 characters'),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters'),
  phone: z
    .string()
    .min(1, 'Phone is required for therapists')
    .optional(),
}).refine(
  (data) => {
    // Phone is required for therapists
    if (data.role === 'therapist' && !data.phone) {
      return false;
    }
    return true;
  },
  {
    message: 'Phone is required for therapists',
    path: ['phone'],
  }
);

/**
 * Validation schema for forgot password requests
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
});

/**
 * Validation schema for reset password requests
 */
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must not exceed 100 characters'),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Validation schema for profile update requests
 */
export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must not exceed 255 characters')
    .optional(),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters')
    .optional(),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .optional(),
});

/**
 * Validation schema for change password requests
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .max(100, 'New password must not exceed 100 characters'),
});

/**
 * Validation schema for create assignment requests
 */
export const createAssignmentSchema = z.object({
  patient_id: z
    .string()
    .uuid('Invalid patient ID'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must not exceed 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  due_date: z
    .string()
    .datetime('Invalid date format'),
});

/**
 * Type exports for TypeScript
 */
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

