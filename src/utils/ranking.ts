import { type Athlete, type AthleteWithRank, type DivisionFilter, type GenderFilter, type AgeGroupFilter, type WorkoutConfigs, type WorkoutConfig } from '../types';

const isInAgeGroup = (age: number | string, group: string): boolean => {
    const a = parseInt(age as string, 10);
    if (isNaN(a)) return false;
    switch (group) {
        case '14-17': return a >= 14 && a <= 17;
        case '18-34': return a >= 18 && a <= 34;
        case '35-39': return a >= 35 && a <= 39;
        case '40-44': return a >= 40 && a <= 44;
        case '45-49': return a >= 45 && a <= 49;
        case '50-54': return a >= 50 && a <= 54;
        case '55+':   return a >= 55;
        default: return true;
    }
};

// Default workout configs (higher score = better) for backward compatibility
const defaultWorkoutConfigs: WorkoutConfigs = {
    w1: { id: 'w1', name: '26.1', scoreType: 'reps', unit: 'reps', published: false },
    w2: { id: 'w2', name: '26.2', scoreType: 'reps', unit: 'reps', published: false },
    w3: { id: 'w3', name: '26.3', scoreType: 'reps', unit: 'reps', published: false },
};

// Helper to safely parse scores
const getScore = (val: number | string | undefined) => val ? parseFloat(String(val)) : 0;

/**
 * Sort athletes by performance for a given workout based on score type.
 */
const sortByPerformance = (
    athletes: AthleteWithRank[],
    workoutKey: 'w1' | 'w2' | 'w3',
    config: WorkoutConfig
): void => {
    const cappedKey = `${workoutKey}_capped` as keyof Athlete;
    const tiebreakerKey = `${workoutKey}_tiebreaker` as keyof Athlete;

    athletes.sort((a, b) => {
        const aCapped = a[cappedKey] as boolean | undefined;
        const bCapped = b[cappedKey] as boolean | undefined;
        const aTB = (a[tiebreakerKey] as number) || Infinity;
        const bTB = (b[tiebreakerKey] as number) || Infinity;
        const scoreA = getScore(a[workoutKey]);
        const scoreB = getScore(b[workoutKey]);

        // Athletes with no score always go to bottom
        const aHasScore = scoreA > 0;
        const bHasScore = scoreB > 0;
        if (!aHasScore && bHasScore) return 1;
        if (aHasScore && !bHasScore) return -1;
        if (!aHasScore && !bHasScore) return 0;

        if (config.scoreType === 'time') {
            const timeDiff = scoreA - scoreB;
            return timeDiff === 0 ? aTB - bTB : timeDiff;
        } else if (config.scoreType === 'time_cap_reps') {
            const aFinished = !aCapped;
            const bFinished = !bCapped;
            if (aFinished && !bFinished) return -1;
            if (!aFinished && bFinished) return 1;
            if (aFinished && bFinished) return scoreA - scoreB;
            const repsDiff = scoreB - scoreA;
            return repsDiff === 0 ? aTB - bTB : repsDiff;
        } else {
            const primaryDiff = scoreB - scoreA;
            return primaryDiff === 0 ? aTB - bTB : primaryDiff;
        }
    });
};

/**
 * Check if two athletes have equal scores (for tie ranking)
 */
const scoresAreEqual = (
    a: AthleteWithRank,
    b: AthleteWithRank,
    workoutKey: 'w1' | 'w2' | 'w3',
    config: WorkoutConfig
): boolean => {
    const cappedKey = `${workoutKey}_capped` as keyof Athlete;
    const tiebreakerKey = `${workoutKey}_tiebreaker` as keyof Athlete;
    const scoreA = getScore(a[workoutKey]);
    const scoreB = getScore(b[workoutKey]);

    if (scoreA !== scoreB) return false;
    if (config.scoreType === 'time_cap_reps') {
        const aCapped = a[cappedKey] as boolean | undefined;
        const bCapped = b[cappedKey] as boolean | undefined;
        if (aCapped !== bCapped) return false;
    }
    const aTB = (a[tiebreakerKey] as number) || 0;
    const bTB = (b[tiebreakerKey] as number) || 0;
    return aTB === bTB;
};

export const calculateRankings = (
    athletes: Athlete[],
    searchTerm: string,
    filterDivision: DivisionFilter,
    filterGender: GenderFilter,
    filterAgeGroup: AgeGroupFilter,
    workoutConfigs: WorkoutConfigs = defaultWorkoutConfigs
): AthleteWithRank[] => {
    // 1. Initialize all athletes with ranking fields
    const processed: AthleteWithRank[] = athletes.map(a => ({...a, totalPoints: 0, participation: 0}));

    // 2. Calculate ranks for each published workout
    (['w1', 'w2', 'w3'] as const).forEach(w => {
        const config = workoutConfigs[w];
        if (!config.published) return;

        const genders: ('M' | 'F')[] = ['M', 'F'];
        genders.forEach(gender => {
            const divisions = {
                Rx: processed.filter(a => a.division === 'Rx' && a.gender === gender),
                Scaled: processed.filter(a => a.division === 'Scaled' && a.gender === gender),
                Foundations: processed.filter(a => a.division === 'Foundations' && a.gender === gender),
            };

            sortByPerformance(divisions.Rx, w, config);
            sortByPerformance(divisions.Scaled, w, config);
            sortByPerformance(divisions.Foundations, w, config);

            let rankOffset = 0;
            (['Rx', 'Scaled', 'Foundations'] as const).forEach(div => {
                const group = divisions[div];
                let currentRank = rankOffset + 1;
                for (let i = 0; i < group.length; i++) {
                    const athlete = group[i];
                    const prevAthlete = group[i - 1];
                    if (i > 0 && scoresAreEqual(athlete, prevAthlete, w, config)) {
                        athlete[`${w}_rank`] = prevAthlete[`${w}_rank`];
                    } else {
                        athlete[`${w}_rank`] = currentRank;
                    }
                    currentRank++;
                }
                rankOffset += group.length;
            });
        });
    });

    // 3. Calculate total points, but only for "live" workouts.
    // A workout is live if it's published AND at least one person has submitted a score.
    const liveWorkouts = (['w1', 'w2', 'w3'] as const).filter(wKey =>
        workoutConfigs[wKey].published && processed.some(p => getScore(p[wKey]) > 0)
    );

    if (liveWorkouts.length > 0) {
        processed.forEach(a => {
            const sameGenderCount = processed.filter(p => p.gender === a.gender).length;
            const missedPenalty = sameGenderCount + 1;

            liveWorkouts.forEach(wKey => {
                const score = getScore(a[wKey]);
                if (score > 0) {
                    a.totalPoints += a[`${wKey}_rank`] || missedPenalty;
                    a.participation++;
                } else {
                    a.totalPoints += missedPenalty;
                }
            });
        });
    }

    // 4. Apply user's filters to the fully processed list
    let filtered = processed;
    if (filterDivision !== 'all') {
        filtered = filtered.filter(a => a.division === filterDivision);
    }
    if (filterGender !== 'all') {
        filtered = filtered.filter(a => a.gender === filterGender);
    }
    if (filterAgeGroup !== 'all') {
        filtered = filtered.filter(a => isInAgeGroup(a.age, filterAgeGroup));
    }
    if (searchTerm) {
        filtered = filtered.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // 5. Sort the final list for display
    filtered.sort((a, b) => {
        if (b.participation !== a.participation) return b.participation - a.participation;
        return a.totalPoints - b.totalPoints;
    });

    return filtered;
};
