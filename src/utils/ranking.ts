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
    w1: { id: 'w1', name: '26.1', scoreType: 'reps', unit: 'reps' },
    w2: { id: 'w2', name: '26.2', scoreType: 'reps', unit: 'reps' },
    w3: { id: 'w3', name: '26.3', scoreType: 'reps', unit: 'reps' },
};

// Helper to safely parse scores
const getScore = (val: number | string | undefined) => val ? parseFloat(String(val)) : 0;

/**
 * Sort athletes by performance for a given workout based on score type.
 * Per SCORING.md:
 * - AMRAP (reps): SORT BY total_reps DESC, tiebreak_time ASC
 * - For Time (time_cap_reps): Finishers by time ASC, then non-finishers by reps DESC, tiebreak_time ASC
 * - Max Lift (weight): SORT BY load_weight DESC, tiebreak_time ASC
 * - Time: SORT BY time ASC
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
            // Pure time workout: lower time = better
            const timeDiff = scoreA - scoreB;
            if (timeDiff === 0) {
                return aTB - bTB; // Tiebreaker if times are equal
            }
            return timeDiff;
        } else if (config.scoreType === 'time_cap_reps') {
            // For Time with cap: Finishers beat non-finishers
            const aFinished = !aCapped;
            const bFinished = !bCapped;

            if (aFinished && !bFinished) return -1;
            if (!aFinished && bFinished) return 1;

            if (aFinished && bFinished) {
                // Among finishers: lower time = better
                return scoreA - scoreB;
            }

            // Among non-finishers (capped): higher reps = better, then tiebreaker
            const repsDiff = scoreB - scoreA;
            if (repsDiff === 0) {
                return aTB - bTB; // Lower tiebreaker = better
            }
            return repsDiff;
        } else {
            // reps, weight: higher = better, then tiebreaker
            const primaryDiff = scoreB - scoreA;
            if (primaryDiff === 0) {
                return aTB - bTB; // Lower tiebreaker time = better
            }
            return primaryDiff;
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

    // For time_cap_reps, also check capped status
    if (config.scoreType === 'time_cap_reps') {
        const aCapped = a[cappedKey] as boolean | undefined;
        const bCapped = b[cappedKey] as boolean | undefined;
        if (aCapped !== bCapped) return false;
    }

    // Check tiebreaker
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

    // 2. Calculate ranks for each workout with division offset
    // Per SCORING.md: Scaled ranks start after ALL Rx, Foundations after ALL Scaled
    (['w1', 'w2', 'w3'] as const).forEach(w => {
        const config = workoutConfigs[w];
        const genders: ('M' | 'F')[] = ['M', 'F'];

        genders.forEach(gender => {
            // Get athletes by division for this gender
            const rxAthletes = processed.filter(a => a.division === 'Rx' && a.gender === gender);
            const scaledAthletes = processed.filter(a => a.division === 'Scaled' && a.gender === gender);
            const foundationsAthletes = processed.filter(a => a.division === 'Foundations' && a.gender === gender);

            // Sort each division group by performance
            sortByPerformance(rxAthletes, w, config);
            sortByPerformance(scaledAthletes, w, config);
            sortByPerformance(foundationsAthletes, w, config);

            // Assign ranks with division offset
            // Rx athletes: ranks 1 to N
            let currentRank = 1;
            for (let i = 0; i < rxAthletes.length; i++) {
                const athlete = rxAthletes[i];
                const prevAthlete = rxAthletes[i - 1];

                if (i > 0 && scoresAreEqual(athlete, prevAthlete, w, config)) {
                    athlete[`${w}_rank`] = prevAthlete[`${w}_rank`];
                } else {
                    athlete[`${w}_rank`] = currentRank;
                }
                currentRank++;
            }

            // Scaled athletes: ranks start after all Rx athletes
            const scaledStartRank = rxAthletes.length + 1;
            currentRank = scaledStartRank;
            for (let i = 0; i < scaledAthletes.length; i++) {
                const athlete = scaledAthletes[i];
                const prevAthlete = scaledAthletes[i - 1];

                if (i > 0 && scoresAreEqual(athlete, prevAthlete, w, config)) {
                    athlete[`${w}_rank`] = prevAthlete[`${w}_rank`];
                } else {
                    athlete[`${w}_rank`] = currentRank;
                }
                currentRank++;
            }

            // Foundations athletes: ranks start after all Scaled athletes
            const foundationsStartRank = rxAthletes.length + scaledAthletes.length + 1;
            currentRank = foundationsStartRank;
            for (let i = 0; i < foundationsAthletes.length; i++) {
                const athlete = foundationsAthletes[i];
                const prevAthlete = foundationsAthletes[i - 1];

                if (i > 0 && scoresAreEqual(athlete, prevAthlete, w, config)) {
                    athlete[`${w}_rank`] = prevAthlete[`${w}_rank`];
                } else {
                    athlete[`${w}_rank`] = currentRank;
                }
                currentRank++;
            }
        });
    });

    // 3. Calculate total points with missing score penalty
    // Per SCORING.md: Missing score = Total_Participants + 1
    processed.forEach(a => {
        // Count total participants in same gender for penalty calculation
        const sameGenderCount = processed.filter(p => p.gender === a.gender).length;
        const missedPenalty = sameGenderCount + 1;

        // If athlete has a score, use their rank; otherwise apply penalty
        const w1Points = a.w1 ? (a.w1_rank || missedPenalty) : missedPenalty;
        const w2Points = a.w2 ? (a.w2_rank || missedPenalty) : missedPenalty;
        const w3Points = a.w3 ? (a.w3_rank || missedPenalty) : missedPenalty;

        a.totalPoints = w1Points + w2Points + w3Points;
        a.participation = (a.w1 ? 1 : 0) + (a.w2 ? 1 : 0) + (a.w3 ? 1 : 0);
    });

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
    // Per SCORING.md: Lowest total score wins
    filtered.sort((a, b) => {
        // First by participation (more workouts completed = ranked higher)
        if (b.participation !== a.participation) return b.participation - a.participation;
        // Then by total points (lower is better)
        return a.totalPoints - b.totalPoints;
    });

    return filtered;
};
