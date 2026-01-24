import { useState, useEffect } from 'react';
import { collection, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logError } from '../utils/logger';

export interface Charity {
    id: string;              // UUID for unique identification
    name: string;            // Charity name (e.g., "American Red Cross")
    description: string;     // Brief description (max 200 chars)
    websiteUrl: string;      // Full URL to charity website
    logoUrl?: string;        // Optional: URL to charity logo/image
    addedAt: Timestamp | ReturnType<typeof import('firebase/firestore').serverTimestamp>;  // Firestore Timestamp
    addedBy: string;         // User UID who added it
}

export interface Gym {
    id: string;
    name: string;
    admins: string[];
    charities?: Charity[];   // Array of charity objects
    logoUrl?: string;        // Optional gym logo for profile
    location?: string;       // Optional gym location/address
    websiteUrl?: string;     // Optional gym website URL
}

export function useGyms() {
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const collectionRef = collection(db, 'gyms');
        const unsubscribe = onSnapshot(
            collectionRef,
            (snapshot) => {
                const gymsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Gym));
                setGyms(gymsData);
                setLoading(false);
            },
            (error) => {
                logError('Error fetching gyms', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { gyms, loading };
}
