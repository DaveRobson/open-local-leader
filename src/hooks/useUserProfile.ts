import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db } from '../config/firebase';
import { type Athlete } from '../types';

export function useUserProfile(user: User | null | undefined) {
    const [profileExists, setProfileExists] = useState<boolean>(false);
    const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
    const [userProfile, setUserProfile] = useState<Athlete | null>(null);

    useEffect(() => {
        const checkProfile = async () => {
            if (!user) {
                setProfileExists(false);
                setLoadingProfile(false);
                setUserProfile(null);
                return;
            }

            setLoadingProfile(true);
            const profileDocRef = doc(db, 'cf_leaderboard_athletes', user.uid);
            const docSnap = await getDoc(profileDocRef);
            setProfileExists(docSnap.exists());
            setUserProfile(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Athlete : null);
            setLoadingProfile(false);
        };

        checkProfile();
    }, [user]);

    return { profileExists, loadingProfile, userProfile };
}