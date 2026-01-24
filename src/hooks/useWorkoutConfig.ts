import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { type WorkoutConfigs, type WorkoutConfig, type WorkoutId } from '../types';
import { logError, logWarn } from '../utils/logger';

// Default workout configs (higher score = better) for backward compatibility
const defaultWorkoutConfigs: WorkoutConfigs = {
    w1: { id: 'w1', name: '26.1', scoreType: 'reps', unit: 'reps', published: false },
    w2: { id: 'w2', name: '26.2', scoreType: 'reps', unit: 'reps', published: false },
    w3: { id: 'w3', name: '26.3', scoreType: 'reps', unit: 'reps', published: false },
};

export function useWorkoutConfig() {
    const [workoutConfigs, setWorkoutConfigs] = useState<WorkoutConfigs>(defaultWorkoutConfigs);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const docRef = doc(db, 'workouts', 'current');

        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                // Deep merge to ensure all nested properties are present
                setWorkoutConfigs({
                    w1: { ...defaultWorkoutConfigs.w1, ...data.w1 },
                    w2: { ...defaultWorkoutConfigs.w2, ...data.w2 },
                    w3: { ...defaultWorkoutConfigs.w3, ...data.w3 },
                });
            } else {
                // This is the critical fallback for production issues.
                logWarn(
                    'Workout config not found! Falling back to default (all workouts unpublished). ' +
                    'Create a "current" document in the "workouts" collection in Firestore.'
                );
                setWorkoutConfigs(defaultWorkoutConfigs);
            }
            setLoading(false);
        }, (error) => {
            logError('Error fetching workout config', error);
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
            logError('Error updating workout config', error, { workoutId });
            throw error;
        }
    };

    const updateAllWorkoutConfigs = async (configs: WorkoutConfigs) => {
        const docRef = doc(db, 'workouts', 'current');

        try {
            await setDoc(docRef, configs);
        } catch (error) {
            logError('Error updating all workout configs', error);
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
