import { type Athlete, type AthleteWithRank, type DivisionFilter, type GenderFilter, type AgeGroupFilter, type WorkoutConfigs } from '../types';

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
    w1: { id: 'w1', name: '26.1', scoreType: 'reps', unit: 'reps' },
    w2: { id: 'w2', name: '26.2', scoreType: 'reps', unit: 'reps' },
    w3: { id: 'w3', name: '26.3', scoreType: 'reps', unit: 'reps' },
};

export const calculateRankings = (
    athletes: Athlete[],
    searchTerm: string,
    filterDivision: DivisionFilter,
    filterGender: GenderFilter,
    filterAgeGroup: AgeGroupFilter,
    workoutConfigs: WorkoutConfigs = defaultWorkoutConfigs
): AthleteWithRank[] => {
    // Helper to safely parse scores
    const getScore = (val: number | string | undefined) => val ? parseFloat(String(val)) : 0;

    // 1. Pre-calculate ranks for each workout in isolation based on division and gender
    const processed: AthleteWithRank[] = athletes.map(a => ({...a, totalPoints: 0, participation: 0}));

    (['w1', 'w2', 'w3'] as const).forEach(w => {
        const divisions = ['Rx', 'Scaled', 'Foundations'];
        const genders = ['M', 'F'];
        const config = workoutConfigs[w];

        divisions.forEach(division => {
            genders.forEach(gender => {
                // Get all athletes in this specific competitive group
                const group = processed.filter(a => a.division === division && a.gender === gender);

                // Sort this group by score for the current workout based on score type
                group.sort((a, b) => {
                    const cappedKey = `${w}_capped` as keyof Athlete;
                    const tiebreakerKey = `${w}_tiebreaker` as keyof Athlete;
                    const aCapped = a[cappedKey] as boolean | undefined;
                    const bCapped = b[cappedKey] as boolean | undefined;

                    if (config?.scoreType === 'time') {
                        // Lower time = better
                        const scoreA = getScore(a[w]);
                        const scoreB = getScore(b[w]);
                        // Athletes with no score go to bottom
                        if (scoreA === 0 && scoreB > 0) return 1;
                        if (scoreB === 0 && scoreA > 0) return -1;
                        if (scoreA === 0 && scoreB === 0) return 0;
                        return scoreA - scoreB;
                    } else if (config?.scoreType === 'time_cap_reps') {
                        // Finishers always beat non-finishers
                        // Finisher = not capped (aCapped is false or undefined)
                        // Non-finisher = capped (aCapped is true)
                        const aFinished = !aCapped && getScore(a[w]) > 0;
                        const bFinished = !bCapped && getScore(b[w]) > 0;
                        const aHasScore = getScore(a[w]) > 0;
                        const bHasScore = getScore(b[w]) > 0;

                        // No score athletes go to the bottom
                        if (!aHasScore && bHasScore) return 1;
                        if (aHasScore && !bHasScore) return -1;
                        if (!aHasScore && !bHasScore) return 0;

                        // Finishers beat non-finishers
                        if (aFinished && !bFinished) return -1;
                        if (!aFinished && bFinished) return 1;

                        // Among finishers: lower time = better
                        if (aFinished && bFinished) {
                            return getScore(a[w]) - getScore(b[w]);
                        }

                        // Among non-finishers (capped): higher reps = better
                        return getScore(b[w]) - getScore(a[w]);
                    } else {
                        // reps, weight: higher = better
                        const primaryDiff = getScore(b[w]) - getScore(a[w]);
                        // If primary scores are equal and workout has tiebreaker, use it
                        if (primaryDiff === 0 && config?.hasTiebreaker) {
                            const aTB = (a[tiebreakerKey] as number) || Infinity;
                            const bTB = (b[tiebreakerKey] as number) || Infinity;
                            return aTB - bTB; // Lower tiebreaker time = better
                        }
                        return primaryDiff;
                    }
                });

                // Assign ranks within this isolated group
                for (let i = 0; i < group.length; i++) {
                    const currentAthlete = group[i];
                    const previousAthlete = group[i - 1];

                    // Check if scores are equal (considering capped status for time_cap_reps)
                    let scoresEqual = false;
                    if (i > 0) {
                        const cappedKey = `${w}_capped` as keyof Athlete;
                        const tiebreakerKey = `${w}_tiebreaker` as keyof Athlete;

                        if (config?.scoreType === 'time_cap_reps') {
                            const currCapped = currentAthlete[cappedKey] as boolean | undefined;
                            const prevCapped = previousAthlete[cappedKey] as boolean | undefined;
                            scoresEqual = getScore(currentAthlete[w]) === getScore(previousAthlete[w]) &&
                                          currCapped === prevCapped;
                        } else if (config?.hasTiebreaker) {
                            const currTB = (currentAthlete[tiebreakerKey] as number) || 0;
                            const prevTB = (previousAthlete[tiebreakerKey] as number) || 0;
                            scoresEqual = getScore(currentAthlete[w]) === getScore(previousAthlete[w]) &&
                                          currTB === prevTB;
                        } else {
                            scoresEqual = getScore(currentAthlete[w]) === getScore(previousAthlete[w]);
                        }
                    }

                    if (i > 0 && scoresEqual) {
                        currentAthlete[`${w}_rank`] = previousAthlete[`${w}_rank`];
                    } else {
                        currentAthlete[`${w}_rank`] = i + 1;
                    }
                }
            });
        });
    });

    // 2. Calculate total points and participation for everyone based on their true ranks
    processed.forEach(a => {
        a.totalPoints = (a.w1 ? a.w1_rank || 0 : 0) +
                        (a.w2 ? a.w2_rank || 0 : 0) +
                        (a.w3 ? a.w3_rank || 0 : 0);
        a.participation = (a.w1 ? 1 : 0) + (a.w2 ? 1 : 0) + (a.w3 ? 1 : 0);
    });

    // 3. Now, apply the user's filters to the fully processed list
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

    // 4. Sort the final, filtered list for display
    filtered.sort((a, b) => {
        if (b.participation !== a.participation) return b.participation - a.participation;
        return a.totalPoints - b.totalPoints;
    });

    return filtered;
};
