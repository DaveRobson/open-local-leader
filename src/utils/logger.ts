/**
 * Custom logger that writes errors to Firestore for remote visibility.
 * Console logs in dev, writes to Firestore in production.
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface LogEntry {
    level: 'error' | 'warn' | 'info';
    message: string;
    error?: {
        name?: string;
        message?: string;
        stack?: string;
        code?: string;
    };
    context?: Record<string, unknown>;
    url: string;
    userAgent: string;
    userId: string | null;
    timestamp: ReturnType<typeof serverTimestamp>;
}

// Sensitive keys to sanitize from logged data
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization', 'credential'];

/**
 * Recursively sanitizes an object by removing sensitive keys.
 */
function sanitize<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitize) as T;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (SENSITIVE_KEYS.some(sensitive => key.toLowerCase().includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
            sanitized[key] = sanitize(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized as T;
}

/**
 * Extract error details from various error types.
 */
function extractErrorDetails(error: unknown): LogEntry['error'] {
    if (!error) return undefined;

    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as { code?: string }).code,
        };
    }

    if (typeof error === 'object' && error !== null) {
        const e = error as Record<string, unknown>;
        return {
            name: String(e.name || 'Unknown'),
            message: String(e.message || JSON.stringify(error)),
            code: e.code as string | undefined,
        };
    }

    return { message: String(error) };
}

/**
 * Write a log entry to Firestore.
 */
async function writeToFirestore(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    try {
        const logsCollection = collection(db, 'error_logs');
        await addDoc(logsCollection, {
            ...entry,
            timestamp: serverTimestamp(),
        });
    } catch (err) {
        // Last resort: log to console if Firestore write fails
        console.error('[Logger] Failed to write to Firestore:', err);
    }
}

/**
 * Log an error with optional context.
 */
export async function logError(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>
): Promise<void> {
    const entry: Omit<LogEntry, 'timestamp'> = {
        level: 'error',
        message,
        error: extractErrorDetails(error),
        context: context ? sanitize(context) : undefined,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        userId: auth.currentUser?.uid || null,
    };

    // Always log to console in dev
    if (import.meta.env.DEV) {
        console.error(`[Error] ${message}`, error, context);
    }

    // Write to Firestore (in all environments for remote visibility)
    await writeToFirestore(entry);
}

/**
 * Log a warning with optional context.
 */
export async function logWarn(
    message: string,
    context?: Record<string, unknown>
): Promise<void> {
    const entry: Omit<LogEntry, 'timestamp'> = {
        level: 'warn',
        message,
        context: context ? sanitize(context) : undefined,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        userId: auth.currentUser?.uid || null,
    };

    if (import.meta.env.DEV) {
        console.warn(`[Warn] ${message}`, context);
    }

    await writeToFirestore(entry);
}

/**
 * Log info with optional context.
 */
export async function logInfo(
    message: string,
    context?: Record<string, unknown>
): Promise<void> {
    const entry: Omit<LogEntry, 'timestamp'> = {
        level: 'info',
        message,
        context: context ? sanitize(context) : undefined,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        userId: auth.currentUser?.uid || null,
    };

    if (import.meta.env.DEV) {
        console.info(`[Info] ${message}`, context);
    }

    // Only write info logs to Firestore in production to reduce noise
    if (!import.meta.env.DEV) {
        await writeToFirestore(entry);
    }
}

// Convenience export for the most common use case
export const logger = {
    error: logError,
    warn: logWarn,
    info: logInfo,
};

export default logger;
