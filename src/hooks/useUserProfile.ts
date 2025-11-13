import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db } from '../config/firebase';

export function useUserProfile(user: User | null | undefined) {
    const [profileExists, setProfileExists] = useState<boolean>(false);
    const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

    useEffect(() => {
        const checkProfile = async () => {
            if (!user) {
                setProfileExists(false);
                setLoadingProfile(false);
                return;
            }

            setLoadingProfile(true);
            const profileDocRef = doc(db, 'cf_leaderboard_athletes', user.uid);
            const docSnap = await getDoc(profileDocRef);
            setProfileExists(docSnap.exists());
            setLoadingProfile(false);
        };

        checkProfile();
    }, [user]);

    return { profileExists, loadingProfile };
}