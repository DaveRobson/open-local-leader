import React, {type ChangeEvent, type FC, type FormEvent, type ReactNode, useEffect, useMemo, useState} from 'react';
import {type FirebaseApp, initializeApp} from 'firebase/app';
import {
    type Auth,
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInAnonymously,
    signInWithPopup,
    signOut,
    type User
} from 'firebase/auth';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    type DocumentData,
    Firestore,
    getFirestore,
    limit,
    onSnapshot,
    query,
    Query,
    QuerySnapshot,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {ChevronRight, Filter, Globe, LogOut, MapPin, Plus, Search, Trash2, Trophy, X} from 'lucide-react';

const __firebase_config = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

// --- Firebase Config & Init ---
const app: FirebaseApp = initializeApp(__firebase_config);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// --- Types & Interfaces ---
interface Athlete {
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

interface AthleteWithRank extends Athlete {
    w1_rank?: number;
    w2_rank?: number;
    w3_rank?: number;
    totalPoints: number;
    participation: number;
}

interface ScoreForm {
    w1: string | number;
    w2: string | number;
    w3: string | number;
    division: 'Rx' | 'Scaled' | 'Foundations';
    age: string | number;
    gender: 'M' | 'F';
}

interface NewAthleteForm {
    name: string;
    division: 'Rx' | 'Scaled' | 'Foundations';
    gender: 'M' | 'F';
    age: string | number;
}

type ViewState = 'landing' | 'app';
type DivisionFilter = 'all' | 'Rx' | 'Scaled' | 'Foundations';
type GenderFilter = 'all' | 'M' | 'F';
type AgeGroupFilter = string; // e.g., 'all', '18-34', etc.
type ActiveTab = 'leaderboard' | 'w1' | 'w2' | 'w3';

const AGE_GROUPS = [
    { label: 'All Ages', value: 'all' },
    { label: 'Teens (14-17)', value: '14-17' },
    { label: 'Open (18-34)', value: '18-34' },
    { label: 'Masters (35-39)', value: '35-39' },
    { label: 'Masters (40-44)', value: '40-44' },
    { label: 'Masters (45-49)', value: '45-49' },
    { label: 'Masters (50-54)', value: '50-54' },
    { label: 'Masters (55+)', value: '55+' }
];

// --- Helper Components ---

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Use React.InputHTMLAttributes to get all standard input props
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const Input: FC<InputProps> = ({ label, ...props }) => (
    <div className="mb-4">
        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
            {label}
        </label>
        <input
            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder-zinc-600"
            {...props}
        />
    </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: { label: string; value: string }[];
}

const Select: FC<SelectProps> = ({ label, options, ...props }) => (
    <div className="mb-4">
        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
            {label}
        </label>
        <select
            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none"
            {...props}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

// --- Main Application Component ---

export default function App() {
    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState<boolean>(true);

    // View Context
    const [viewState, setViewState] = useState<ViewState>('landing');

    // Data State
    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(false);

    // User's "Home" Gym
    const [myGymId, setMyGymId] = useState<string>(localStorage.getItem('cf_gym_id') || '');

    // --- FILTERS ---
    const [filterGym, setFilterGym] = useState<string>(''); // Empty = All Gyms
    const [filterGender, setFilterGender] = useState<GenderFilter>('all');
    const [filterAgeGroup, setFilterAgeGroup] = useState<AgeGroupFilter>('all');
    const [filterDivision, setFilterDivision] = useState<DivisionFilter>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [activeTab, setActiveTab] = useState<ActiveTab>('leaderboard');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState<boolean>(false);
    const [editingAthlete, setEditingAthlete] = useState<AthleteWithRank | null>(null);

    // Forms
    const [newAthlete, setNewAthlete] = useState<NewAthleteForm>({
        name: '', division: 'Rx', gender: 'M', age: ''
    });
    const [scoreForm, setScoreForm] = useState<ScoreForm>({
        w1: '', w2: '', w3: '', division: 'Rx', age: '', gender: 'M'
    });

    // --- Authentication ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setAuthLoading(false);

            if (u && myGymId) {
                setFilterGym(myGymId);
                setViewState('app');
            }
        });

        return () => unsubscribe();
    }, []); // myGymId removed to prevent re-running on auth

    // --- Data Subscription ---
    useEffect(() => {
        if (viewState !== 'app') return;

        setLoadingData(true);

        let q: Query<DocumentData>;
        const collectionRef = collection(db, 'cf_leaderboard_athletes');

        if (filterGym) {
            q = query(collectionRef, where('gymId', '==', filterGym));
        } else {
            q = query(collectionRef, limit(500));
        }

        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    age: docData.age || 0,
                    w1: docData.w1 || 0,
                    w2: docData.w2 || 0,
                    w3: docData.w3 || 0,
                    division: docData.division || 'Scaled',
                    gender: docData.gender || 'M',
                } as Athlete;
            });
            setAthletes(data);
            setLoadingData(false);
        });

        return () => unsubscribe();
    }, [viewState, filterGym]);

    // --- Logic: Age Group Check ---
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

    // --- Ranking Logic (Dynamic) ---
    const rankedAthletes = useMemo((): AthleteWithRank[] => {
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
    }, [athletes, searchTerm, filterDivision, filterGender, filterAgeGroup]);


    // --- Actions ---

    const handleLogin = async (provider: 'google' | 'anon') => {
        try {
            if (provider === 'google') {
                await signInWithPopup(auth, new GoogleAuthProvider());
            } else {
                await signInAnonymously(auth);
            }
        } catch (e) { console.error(e); }
    };

    const enterApp = (gymIdToSet: string) => {
        if (gymIdToSet) {
            setMyGymId(gymIdToSet);
            setFilterGym(gymIdToSet);
            localStorage.setItem('cf_gym_id', gymIdToSet);
        } else {
            setFilterGym('');
        }
        setViewState('app');
    };

    const handleAddAthlete = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!newAthlete.name.trim() || !user) return;

        let targetGymId = myGymId;
        if (!targetGymId) {
            const id = prompt("Please enter a Gym ID to associate this athlete with:");
            if(!id) return;
            targetGymId = id.toUpperCase();
            setMyGymId(targetGymId);
            localStorage.setItem('cf_gym_id', targetGymId);
            setFilterGym(targetGymId);
        }

        try {
            await addDoc(collection(db, 'cf_leaderboard_athletes'), {
                name: newAthlete.name,
                division: newAthlete.division,
                gender: newAthlete.gender,
                age: parseInt(String(newAthlete.age), 10) || 18,
                gymId: targetGymId,
                w1: 0, w2: 0, w3: 0,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
            });
            setNewAthlete({ name: '', division: 'Rx', gender: 'M', age: '' });
            setIsAddModalOpen(false);
        } catch (error) {
            console.error("Error adding athlete", error);
        }
    };

    const handleUpdateScore = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingAthlete || !user) return;

        try {
            const ref = doc(db, 'cf_leaderboard_athletes', editingAthlete.id);
            await updateDoc(ref, {
                w1: scoreForm.w1 ? parseFloat(String(scoreForm.w1)) : 0,
                w2: scoreForm.w2 ? parseFloat(String(scoreForm.w2)) : 0,
                w3: scoreForm.w3 ? parseFloat(String(scoreForm.w3)) : 0,
                division: scoreForm.division,
                gender: scoreForm.gender,
                age: parseInt(String(scoreForm.age), 10),
                lastEditedBy: user.uid
            });
            setIsScoreModalOpen(false);
            setEditingAthlete(null);
        } catch (error) {
            console.error("Error updating score", error);
        }
    };

    const handleDeleteAthlete = async (id: string) => {
        if(!confirm("Delete this athlete? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'cf_leaderboard_athletes', id));
            setIsScoreModalOpen(false);
        } catch(err) {
            console.error(err);
        }
    }

    const openScoreModal = (athlete: AthleteWithRank) => {
        setEditingAthlete(athlete);
        setScoreForm({
            w1: athlete.w1 || '',
            w2: athlete.w2 || '',
            w3: athlete.w3 || '',
            division: athlete.division,
            gender: athlete.gender || 'M',
            age: athlete.age || '',
        });
        setIsScoreModalOpen(true);
    };

    // --- Views ---

    if (authLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    // LANDING PAGE
    if (!user || viewState === 'landing') {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="bg-emerald-500/10 p-4 rounded-full ring-1 ring-emerald-500/20">
                            <Trophy className="w-16 h-16 text-emerald-500" />
                        </div>
                    </div>

                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic text-white mb-2">
                            Open Leaderboard
                        </h1>
                        <p className="text-zinc-400">
                            Track scores, filter by age/gender, and compete globally or locally.
                        </p>
                    </div>

                    {!user ? (
                        <div className="space-y-3 mt-8">
                            <button
                                onClick={() => handleLogin('google')}
                                className="w-full bg-white text-zinc-900 font-bold py-3 px-4 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                Sign in with Google
                            </button>
                            <button
                                onClick={() => handleLogin('anon')}
                                className="w-full bg-zinc-800 text-zinc-300 font-bold py-3 px-4 rounded-xl hover:bg-zinc-700 transition-colors"
                            >
                                Continue as Guest
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); enterApp((e.currentTarget.elements.namedItem('gymId') as HTMLInputElement).value.toUpperCase()); }} className="space-y-2">
                                <input
                                    name="gymId"
                                    defaultValue={myGymId}
                                    placeholder="ENTER GYM ID"
                                    className="w-full bg-zinc-900 border border-zinc-800 text-center text-white text-lg rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase tracking-widest placeholder-zinc-700"
                                    autoComplete="off"
                                />
                                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl uppercase tracking-wider shadow-lg shadow-emerald-900/20">
                                    Enter Gym
                                </button>
                            </form>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800"></span></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-950 px-2 text-zinc-500">or</span></div>
                            </div>

                            <button
                                onClick={() => enterApp('')}
                                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                <Globe size={18} />
                                Browse Global Leaderboard
                            </button>

                            <button onClick={() => { signOut(auth); setViewState('landing'); }} className="text-zinc-600 text-xs hover:text-zinc-400 py-2">
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // APP DASHBOARD
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">

            {/* Navbar */}
            <nav className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
                <div className="max-w-6xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                                {filterGym ? <MapPin className="w-5 h-5 text-emerald-500" /> : <Globe className="w-5 h-5 text-blue-500" />}
                            </div>
                            <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-tighter text-white leading-none">
                  {filterGym || 'Global Arena'}
                </span>
                                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                  {filterGym ? 'Private Leaderboard' : 'All Gyms'}
                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setViewState('landing')}
                            className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-900/50 rounded-lg hover:bg-zinc-800"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[140px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Filter by Gym ID..."
                                value={filterGym}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFilterGym(e.target.value.toUpperCase())}
                                className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                            />
                            {filterGym && (
                                <button
                                    onClick={() => setFilterGym('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <select
                            className="bg-zinc-900 border border-zinc-800 text-xs rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-emerald-500"
                            value={filterDivision}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterDivision(e.target.value as DivisionFilter)}
                        >
                            <option value="all">All Divisions</option>
                            <option value="Rx">Rx</option>
                            <option value="Scaled">Scaled</option>
                            <option value="Foundations">Foundations</option>
                        </select>

                        <select
                            className="bg-zinc-900 border border-zinc-800 text-xs rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-emerald-500"
                            value={filterGender}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterGender(e.target.value as GenderFilter)}
                        >
                            <option value="all">All Genders</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                        </select>

                        <select
                            className="bg-zinc-900 border border-zinc-800 text-xs rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-emerald-500"
                            value={filterAgeGroup}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterAgeGroup(e.target.value as AgeGroupFilter)}
                        >
                            {AGE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-6xl mx-auto px-4 flex overflow-x-auto no-scrollbar gap-6 border-b border-zinc-800/50 pt-2">
                    {[
                        { id: 'leaderboard', label: 'Overall' },
                        { id: 'w1', label: '25.1' },
                        { id: 'w2', label: '25.2' },
                        { id: 'w3', label: '25.3' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ActiveTab)}
                            className={`
                py-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors
                ${activeTab === tab.id
                                ? 'border-emerald-500 text-white'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'}
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-6 pb-24">

                <div className="flex justify-between items-end mb-4">
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
                        Showing {rankedAthletes.length} Athletes
                        {filterGym ? ` in ${filterGym}` : ' Globally'}
                    </p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        <Plus size={14} />
                        Add Athlete
                    </button>
                </div>

                {loadingData ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                ) : rankedAthletes.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                        <Filter className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white">No Athletes Match Filters</h3>
                        <p className="text-zinc-500 text-sm mt-1">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {rankedAthletes.map((athlete, index) => (
                            <div
                                key={athlete.id}
                                onClick={() => openScoreModal(athlete)}
                                className="group bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/60 hover:border-emerald-500/30 rounded-xl p-4 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-colors" />

                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center justify-center w-10 sm:w-12 shrink-0">
                    <span className="text-2xl font-black text-zinc-500 group-hover:text-emerald-500 italic transition-colors">
                      #{index + 1}
                    </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                            <h3 className="text-lg font-bold text-white truncate leading-tight">{athlete.name}</h3>
                                            <div className="flex gap-2 items-center flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-800 uppercase font-bold">
                          {athlete.division}
                        </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-800 uppercase font-bold">
                          {athlete.gender}
                        </span>
                                                {athlete.age && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-800 uppercase font-bold">
                            Age {athlete.age}
                          </span>
                                                )}
                                                {!filterGym && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-800 text-emerald-500/70 bg-zinc-900/50 uppercase font-bold">
                            {athlete.gymId}
                          </span>
                                                )}
                                            </div>
                                        </div>

                                        {activeTab === 'leaderboard' ? (
                                            <div className="flex gap-4 mt-3 overflow-x-auto no-scrollbar text-xs">
                                                <div className="flex flex-col">
                                                    <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider">Points</span>
                                                    <span className="font-bold text-white text-sm">{athlete.totalPoints}</span>
                                                </div>
                                                <div className="w-px bg-zinc-800" />
                                                <div className="flex flex-col">
                                                    <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider">25.1</span>
                                                    <span className={`${!athlete.w1 ? 'text-zinc-700' : 'text-emerald-400 font-medium'}`}>
                            {athlete.w1 ? `${athlete.w1} (${athlete.w1_rank})` : '--'}
                          </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider">25.2</span>
                                                    <span className={`${!athlete.w2 ? 'text-zinc-700' : 'text-emerald-400 font-medium'}`}>
                            {athlete.w2 ? `${athlete.w2} (${athlete.w2_rank})` : '--'}
                          </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider">25.3</span>
                                                    <span className={`${!athlete.w3 ? 'text-zinc-700' : 'text-emerald-400 font-medium'}`}>
                            {athlete.w3 ? `${athlete.w3} (${athlete.w3_rank})` : '--'}
                          </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-2 flex items-baseline gap-3">
                        <span className="text-2xl font-black text-emerald-400">
                           {athlete[activeTab as keyof Athlete] || '--'}
                        </span>
                                                <span className="text-xs text-zinc-500 font-medium uppercase">
                          {athlete[activeTab as keyof Athlete] ? `Reps (Rank ${athlete[`${activeTab}_rank` as keyof AthleteWithRank]})` : 'No Score Logged'}
                        </span>
                                            </div>
                                        )}
                                    </div>

                                    <ChevronRight className="text-zinc-700 group-hover:text-emerald-500 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Athlete Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Register Athlete"
            >
                <form onSubmit={handleAddAthlete}>
                    <Input
                        label="Full Name"
                        placeholder="e.g. Jane Doe"
                        value={newAthlete.name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAthlete({...newAthlete, name: e.target.value})}
                        autoFocus
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Division"
                            options={[
                                { label: 'Rx', value: 'Rx' },
                                { label: 'Scaled', value: 'Scaled' },
                                { label: 'Foundations', value: 'Foundations' }
                            ]}
                            value={newAthlete.division}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewAthlete({...newAthlete, division: e.target.value as 'Rx' | 'Scaled' | 'Foundations'})}
                        />
                        <Select
                            label="Gender"
                            options={[
                                { label: 'Male', value: 'M' },
                                { label: 'Female', value: 'F' },
                            ]}
                            value={newAthlete.gender}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewAthlete({...newAthlete, gender: e.target.value as 'M' | 'F'})}
                        />
                    </div>
                    <Input
                        label="Age"
                        type="number"
                        placeholder="e.g. 28"
                        value={newAthlete.age}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAthlete({...newAthlete, age: e.target.value})}
                    />
                    <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-2 transition-colors uppercase tracking-wide"
                    >
                        Add to Roster
                    </button>
                    <p className="text-[10px] text-zinc-500 text-center mt-3">
                        Adding to gym: <span className="text-white font-bold">{myGymId || filterGym || 'Not Set (prompt)'}</span>
                    </p>
                </form>
            </Modal>

            {/* Log Score Modal */}
            {editingAthlete && (
                <Modal
                    isOpen={isScoreModalOpen}
                    onClose={() => setIsScoreModalOpen(false)}
                    title={`Edit: ${editingAthlete.name}`}
                >
                    <form onSubmit={handleUpdateScore}>
                        <div className="grid grid-cols-1 gap-3 mb-6">
                            <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-2">25.1 Score</h4>
                                <input
                                    type="number" step="any" placeholder="0"
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none"
                                    value={scoreForm.w1}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setScoreForm({...scoreForm, w1: e.target.value})}
                                />
                            </div>
                            <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-2">25.2 Score</h4>
                                <input
                                    type="number" step="any" placeholder="0"
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none"
                                    value={scoreForm.w2}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setScoreForm({...scoreForm, w2: e.target.value})}
                                />
                            </div>
                            <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-2">25.3 Score</h4>
                                <input
                                    type="number" step="any" placeholder="0"
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none"
                                    value={scoreForm.w3}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setScoreForm({...scoreForm, w3: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <Select
                                label="Div"
                                options={[ { label: 'Rx', value: 'Rx' }, { label: 'Sc', value: 'Scaled' }, { label: 'Found', value: 'Foundations' } ]}
                                value={scoreForm.division}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setScoreForm({...scoreForm, division: e.target.value as 'Rx' | 'Scaled' | 'Foundations'})}
                            />
                            <Select
                                label="Sex"
                                options={[ { label: 'M', value: 'M' }, { label: 'F', value: 'F' } ]}
                                value={scoreForm.gender}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setScoreForm({...scoreForm, gender: e.target.value as 'M' | 'F'})}
                            />
                            <Input
                                label="Age"
                                type="number"
                                value={scoreForm.age}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setScoreForm({...scoreForm, age: e.target.value})}
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => handleDeleteAthlete(editingAthlete.id)}
                                className="flex-none bg-red-900/20 hover:bg-red-900/40 text-red-500 p-3 rounded-lg transition-colors border border-red-900/30"
                            >
                                <Trash2 size={20} />
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors uppercase tracking-wide"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

        </div>
    );
}
