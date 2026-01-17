import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';

export function useAdmin(gymId: string) {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

    useEffect(() => {
        if (!user) {
            setIsAdmin(false);
            setIsSuperAdmin(false);
            return;
        }

        const checkAdminStatus = async () => {
            // First check if user is a super admin
            const userDocRef = doc(db, 'cf_leaderboard_athletes', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.superAdmin === true) {
                    // Super admins have admin access to all gyms
                    setIsSuperAdmin(true);
                    setIsAdmin(true);
                    return;
                }
            }

            setIsSuperAdmin(false);

            // If not super admin, check gym-specific admin status
            if (!gymId) {
                setIsAdmin(false);
                return;
            }

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

    return { isAdmin, isSuperAdmin };
}
