import { z } from 'zod';
import type { ApiMessageBundle } from './apiMessages';

/**
 * Helper to check if a Zod issue indicates a "required" error
 */
function isRequiredError(issue: z.ZodIssue): boolean {
  return (
    issue.code === 'too_small' && 
    'minimum' in issue && 
    issue.minimum === 1
  ) || issue.code === 'invalid_type';
}

/**
 * Helper to check if a Zod issue indicates an invalid format (like invalid email)
 */
function isInvalidFormatError(issue: z.ZodIssue): boolean {
  // Zod uses 'invalid_string' for format validations like .email()
  // Cast to string to avoid TypeScript issues with different Zod versions
  return (issue.code as string) === 'invalid_string';
}

/**
 * Maps Zod validation issues to translated error messages
 * Uses the api.validation namespace from messages
 */
export function mapZodErrorsToTranslated(
  issues: z.ZodIssue[],
  messages: ApiMessageBundle
): Array<{ field: string; message: string }> {
  const validation = messages.validation;
  
  return issues.map((issue) => {
    const field = issue.path.join('.');
    const code = issue.code;
    
    // Map field + error type to translated message
    let message = issue.message; // fallback to Zod's default message
    
    switch (field) {
      case 'email':
        if (isRequiredError(issue)) {
          message = validation.emailRequired;
        } else if (isInvalidFormatError(issue)) {
          message = validation.emailInvalid;
        }
        break;
        
      case 'password':
        if (code === 'too_small') {
          message = 'minimum' in issue && issue.minimum === 8 
            ? validation.passwordMinLength 
            : validation.passwordRequired;
        } else if (code === 'too_big') {
          message = validation.passwordMaxLength;
        } else if (code === 'invalid_type') {
          message = validation.passwordRequired;
        }
        break;
        
      case 'full_name':
        if (code === 'too_small') {
          message = validation.fullNameRequired;
        } else if (code === 'too_big') {
          message = validation.fullNameMaxLength;
        } else if (code === 'invalid_type') {
          message = validation.fullNameRequired;
        }
        break;
        
      case 'first_name':
        if (code === 'too_small') {
          message = validation.firstNameRequired;
        } else if (code === 'too_big') {
          message = validation.firstNameMaxLength;
        } else if (code === 'invalid_type') {
          message = validation.firstNameRequired;
        }
        break;
        
      case 'role':
        message = validation.roleInvalid;
        break;
        
      case 'inviteToken':
        message = validation.inviteTokenInvalid;
        break;
        
      case 'accessToken':
        message = validation.accessTokenRequired;
        break;
        
      case 'refreshToken':
        message = validation.refreshTokenRequired;
        break;
    }
    
    return { field, message };
  });
}

/**
 * Helper to check if a Supabase auth error indicates email not verified
 */
export function isEmailNotVerifiedError(errorMessage: string): boolean {
  const emailNotVerifiedPatterns = [
    'email not confirmed',
    'email_not_confirmed',
    'Email not confirmed',
    'confirm your email',
  ];
  
  return emailNotVerifiedPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

