import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';

export function useAdmin(gymId: string) {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(() => {
        if (!user || !gymId) {
            setIsAdmin(false);
            return;
        }

        const checkAdminStatus = async () => {
            const gymDocRef = doc(db, 'gyms', gymId);
            const gymDoc = await getDoc(gymDocRef);

            if (gymDoc.exists()) {
                const gymData = gymDoc.data();
                const admins = gymData.admins || [];
                setIsAdmin(admins.includes(user.uid));
            } else {
                setIsAdmin(false);
            }
        };

        checkAdminStatus();
    }, [user, gymId]);

    return isAdmin;
}
