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

export function useAthletes(viewState: ViewState, filterGym: string) {
    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(false);

    useEffect(() => {
        if (viewState !== 'app') return;

        setLoadingData(true);

        let q: Query<DocumentData>;
        const collectionRef = collection(db, 'cf_leaderboard_athletes');

        if (filterGym) {
            q = query(collectionRef, where('gymId', '==', filterGym));
        } else {
            q = query(collectionRef, limit(500));
        }

        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
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
                    gender: docData.gender || 'M',
                } as Athlete;
            });
            setAthletes(data);
            setLoadingData(false);
        });

        return () => unsubscribe();
    }, [viewState, filterGym]);

    return { athletes, loadingData };
}
