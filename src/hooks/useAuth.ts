import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { logError } from '../utils/logger';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState<boolean>(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (u) => {
                setUser(u);
                setAuthLoading(false);
            },
            (error) => {
                logError('Auth state change error', error);
                setAuthLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { user, authLoading };
}
