/**
 * Maps Firebase Auth error codes to user-friendly messages.
 */

const AUTH_ERROR_MESSAGES: Record<string, string> = {
    // Email/Password errors
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',

    // Rate limiting
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',

    // Google OAuth errors
    'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
    'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups and try again.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',

    // Network errors
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',

    // Account errors
    'auth/user-disabled': 'This account has been disabled.',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in method.',

    // General
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/requires-recent-login': 'Please sign in again to continue.',
};

/**
 * Get a user-friendly error message from a Firebase Auth error.
 * @param error - The error object from Firebase Auth
 * @returns A user-friendly error message string
 */
export function getAuthErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code: string }).code;
        return AUTH_ERROR_MESSAGES[code] || 'An unexpected error occurred. Please try again.';
    }
    return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if an error is a user-cancelled error (popup closed, etc.)
 * These are typically not real errors and may not need to be displayed.
 */
export function isUserCancelledError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code: string }).code;
        return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
    }
    return false;
}
