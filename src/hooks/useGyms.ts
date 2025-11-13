import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Gym {
    id: string;
    name: string;
    admins: string[];
}

export function useGyms() {
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const collectionRef = collection(db, 'gyms');
        const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
            const gymsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Gym));
            setGyms(gymsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { gyms, loading };
}
