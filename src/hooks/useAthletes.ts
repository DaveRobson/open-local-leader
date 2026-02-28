import { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    query,
    where,
    limit,
    type DocumentData,
    type Query,
    type QuerySnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { type Athlete } from '../types';
import { type ViewState } from '../types';
import { logError } from '../utils/logger';

export function useAthletes(viewState: ViewState, filterGym: string) {
    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(false);
    const [admins, setAdmins] = useState<string[]>([])

    useEffect(() => {
        if (viewState !== 'app') return;

        setLoadingData(true);

        const collectionRef = collection(db, 'cf_leaderboard_athletes');
        const q: Query<DocumentData> = filterGym
            ? query(collectionRef, where('gymId', '==', filterGym))
            : query(collectionRef, limit(500));

        const unsubscribe = onSnapshot(
            q,
            (snapshot: QuerySnapshot<DocumentData>) => {
                const data = snapshot.docs.map(doc => {
                    const docData = doc.data();
                    return {
                        id: doc.id,
                        ...docData,
                        age: docData.age || 0,
                        w1: docData.w1 || 0,
                        w2: docData.w2 || 0,
                        w3: docData.w3 || 0,
                        division: docData.division || 'Scaled',
                        w1_division: docData.w1_division || docData.division || 'Scaled',
                        w2_division: docData.w2_division || docData.division || 'Scaled',
                        w3_division: docData.w3_division || docData.division || 'Scaled',
                        gender: docData.gender || 'M',
                        role: docData.role || 'member',
                    } as Athlete;
                });
                setAthletes(data);
                setAdmins(data.filter(a => a.role === 'admin').map(a => a.id));
                setLoadingData(false);
            },
            (error) => {
                logError('Error fetching athletes', error, { filterGym });
                setLoadingData(false);
            }
        );

        return () => unsubscribe();
    }, [viewState, filterGym]);

    return { athletes, loadingData, admins };
}
