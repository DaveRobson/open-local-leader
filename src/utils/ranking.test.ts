import { describe, it, expect } from 'vitest';
import { calculateRankings } from './ranking';
import { type Athlete, type WorkoutConfigs } from '../types';

// Helper to create a mock athlete
const createAthlete = (overrides: Partial<Athlete> = {}): Athlete => ({
    id: `athlete-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Athlete',
    division: 'Rx',
    gender: 'M',
    age: 25,
    gymId: 'gym-1',
    w1: 0,
    w2: 0,
    w3: 0,
    w1_verified: false,
    w2_verified: false,
    w3_verified: false,
    role: 'member',
    createdAt: null as never,
    createdBy: 'test',
    ...overrides,
});

// Default workout configs for testing
const repsConfig: WorkoutConfigs = {
    w1: { id: 'w1', name: '26.1', scoreType: 'reps', unit: 'reps', published: true },
    w2: { id: 'w2', name: '26.2', scoreType: 'reps', unit: 'reps', published: true },
    w3: { id: 'w3', name: '26.3', scoreType: 'reps', unit: 'reps', published: true },
};

const timeConfig: WorkoutConfigs = {
    w1: { id: 'w1', name: '26.1', scoreType: 'time', unit: 'time', published: true },
    w2: { id: 'w2', name: '26.2', scoreType: 'time', unit: 'time', published: true },
    w3: { id: 'w3', name: '26.3', scoreType: 'time', unit: 'time', published: true },
};

const timeCapRepsConfig: WorkoutConfigs = {
    w1: { id: 'w1', name: '26.1', scoreType: 'time_cap_reps', timeCap: 900, unit: 'reps', published: true },
    w2: { id: 'w2', name: '26.2', scoreType: 'time_cap_reps', timeCap: 900, unit: 'reps', published: true },
    w3: { id: 'w3', name: '26.3', scoreType: 'time_cap_reps', timeCap: 900, unit: 'reps', published: true },
};

const repsWithTiebreakerConfig: WorkoutConfigs = {
    w1: { id: 'w1', name: '26.1', scoreType: 'reps', unit: 'reps', hasTiebreaker: true, published: true },
    w2: { id: 'w2', name: '26.2', scoreType: 'reps', unit: 'reps', hasTiebreaker: true, published: true },
    w3: { id: 'w3', name: '26.3', scoreType: 'reps', unit: 'reps', hasTiebreaker: true, published: true },
};

describe('calculateRankings', () => {
    describe('Unpublished workouts', () => {
        it('should not award any points if workouts are not published', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Athlete A', w1: 100 }),
                createAthlete({ name: 'Athlete B', w1: 200 }),
            ];

            const unpublishedConfig: WorkoutConfigs = {
                w1: { id: 'w1', name: '26.1', scoreType: 'reps', unit: 'reps', published: false },
                w2: { id: 'w2', name: '26.2', scoreType: 'reps', unit: 'reps', published: false },
                w3: { id: 'w3', name: '26.3', scoreType: 'reps', unit: 'reps', published: false },
            };

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', unpublishedConfig);

            expect(result[0].totalPoints).toBe(0);
            expect(result[1].totalPoints).toBe(0);
        });
    });
    describe('AMRAP (reps) scoring - higher is better', () => {
        it('should rank athletes with higher reps first', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Low', w1: 100 }),
                createAthlete({ name: 'High', w1: 200 }),
                createAthlete({ name: 'Mid', w1: 150 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsConfig);

            // All athletes have same participation (1 workout), so sorted by totalPoints (lower is better)
            // High (200 reps) = rank 1, Mid (150) = rank 2, Low (100) = rank 3
            expect(result[0].name).toBe('High');
            expect(result[0].w1_rank).toBe(1);
            expect(result[1].name).toBe('Mid');
            expect(result[1].w1_rank).toBe(2);
            expect(result[2].name).toBe('Low');
            expect(result[2].w1_rank).toBe(3);
        });

        it('should give same rank to athletes with identical scores', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'A', w1: 150 }),
                createAthlete({ name: 'B', w1: 150 }),
                createAthlete({ name: 'C', w1: 100 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsConfig);

            const athleteA = result.find(a => a.name === 'A');
            const athleteB = result.find(a => a.name === 'B');
            const athleteC = result.find(a => a.name === 'C');

            expect(athleteA?.w1_rank).toBe(1);
            expect(athleteB?.w1_rank).toBe(1);
            expect(athleteC?.w1_rank).toBe(3);
        });
    });

    describe('Time scoring - lower is better', () => {
        it('should rank athletes with lower time first', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Slow', w1: 600 }), // 10:00
                createAthlete({ name: 'Fast', w1: 300 }), // 5:00
                createAthlete({ name: 'Mid', w1: 450 }),  // 7:30
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', timeConfig);

            expect(result[0].name).toBe('Fast');
            expect(result[0].w1_rank).toBe(1);
            expect(result[1].name).toBe('Mid');
            expect(result[1].w1_rank).toBe(2);
            expect(result[2].name).toBe('Slow');
            expect(result[2].w1_rank).toBe(3);
        });
    });

    describe('Time cap + reps scoring', () => {
        it('should rank finishers above non-finishers', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Capped', w1: 200, w1_capped: true }),   // 200 reps (capped)
                createAthlete({ name: 'Finished', w1: 500 }),                   // 8:20 finish time
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', timeCapRepsConfig);

            const finisher = result.find(a => a.name === 'Finished');
            const capped = result.find(a => a.name === 'Capped');

            expect(finisher?.w1_rank).toBe(1);
            expect(capped?.w1_rank).toBe(2);
        });

        it('should rank finishers by time (lower is better)', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Slow', w1: 600 }),  // 10:00
                createAthlete({ name: 'Fast', w1: 400 }),  // 6:40
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', timeCapRepsConfig);

            const fast = result.find(a => a.name === 'Fast');
            const slow = result.find(a => a.name === 'Slow');

            expect(fast?.w1_rank).toBe(1);
            expect(slow?.w1_rank).toBe(2);
        });

        it('should rank capped athletes by reps (higher is better)', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'LowReps', w1: 150, w1_capped: true }),
                createAthlete({ name: 'HighReps', w1: 250, w1_capped: true }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', timeCapRepsConfig);

            const highReps = result.find(a => a.name === 'HighReps');
            const lowReps = result.find(a => a.name === 'LowReps');

            expect(highReps?.w1_rank).toBe(1);
            expect(lowReps?.w1_rank).toBe(2);
        });

        it('should use tiebreaker for capped athletes with same reps', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'SlowTB', w1: 200, w1_capped: true, w1_tiebreaker: 500 }),
                createAthlete({ name: 'FastTB', w1: 200, w1_capped: true, w1_tiebreaker: 300 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', timeCapRepsConfig);

            const fastTB = result.find(a => a.name === 'FastTB');
            const slowTB = result.find(a => a.name === 'SlowTB');

            // FastTB has lower tiebreaker time, so should rank higher
            expect(fastTB?.w1_rank).toBe(1);
            expect(slowTB?.w1_rank).toBe(2);
        });
    });

    describe('Division offset ranking', () => {
        it('should rank all Scaled athletes below all Rx athletes by total points', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Rx-Low', division: 'Rx', w1: 100 }),
                createAthlete({ name: 'Scaled-High', division: 'Scaled', w1: 300 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsConfig);

            const rxLow = result.find(a => a.name === 'Rx-Low');
            const scaledHigh = result.find(a => a.name === 'Scaled-High');

            // w1_rank should be within their own division
            expect(rxLow?.w1_rank).toBe(1); // Only one Rx athlete
            expect(scaledHigh?.w1_rank).toBe(1); // Only one Scaled athlete

            // Overall ranking by total points should reflect division offset
            expect(result[0].name).toBe('Rx-Low');
            expect(result[1].name).toBe('Scaled-High');

            // Verify total points reflect the offset (Scaled-High should have higher points than Rx athletes)
            expect(rxLow?.totalPoints).toBeLessThan(scaledHigh?.totalPoints || 0);
        });

        it('should rank Foundations below Scaled which is below Rx by total points', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Rx', division: 'Rx', w1: 100 }),
                createAthlete({ name: 'Scaled', division: 'Scaled', w1: 100 }),
                createAthlete({ name: 'Foundations', division: 'Foundations', w1: 100 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsConfig);

            const rx = result.find(a => a.name === 'Rx');
            const scaled = result.find(a => a.name === 'Scaled');
            const foundations = result.find(a => a.name === 'Foundations');

            // w1_rank should be 1 for all as they are 1st in their respective divisions
            expect(rx?.w1_rank).toBe(1);
            expect(scaled?.w1_rank).toBe(1);
            expect(foundations?.w1_rank).toBe(1);

            // Overall ranking by total points should reflect division offset
            expect(result[0].name).toBe('Rx');
            expect(result[1].name).toBe('Scaled');
            expect(result[2].name).toBe('Foundations');

            // Verify total points reflect the offset
            expect(rx?.totalPoints).toBeLessThan(scaled?.totalPoints || 0);
            expect(scaled?.totalPoints).toBeLessThan(foundations?.totalPoints || 0);
        });

        it('should handle multiple athletes in each division correctly by total points', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Rx-1', division: 'Rx', w1: 200 }),
                createAthlete({ name: 'Rx-2', division: 'Rx', w1: 100 }),
                createAthlete({ name: 'Scaled-1', division: 'Scaled', w1: 300 }),
                createAthlete({ name: 'Scaled-2', division: 'Scaled', w1: 250 }),
                createAthlete({ name: 'Found-1', division: 'Foundations', w1: 400 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsConfig);

            const rx1 = result.find(a => a.name === 'Rx-1');
            const rx2 = result.find(a => a.name === 'Rx-2');
            const scaled1 = result.find(a => a.name === 'Scaled-1');
            const scaled2 = result.find(a => a.name === 'Scaled-2');
            const found1 = result.find(a => a.name === 'Found-1');

            // w1_rank within their own division
            expect(rx1?.w1_rank).toBe(1);
            expect(rx2?.w1_rank).toBe(2);
            expect(scaled1?.w1_rank).toBe(1);
            expect(scaled2?.w1_rank).toBe(2);
            expect(found1?.w1_rank).toBe(1);

            // Overall ranking by total points should reflect division offset
            expect(result[0].name).toBe('Rx-1');
            expect(result[1].name).toBe('Rx-2');
            expect(result[2].name).toBe('Scaled-1');
            expect(result[3].name).toBe('Scaled-2');
            expect(result[4].name).toBe('Found-1');

            // Verify total points reflect the offset
            expect(rx2?.totalPoints).toBeLessThan(scaled1?.totalPoints || 0);
            expect(scaled2?.totalPoints).toBeLessThan(found1?.totalPoints || 0);
        });
    });

    describe('Tiebreaker logic', () => {
        it('should use tiebreaker for reps scoring when scores are equal', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'SlowTB', w1: 150, w1_tiebreaker: 500 }),
                createAthlete({ name: 'FastTB', w1: 150, w1_tiebreaker: 300 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsWithTiebreakerConfig);

            const fastTB = result.find(a => a.name === 'FastTB');
            const slowTB = result.find(a => a.name === 'SlowTB');

            expect(fastTB?.w1_rank).toBe(1);
            expect(slowTB?.w1_rank).toBe(2);
        });

        it('should give same rank if both score and tiebreaker are equal', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'A', w1: 150, w1_tiebreaker: 300 }),
                createAthlete({ name: 'B', w1: 150, w1_tiebreaker: 300 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsWithTiebreakerConfig);

            const a = result.find(a => a.name === 'A');
            const b = result.find(a => a.name === 'B');

            expect(a?.w1_rank).toBe(1);
            expect(b?.w1_rank).toBe(1);
        });
    });

    describe('Missing score penalty', () => {
        it('should assign penalty of Total_Participants_in_Division + 1 for missing scores', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Complete', w1: 150, w2: 200, w3: 100 }),
                createAthlete({ name: 'Missing', w1: 150, w2: 0, w3: 100 }), // Missing w2
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsConfig);

            const complete = result.find(a => a.name === 'Complete');
            const missing = result.find(a => a.name === 'Missing');

            // Total participants in Rx division = 2, so penalty = 3
            // Complete: w1_rank=1, w2_rank=1, w3_rank=1, total=3
            // Missing: w1_rank=1 (tied), w2_rank=penalty(3), w3_rank=1 (tied), total=5
            expect(complete?.totalPoints).toBe(3);
            expect(missing?.totalPoints).toBe(5);
        });

        it('should rank athletes with no score at the bottom of that workout', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'HasScore', w1: 50 }),
                createAthlete({ name: 'NoScore', w1: 0 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsConfig);

            const hasScore = result.find(a => a.name === 'HasScore');
            const noScore = result.find(a => a.name === 'NoScore');

            expect(hasScore?.w1_rank).toBe(1);
            // NoScore has no rank assigned but gets penalty in total points
            expect(noScore?.totalPoints).toBeGreaterThan(hasScore?.totalPoints || 0);
        });
    });

    describe('Total points calculation', () => {
        it('should sum workout ranks correctly', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'A', w1: 200, w2: 100, w3: 150 }),
                createAthlete({ name: 'B', w1: 150, w2: 200, w3: 100 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsConfig);

            // A: w1=1st (200>150), w2=2nd (100<200), w3=1st (150>100) = 1+2+1 = 4
            // B: w1=2nd, w2=1st, w3=2nd = 2+1+2 = 5
            const a = result.find(a => a.name === 'A');
            const b = result.find(a => a.name === 'B');

            expect(a?.w1_rank).toBe(1);
            expect(a?.w2_rank).toBe(2);
            expect(a?.w3_rank).toBe(1);
            expect(a?.totalPoints).toBe(4);

            expect(b?.w1_rank).toBe(2);
            expect(b?.w2_rank).toBe(1);
            expect(b?.w3_rank).toBe(2);
            expect(b?.totalPoints).toBe(5);
        });

        it('should rank by participation first, then total points', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'TwoWorkouts', w1: 100, w2: 100, w3: 0 }),
                createAthlete({ name: 'ThreeWorkouts', w1: 50, w2: 50, w3: 50 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsConfig);

            // ThreeWorkouts has participation=3, TwoWorkouts has participation=2
            // ThreeWorkouts should be ranked first despite lower scores
            expect(result[0].name).toBe('ThreeWorkouts');
            expect(result[0].participation).toBe(3);
            expect(result[1].name).toBe('TwoWorkouts');
            expect(result[1].participation).toBe(2);
        });
    });

    describe('Gender ranking (combined within division)', () => {
        it('should rank men and women together within the same division', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Male-Low', gender: 'M', w1: 100 }),
                createAthlete({ name: 'Male-High', gender: 'M', w1: 200 }),
                createAthlete({ name: 'Female-Low', gender: 'F', w1: 150 }),
                createAthlete({ name: 'Female-High', gender: 'F', w1: 250 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', repsConfig);

            const maleHigh = result.find(a => a.name === 'Male-High');
            const maleLow = result.find(a => a.name === 'Male-Low');
            const femaleHigh = result.find(a => a.name === 'Female-High');
            const femaleLow = result.find(a => a.name === 'Female-Low');

            // Combined ranking for Rx division (250 > 200 > 150 > 100)
            expect(femaleHigh?.w1_rank).toBe(1);
            expect(maleHigh?.w1_rank).toBe(2);
            expect(femaleLow?.w1_rank).toBe(3);
            expect(maleLow?.w1_rank).toBe(4);

            // Verify overall order by total points
            expect(result[0].name).toBe('Female-High');
            expect(result[1].name).toBe('Male-High');
            expect(result[2].name).toBe('Female-Low');
            expect(result[3].name).toBe('Male-Low');
        });
    });

    describe('Filtering', () => {
        it('should filter by division', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Rx', division: 'Rx', w1: 100 }),
                createAthlete({ name: 'Scaled', division: 'Scaled', w1: 200 }),
            ];

            const result = calculateRankings(athletes, '', 'Rx', 'all', 'all', repsConfig);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Rx');
        });

        it('should filter by gender', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Male', gender: 'M', w1: 100 }),
                createAthlete({ name: 'Female', gender: 'F', w1: 200 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'F', 'all', repsConfig);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Female');
        });

        it('should filter by age group', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Young', age: 20, w1: 100 }),
                createAthlete({ name: 'Old', age: 40, w1: 200 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', '18-34', repsConfig);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Young');
        });

        it('should filter by search term (name)', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'John Smith', w1: 100 }),
                createAthlete({ name: 'Jane Doe', w1: 200 }),
            ];

            const result = calculateRankings(athletes, 'john', 'all', 'all', 'all', repsConfig);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe('John Smith');
        });
    });

    describe('Age group boundaries', () => {
        it('should correctly categorize 14-17 age group', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Teen13', age: 13, w1: 100 }),
                createAthlete({ name: 'Teen14', age: 14, w1: 100 }),
                createAthlete({ name: 'Teen17', age: 17, w1: 100 }),
                createAthlete({ name: 'Adult18', age: 18, w1: 100 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', '14-17', repsConfig);

            expect(result.length).toBe(2);
            expect(result.map(a => a.name).sort()).toEqual(['Teen14', 'Teen17']);
        });

        it('should correctly categorize 55+ age group', () => {
            const athletes: Athlete[] = [
                createAthlete({ name: 'Age54', age: 54, w1: 100 }),
                createAthlete({ name: 'Age55', age: 55, w1: 100 }),
                createAthlete({ name: 'Age70', age: 70, w1: 100 }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', '55+', repsConfig);

            expect(result.length).toBe(2);
            expect(result.map(a => a.name).sort()).toEqual(['Age55', 'Age70']);
        });
    });

    describe('Complex scenario - CrossFit Open style', () => {
        it('should correctly rank a realistic CrossFit Open scenario', () => {
            // Scenario: 3 workouts with different scoring types
            const mixedConfig: WorkoutConfigs = {
                w1: { id: 'w1', name: '26.1', scoreType: 'time_cap_reps', timeCap: 900, published: true },
                w2: { id: 'w2', name: '26.2', scoreType: 'reps', hasTiebreaker: true, published: true },
                w3: { id: 'w3', name: '26.3', scoreType: 'time', published: true },
            };

            const athletes: Athlete[] = [
                // Male Rx athletes
                createAthlete({
                    name: 'Mike',
                    gender: 'M',
                    division: 'Rx',
                    w1: 480, w1_capped: false,      // Finished 8:00
                    w2: 150, w2_tiebreaker: 300,   // 150 reps, 5:00 tiebreaker
                    w3: 600,                        // 10:00 time
                }),
                createAthlete({
                    name: 'John',
                    gender: 'M',
                    division: 'Rx',
                    w1: 520, w1_capped: false,      // Finished 8:40
                    w2: 150, w2_tiebreaker: 360,   // 150 reps, 6:00 tiebreaker
                    w3: 540,                        // 9:00 time
                }),
                createAthlete({
                    name: 'Dave',
                    gender: 'M',
                    division: 'Rx',
                    w1: 245, w1_capped: true,       // Capped at 245 reps
                    w2: 180,                        // 180 reps, no tiebreaker
                    w3: 720,                        // 12:00 time
                }),
            ];

            const result = calculateRankings(athletes, '', 'all', 'all', 'all', mixedConfig);

            const mike = result.find(a => a.name === 'Mike');
            const john = result.find(a => a.name === 'John');
            const dave = result.find(a => a.name === 'Dave');

            // W1 (time_cap_reps): Mike (480s) beats John (520s), both beat Dave (capped)
            expect(mike?.w1_rank).toBe(1);
            expect(john?.w1_rank).toBe(2);
            expect(dave?.w1_rank).toBe(3);

            // W2 (reps): Dave (180) beats Mike & John (150 each)
            // Mike beats John on tiebreaker (300s < 360s)
            expect(dave?.w2_rank).toBe(1);
            expect(mike?.w2_rank).toBe(2);
            expect(john?.w2_rank).toBe(3);

            // W3 (time): John (540s) beats Mike (600s) beats Dave (720s)
            expect(john?.w3_rank).toBe(1);
            expect(mike?.w3_rank).toBe(2);
            expect(dave?.w3_rank).toBe(3);

            // Total points: Mike = 1+2+2 = 5, John = 2+3+1 = 6, Dave = 3+1+3 = 7
            expect(mike?.totalPoints).toBe(5);
            expect(john?.totalPoints).toBe(6);
            expect(dave?.totalPoints).toBe(7);

            // Final ranking by total points (lower is better)
            expect(result[0].name).toBe('Mike');
            expect(result[1].name).toBe('John');
            expect(result[2].name).toBe('Dave');
        });
    });
});
