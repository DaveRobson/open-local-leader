import { type Athlete, type AthleteWithRank, type DivisionFilter, type GenderFilter, type AgeGroupFilter } from '../types';

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

export const calculateRankings = (
    athletes: Athlete[],
    searchTerm: string,
    filterDivision: DivisionFilter,
    filterGender: GenderFilter,
    filterAgeGroup: AgeGroupFilter
): AthleteWithRank[] => {
    // Helper to safely parse scores
    const getScore = (val: number | string | undefined) => val ? parseFloat(String(val)) : 0;

    // 1. Pre-calculate ranks for each workout in isolation based on division and gender
    const processed: AthleteWithRank[] = athletes.map(a => ({...a, totalPoints: 0, participation: 0}));

    (['w1', 'w2', 'w3'] as const).forEach(w => {
        const divisions = ['Rx', 'Scaled', 'Foundations'];
        const genders = ['M', 'F'];

        divisions.forEach(division => {
            genders.forEach(gender => {
                // Get all athletes in this specific competitive group
                const group = processed.filter(a => a.division === division && a.gender === gender);

                // Sort this group by score for the current workout
                group.sort((a, b) => getScore(b[w]) - getScore(a[w]));

                // Assign ranks within this isolated group
                for (let i = 0; i < group.length; i++) {
                    const currentAthlete = group[i];
                    const previousAthlete = group[i - 1];

                    if (i > 0 && getScore(currentAthlete[w]) === getScore(previousAthlete[w])) {
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
