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
    let processed: AthleteWithRank[] = athletes.map(a => ({ ...a, totalPoints: 0, participation: 0 }));

    // 1. Apply Filters
    if (filterDivision !== 'all') {
        processed = processed.filter(a => a.division === filterDivision);
    }
    if (filterGender !== 'all') {
        processed = processed.filter(a => a.gender === filterGender);
    }
    if (filterAgeGroup !== 'all') {
        processed = processed.filter(a => isInAgeGroup(a.age, filterAgeGroup));
    }
    if (searchTerm) {
        processed = processed.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // 2. Calculate Ranks relative to FILTERED list
    const getScore = (val: number | string | undefined) => val ? parseFloat(String(val)) : 0;

    (['w1', 'w2', 'w3'] as const).forEach(w => {
        processed.sort((a, b) => getScore(b[w]) - getScore(a[w]));

        for (let i = 0; i < processed.length; i++) {
            if (i > 0 && getScore(processed[i][w]) === getScore(processed[i-1][w])) {
                processed[i][`${w}_rank`] = processed[i-1][`${w}_rank`];
            } else {
                processed[i][`${w}_rank`] = i + 1;
            }
        }
    });

    // 3. Total Points & Final Sort
    processed.forEach(a => {
        a.totalPoints = (a.w1_rank || 0) + (a.w2_rank || 0) + (a.w3_rank || 0);
        a.participation = (a.w1 ? 1 : 0) + (a.w2 ? 1 : 0) + (a.w3 ? 1 : 0);
    });

    processed.sort((a, b) => {
        if (b.participation !== a.participation) return b.participation - a.participation;
        return a.totalPoints - b.totalPoints;
    });

    return processed;
};
