import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db } from '../config/firebase';

export function useSuperAdmin(user: User | null | undefined) {
    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!user) {
            setIsSuperAdmin(false);
            setLoading(false);
            return;
        }

        const profileDocRef = doc(db, 'cf_leaderboard_athletes', user.uid);

        const unsubscribe = onSnapshot(profileDocRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setIsSuperAdmin(data.superAdmin === true);
            } else {
                setIsSuperAdmin(false);
            }
            setLoading(false);
        }, (error) => {
            console.error('Error checking super admin status:', error);
            setIsSuperAdmin(false);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { isSuperAdmin, loading };
}
