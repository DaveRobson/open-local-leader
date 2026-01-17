import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { type WorkoutConfigs, type WorkoutConfig, type WorkoutId } from '../types';

// Default workout configs (higher score = better) for backward compatibility
const defaultWorkoutConfigs: WorkoutConfigs = {
    w1: { id: 'w1', name: '26.1', scoreType: 'reps', unit: 'reps' },
    w2: { id: 'w2', name: '26.2', scoreType: 'reps', unit: 'reps' },
    w3: { id: 'w3', name: '26.3', scoreType: 'reps', unit: 'reps' },
};

export function useWorkoutConfig() {
    const [workoutConfigs, setWorkoutConfigs] = useState<WorkoutConfigs>(defaultWorkoutConfigs);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const docRef = doc(db, 'workouts', 'current');

        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setWorkoutConfigs({
                    w1: data.w1 || defaultWorkoutConfigs.w1,
                    w2: data.w2 || defaultWorkoutConfigs.w2,
                    w3: data.w3 || defaultWorkoutConfigs.w3,
                });
            } else {
                // If no config exists, use defaults
                setWorkoutConfigs(defaultWorkoutConfigs);
            }
            setLoading(false);
        }, (error) => {
            console.error('Error fetching workout config:', error);
            setWorkoutConfigs(defaultWorkoutConfigs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateWorkoutConfig = async (workoutId: WorkoutId, config: Partial<WorkoutConfig>) => {
        const docRef = doc(db, 'workouts', 'current');
        const currentConfig = workoutConfigs[workoutId];
        const updatedConfig = { ...currentConfig, ...config };

        try {
            await setDoc(docRef, {
                ...workoutConfigs,
                [workoutId]: updatedConfig,
            }, { merge: true });
        } catch (error) {
            console.error('Error updating workout config:', error);
            throw error;
        }
    };

    const updateAllWorkoutConfigs = async (configs: WorkoutConfigs) => {
        const docRef = doc(db, 'workouts', 'current');

        try {
            await setDoc(docRef, configs);
        } catch (error) {
            console.error('Error updating all workout configs:', error);
            throw error;
        }
    };

    return {
        workoutConfigs,
        loading,
        updateWorkoutConfig,
        updateAllWorkoutConfigs,
    };
}

export { defaultWorkoutConfigs };
