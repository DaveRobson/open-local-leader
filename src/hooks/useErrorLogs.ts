import { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit,
    where,
    type Query,
    type DocumentData,
    type Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ErrorLog {
    id: string;
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
    timestamp: Timestamp | null;
}

interface UseErrorLogsOptions {
    userId?: string;
    maxLogs?: number;
}

export function useErrorLogs(options: UseErrorLogsOptions = {}) {
    const { userId, maxLogs = 100 } = options;
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const collectionRef = collection(db, 'error_logs');

        let q: Query<DocumentData>;
        if (userId) {
            q = query(
                collectionRef,
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(maxLogs)
            );
        } else {
            q = query(
                collectionRef,
                orderBy('timestamp', 'desc'),
                limit(maxLogs)
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const logsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as ErrorLog[];
                setLogs(logsData);
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching error logs:', err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, maxLogs]);

    return { logs, loading, error };
}
