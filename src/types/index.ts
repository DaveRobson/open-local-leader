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
    division: 'Rx' | 'Scaled' | 'Foundations';
    age: string | number;
    gender: 'M' | 'F';
}

export interface NewAthleteForm {
    name: string;
    division: 'Rx' | 'Scaled' | 'Foundations';
    gender: 'M' | 'F';
    age: string | number;
}

export type ViewState = 'landing' | 'app';
export type DivisionFilter = 'all' | 'Rx' | 'Scaled' | 'Foundations';
export type GenderFilter = 'all' | 'M' | 'F';
export type AgeGroupFilter = string; // e.g., 'all', '18-34', etc.
export type ActiveTab = 'leaderboard' | 'w1' | 'w2' | 'w3';
