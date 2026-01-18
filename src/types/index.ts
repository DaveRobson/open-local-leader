export type ScoreType = 'reps' | 'time' | 'weight' | 'time_cap_reps';
export type WorkoutId = 'w1' | 'w2' | 'w3';

export interface WorkoutConfig {
    id: WorkoutId;
    name: string;           // "26.1", "26.2", "26.3"
    description?: string;   // Workout description/movements
    scoreType: ScoreType;
    timeCap?: number;       // seconds, only for time_cap_reps
    unit?: string;          // 'reps', 'lbs', 'kg' for display
    hasTiebreaker?: boolean;
    tiebreakerLabel?: string; // e.g., "Time after round 2"
    published?: boolean;    // Whether workout is visible to athletes
}

export interface WorkoutConfigs {
    w1: WorkoutConfig;
    w2: WorkoutConfig;
    w3: WorkoutConfig;
}

export interface Athlete {
    id: string;
    name: string;
    division: 'Rx' | 'Scaled' | 'Foundations';
    gender: 'M' | 'F';
    age: number;
    gymId: string;
    w1: number;
    w2: number;
    w3: number;
    w1_verified: boolean;
    w2_verified: boolean;
    w3_verified: boolean;
    // Time cap fields - true means athlete didn't finish, score is reps
    w1_capped?: boolean;
    w2_capped?: boolean;
    w3_capped?: boolean;
    // Tiebreaker times (stored as seconds)
    w1_tiebreaker?: number;
    w2_tiebreaker?: number;
    w3_tiebreaker?: number;
    role: 'admin' | 'member';
    superAdmin?: boolean;
    createdAt: never; // serverTimestamp
    createdBy: string;
    lastEditedBy?: string;
}

export interface AthleteWithRank extends Athlete {
    w1_rank?: number;
    w2_rank?: number;
    w3_rank?: number;
    totalPoints: number;
    participation: number;
}

export interface ScoreForm {
    w1: string | number;
    w2: string | number;
    w3: string | number;
    w1_verified: boolean;
    w2_verified: boolean;
    w3_verified: boolean;
    w1_capped?: boolean;
    w2_capped?: boolean;
    w3_capped?: boolean;
    w1_tiebreaker?: string | number;
    w2_tiebreaker?: string | number;
    w3_tiebreaker?: string | number;
    division: 'Rx' | 'Scaled' | 'Foundations';
    age: string | number;
    gender: 'M' | 'F';
}

export interface NewAthleteForm {
    name: string;
    division: 'Rx' | 'Scaled' | 'Foundations';
    gender: 'M' | 'F';
    age: string | number;
    gymId: string;
}

export type ViewState = 'landing' | 'app';
export type DivisionFilter = 'all' | 'Rx' | 'Scaled' | 'Foundations';
export type GenderFilter = 'all' | 'M' | 'F';
export type AgeGroupFilter = string; // e.g., 'all', '18-34', etc.
export type ActiveTab = 'leaderboard' | 'w1' | 'w2' | 'w3' | 'admin' | 'superAdmin';
