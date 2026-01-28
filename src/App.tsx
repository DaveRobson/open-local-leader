import {type ChangeEvent, type FormEvent, useEffect, useMemo, useState} from 'react';
import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
} from 'firebase/auth';
import {deleteDoc, doc, serverTimestamp, setDoc, updateDoc} from 'firebase/firestore';
import {ChevronRight, Filter, Globe, LogOut, MapPin, Plus, Search, ShieldCheck, Trash2, Trophy, X} from 'lucide-react';

import {auth, db} from './config/firebase';
import {
    type ActiveTab,
    type AgeGroupFilter,
    type Athlete,
    type AthleteWithRank,
    type DivisionFilter,
    type GenderFilter,
    type NewAthleteForm,
    type ScoreForm,
    type ViewState,
    type WorkoutId,
} from './types';
import {AGE_GROUPS} from './constants/ageGroups';
import Modal from './components/Modal';
import Input from './components/Input';
import Select from './components/Select';
import TimeInput from './components/TimeInput';
import SuperAdminPanel from './components/SuperAdminPanel';
import { CharitiesDisplay } from './components/CharitiesDisplay';
import { CharityManagement } from './components/CharityManagement';
import {useAuth} from './hooks/useAuth';
import {calculateRankings} from './utils/ranking';
import {useUserProfile} from "./hooks/useUserProfile.ts";
import {useApp} from "./hooks/useApp.ts";
import {useWorkoutConfig} from "./hooks/useWorkoutConfig.ts";
import {formatSecondsToTime} from "./utils/timeFormat.ts";
import {getAuthErrorMessage, isUserCancelledError} from "./utils/authErrors.ts";
import {logError} from "./utils/logger.ts";

export default function App() {
    const {user, authLoading} = useAuth();
    const [viewState, setViewState] = useState<ViewState>('landing');
    const [myGymId, setMyGymId] = useState<string>('');
    const [filterGym, setFilterGym] = useState<string>('');
    const {athletes, isAdmin, isSuperAdmin, gyms, loading} = useApp(viewState, filterGym, myGymId);
    const {profileExists, loadingProfile, userProfile} = useUserProfile(user);
    const {workoutConfigs, loading: workoutConfigLoading, updateAllWorkoutConfigs} = useWorkoutConfig();

    const [filterGender, setFilterGender] = useState<GenderFilter>('all');
    const [filterAgeGroup, setFilterAgeGroup] = useState<AgeGroupFilter>('all');
    const [filterDivision, setFilterDivision] = useState<DivisionFilter>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [activeTab, setActiveTab] = useState<ActiveTab>('leaderboard');

    // Temporary filter states for the modal
    const [tempSearchTerm, setTempSearchTerm] = useState<string>('');
    const [tempFilterDivision, setTempFilterDivision] = useState<DivisionFilter>('all');
    const [tempFilterGender, setTempFilterGender] = useState<GenderFilter>('all');
    const [tempFilterAgeGroup, setTempFilterAgeGroup] = useState<AgeGroupFilter>('all');
    const [tempFilterGym, setTempFilterGym] = useState<string>('');

    // Gym profile form states
    const [gymProfileForm, setGymProfileForm] = useState({
        name: '',
        location: '',
        logoUrl: '',
        websiteUrl: ''
    });

    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState<boolean>(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
    const [isCreateGymModalOpen, setIsCreateGymModalOpen] = useState<boolean>(false);
    const [isSelectGymModalOpen, setIsSelectGymModalOpen] = useState<boolean>(false);
    const [isFilterPopoutOpen, setIsFilterPopoutOpen] = useState<boolean>(false);
    const [selectedGymId, setSelectedGymId] = useState<string>('');
    const [editingAthlete, setEditingAthlete] = useState<AthleteWithRank | null>(null);

    const [newAthlete, setNewAthlete] = useState<NewAthleteForm>({
        name: '', division: 'Rx', gender: 'M', age: '', gymId: ''
    });
    const [newGymName, setNewGymName] = useState<string>('');
    const [scoreForm, setScoreForm] = useState<ScoreForm>({
        w1: '', w2: '', w3: '', w1_verified: false, w2_verified: false, w3_verified: false, division: 'Rx', age: '', gender: 'M'
    });

    // State for email/password auth
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const gymIdFromUrl = urlParams.get('gymId');

        const openGymFromUrl = () => {
            if (gymIdFromUrl) {
                setFilterGym(gymIdFromUrl);
                setViewState('app');
                // myGymId will be set from userProfile in the enterApp useEffect
            }
        }
        openGymFromUrl();
    }, []);


    const enterApp = (gymIdToSet: string) => {
        // filterGym controls which gym's data is displayed
        if (gymIdToSet) {
            setFilterGym(gymIdToSet);
            window.history.pushState({}, '', `?gymId=${gymIdToSet}`);
        } else {
            setFilterGym(''); // Global view
            window.history.pushState({}, '', '/');
        }
        setViewState('app');
        // myGymId is set separately via useEffect based on userProfile
    };

    // Always sync myGymId with user's profile gym
    useEffect(() => {
        if (userProfile?.gymId && !loadingProfile) {
            setMyGymId(userProfile.gymId);
        }
    }, [userProfile, loadingProfile]);

    useEffect(() => {
        if (user && !loadingProfile && viewState === 'landing') {
            if (userProfile?.gymId) {
                enterApp(userProfile.gymId);
            } else {
                enterApp('');
            }
        }
    }, [user, loadingProfile, userProfile, viewState]);

    useEffect(() => {
        const openProfile = () => {
            if (user && !profileExists && !loadingProfile && viewState === 'app') {
                setIsProfileModalOpen(true);
            } else {
                setIsProfileModalOpen(false);
            }
        }

        openProfile();
    }, [user, profileExists, loadingProfile, viewState]);

    // Sync temp filter states when modal opens
    useEffect(() => {
        if (isFilterPopoutOpen) {
            setTempSearchTerm(searchTerm);
            setTempFilterDivision(filterDivision);
            setTempFilterGender(filterGender);
            setTempFilterAgeGroup(filterAgeGroup);
            setTempFilterGym(filterGym); // Sync gym filter
        }
    }, [isFilterPopoutOpen, searchTerm, filterDivision, filterGender, filterAgeGroup, filterGym]);

    // Initialize gym profile form when gym data loads
    useEffect(() => {
        if (myGymId && gyms.length > 0) {
            const gym = gyms.find(g => g.id === myGymId);
            if (gym) {
                setGymProfileForm({
                    name: gym.name || '',
                    location: gym.location || '',
                    logoUrl: gym.logoUrl || '',
                    websiteUrl: gym.websiteUrl || ''
                });
            }
        }
    }, [myGymId, gyms]);

    const rankedAthletes = useMemo(() => {
        return calculateRankings(athletes, searchTerm, filterDivision, filterGender, filterAgeGroup, workoutConfigs);
    }, [athletes, searchTerm, filterDivision, filterGender, filterAgeGroup, workoutConfigs]);

    const displayedAthletes = useMemo(() => {
        if (activeTab === 'leaderboard' || activeTab === 'admin' || activeTab === 'superAdmin') {
            return rankedAthletes;
        }

        // For workout-specific tabs, sort by: has score, then division, then score within division
        const workoutKey = activeTab as WorkoutId;
        const config = workoutConfigs[workoutKey];
        const divisionOrder = { 'Rx': 0, 'Scaled': 1, 'Foundations': 2 };

        return [...rankedAthletes].sort((a, b) => {
            const scoreA = a[workoutKey] || 0;
            const scoreB = b[workoutKey] || 0;

            // Athletes with no score always go to the bottom (regardless of division)
            if (scoreA === 0 && scoreB > 0) return 1;
            if (scoreB === 0 && scoreA > 0) return -1;
            if (scoreA === 0 && scoreB === 0) {
                // Both have no score - sort by division
                return divisionOrder[a.division] - divisionOrder[b.division];
            }

            // Both have scores - sort by division first
            const divisionDiff = divisionOrder[a.division] - divisionOrder[b.division];
            if (divisionDiff !== 0) return divisionDiff;

            // Within same division, sort by score type
            if (config?.scoreType === 'time') {
                return scoreA - scoreB; // Lower time is better
            } else if (config?.scoreType === 'time_cap_reps') {
                const cappedKey = `${workoutKey}_capped` as keyof Athlete;
                const aCapped = a[cappedKey] as boolean | undefined;
                const bCapped = b[cappedKey] as boolean | undefined;
                const aFinished = !aCapped;
                const bFinished = !bCapped;

                if (aFinished && !bFinished) return -1;
                if (!aFinished && bFinished) return 1;
                if (aFinished && bFinished) return scoreA - scoreB; // Lower time
                return scoreB - scoreA; // Higher reps for capped
            }

            return scoreB - scoreA; // Higher score is better (reps, weight)
        });
    }, [rankedAthletes, activeTab, workoutConfigs]);

    const userAthlete = useMemo(() => {
        return rankedAthletes.find(a => a.createdBy === user?.uid);
    }, [rankedAthletes, user]);

    const pendingVerifications = useMemo(() => {
        if (!isAdmin || !myGymId) return [];

        const unverified: { athlete: Athlete, workout: 'w1' | 'w2' | 'w3', score: number, workoutLabel: string }[] = [];

        for (const athlete of athletes) {
            if (athlete.w1 > 0 && !athlete.w1_verified) {
                unverified.push({ athlete, workout: 'w1', score: athlete.w1, workoutLabel: '26.1' });
            }
            if (athlete.w2 > 0 && !athlete.w2_verified) {
                unverified.push({ athlete, workout: 'w2', score: athlete.w2, workoutLabel: '26.2' });
            }
            if (athlete.w3 > 0 && !athlete.w3_verified) {
                unverified.push({ athlete, workout: 'w3', score: athlete.w3, workoutLabel: '26.3' });
            }
        }
        return unverified;
    }, [athletes, isAdmin, myGymId]);

    const handleVerifyScore = async (athleteId: string, workout: 'w1' | 'w2' | 'w3') => {
        if (!isAdmin) return;

        try {
            const athleteDocRef = doc(db, 'cf_leaderboard_athletes', athleteId);
            await updateDoc(athleteDocRef, {
                [`${workout}_verified`]: true,
                lastEditedBy: user?.uid
            });
        } catch (error) {
            logError("Error verifying score", error, { athleteId, workout });
        }
    };

    const handleLogin = async () => {
        setAuthError(null);
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (error) {
            if (!isUserCancelledError(error)) {
                setAuthError(getAuthErrorMessage(error));
                logError("Google sign-in failed", error);
            }
        }
    };

    const handleEmailAuth = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAuthError(null);
        try {
            if (authMode === 'signup') {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error: unknown) {
            setAuthError(getAuthErrorMessage(error));
            logError(`Email ${authMode} failed`, error, { email });
        }
    };

    const handleSetAthletesGym = async (userId: string, gymId: string) => {
        const athleteDocRef = doc(db, 'cf_leaderboard_athletes', userId);
        try {
            await updateDoc(athleteDocRef, {
                gymId: gymId
            });
            setIsSelectGymModalOpen(false);
            enterApp('');
        } catch (error) {
            logError("Error setting athlete's gym", error, { userId, gymId });
        }
    };

    const handleCreateGym = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!newGymName.trim() || !user) return;

        const newGymId = newGymName.toUpperCase().replace(/\s/g, '-');
        const gymDocRef = doc(db, 'gyms', newGymId);

        try {
            await setDoc(gymDocRef, {
                name: newGymName,
                admins: [user.uid]
            });
            await handleSetAthletesGym(user.uid, newGymId);
            setNewGymName('');
            setIsCreateGymModalOpen(false);
            enterApp(newGymId);
        } catch (error) {
            logError("Error creating gym", error, { gymName: newGymName, gymId: newGymId });
        }
    };

    const handleAddAthlete = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!newAthlete.name.trim() || !user) return;

        try {
            const athleteDocRef = doc(db, 'cf_leaderboard_athletes', user.uid);
            await setDoc(athleteDocRef, {
                name: newAthlete.name,
                division: newAthlete.division,
                gender: newAthlete.gender,
                age: parseInt(String(newAthlete.age), 10) || 18,
                gymId: myGymId,
                w1: 0, w2: 0, w3: 0,
                w1_verified: false, w2_verified: false, w3_verified: false,
                role: 'member',
                createdAt: serverTimestamp(),
                createdBy: user.uid,
            });
            setNewAthlete({name: '', division: 'Rx', gender: 'M', age: '', gymId: ''});
            setIsAddModalOpen(false);
            setIsProfileModalOpen(false);
            setIsSelectGymModalOpen(true);
        } catch (error) {
            logError("Error adding athlete", error, { athleteName: newAthlete.name });
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
                w1_verified: scoreForm.w1_verified,
                w2_verified: scoreForm.w2_verified,
                w3_verified: scoreForm.w3_verified,
                w1_capped: scoreForm.w1_capped || false,
                w2_capped: scoreForm.w2_capped || false,
                w3_capped: scoreForm.w3_capped || false,
                w1_tiebreaker: scoreForm.w1_tiebreaker ? parseFloat(String(scoreForm.w1_tiebreaker)) : 0,
                w2_tiebreaker: scoreForm.w2_tiebreaker ? parseFloat(String(scoreForm.w2_tiebreaker)) : 0,
                w3_tiebreaker: scoreForm.w3_tiebreaker ? parseFloat(String(scoreForm.w3_tiebreaker)) : 0,
                division: scoreForm.division,
                gender: scoreForm.gender,
                age: parseInt(String(scoreForm.age), 10),
                lastEditedBy: user.uid
            });
            setIsScoreModalOpen(false);
            setEditingAthlete(null);
        } catch (error) {
            logError("Error updating score", error, { athleteId: editingAthlete.id });
        }
    };

    const handleDeleteAthlete = async (id: string) => {
        if (!confirm("Delete this athlete? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'cf_leaderboard_athletes', id));
            setIsScoreModalOpen(false);
        } catch (error) {
            logError("Error deleting athlete", error, { athleteId: id });
        }
    }

    const handleCloseProfileModal = () => {
        setIsProfileModalOpen(false);
        // If the user closes the modal and still doesn't have a profile,
        // sign them out to prevent them from using the app without a profile.
        if (user && !profileExists) {
            signOut(auth);
        }
    };

    const openScoreModal = (athlete: AthleteWithRank) => {
        setEditingAthlete(athlete);
        setScoreForm({
            w1: athlete.w1 || '',
            w2: athlete.w2 || '',
            w3: athlete.w3 || '',
            w1_verified: athlete.w1_verified || false,
            w2_verified: athlete.w2_verified || false,
            w3_verified: athlete.w3_verified || false,
            w1_capped: athlete.w1_capped || false,
            w2_capped: athlete.w2_capped || false,
            w3_capped: athlete.w3_capped || false,
            w1_tiebreaker: athlete.w1_tiebreaker || '',
            w2_tiebreaker: athlete.w2_tiebreaker || '',
            w3_tiebreaker: athlete.w3_tiebreaker || '',
            division: athlete.division,
            gender: athlete.gender || 'M',
            age: athlete.age || '',
        });
        setIsScoreModalOpen(true);
    };

    // Helper to format score display based on workout type
    const formatScoreDisplay = (athlete: AthleteWithRank, workoutKey: WorkoutId): string => {
        const score = athlete[workoutKey];
        if (!score) return '--';

        const config = workoutConfigs[workoutKey];
        const cappedKey = `${workoutKey}_capped` as keyof Athlete;
        const tiebreakerKey = `${workoutKey}_tiebreaker` as keyof Athlete;
        const capped = athlete[cappedKey] as boolean | undefined;
        const tiebreaker = athlete[tiebreakerKey] as number | undefined;

        if (config.scoreType === 'time') {
            return formatSecondsToTime(score);
        } else if (config.scoreType === 'time_cap_reps') {
            if (capped) {
                return `CAP+${score}`;
            }
            return formatSecondsToTime(score);
        } else {
            // reps or weight
            let display = String(score);
            if (tiebreaker && config.hasTiebreaker) {
                display += ` (TB: ${formatSecondsToTime(tiebreaker)})`;
            }
            return display;
        }
    };

    const handleGymFilterChange = (gymId: string) => {
        if (gymId) {
            window.history.pushState({}, '', `?gymId=${gymId}`);
        } else {
            window.history.pushState({}, '', '/');
        }
        setFilterGym(gymId);
    };

    const handleTabChange = (tabId: ActiveTab) => {
        // Auto-navigate to user's gym when clicking admin tab
        if (tabId === 'admin' && myGymId && filterGym !== myGymId) {
            handleGymFilterChange(myGymId);
        }
        // Auto-navigate to super admin's allocated gym when clicking super admin tab
        if (tabId === 'superAdmin' && myGymId && filterGym !== myGymId) {
            handleGymFilterChange(myGymId);
        }
        setActiveTab(tabId);
    };

    // Removed toggleMyGymGlobal function as the button is being removed


    if (authLoading || loading || loadingProfile || workoutConfigLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
            </div>
        );
    }

    if (!user || viewState === 'landing') {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="bg-gold-500/10 p-4 rounded-full ring-1 ring-gold-500/20">
                            <Trophy className="w-16 h-16 text-gold-500"/>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white mb-2">
                            Open Leaderboard: Berkshire Boxes
                        </h1>
                        <p className="text-zinc-400">
                            Join our local leaderboard to track your Open performances alongside gym friends across Berkshire!
                        </p>
                    </div>

                    {!user ? (
                        <div className="space-y-3 mt-8">
                            <button
                                onClick={() => handleLogin()}
                                className="w-full bg-white text-zinc-900 font-bold py-3 px-4 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"/>
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"/>
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"/>
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"/>
                                </svg>
                                Sign in with Google
                            </button>                            
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><span
                                    className="w-full border-t border-zinc-800"></span></div>
                                <div className="relative flex justify-center text-xs uppercase"><span
                                    className="bg-zinc-950 px-2 text-zinc-500">or</span></div>
                            </div>

                            <form onSubmit={handleEmailAuth} className="space-y-3">
                                <Input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <div>
                                    <Input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    {authMode === 'signup' && (
                                        <p className="text-zinc-500 text-[10px] mt-1 text-left">
                                            Password must be at least 6 characters
                                        </p>
                                    )}
                                </div>
                                {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}
                                <button type="submit" className="w-full bg-gold-600 hover:bg-gold-500 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                                </button>
                            </form>

                            <p className="text-xs text-zinc-500">
                                {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                                <button 
                                    onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(null); }}
                                    className="font-bold text-gold-500 hover:text-gold-400 ml-1"
                                >
                                    {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                                </button>
                            </p>

                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <Select
                                label="Select a Gym"
                                options={[{label: 'Select a gym...', value: ''}, ...gyms.map(gym => ({label: gym.name, value: gym.id}))]}
                                value={selectedGymId}
                                onChange={(e) => setSelectedGymId(e.target.value)}
                            />
                            <button
                                onClick={() => enterApp(selectedGymId)}
                                disabled={!selectedGymId}
                                className="w-full bg-gold-600 hover:bg-gold-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18}/>
                                Enter Gym
                            </button>
                            
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><span
                                    className="w-full border-t border-zinc-800"></span></div>
                                <div className="relative flex justify-center text-xs uppercase"><span
                                    className="bg-zinc-950 px-2 text-zinc-500">or</span></div>
                            </div>

                            <button
                                onClick={() => setIsCreateGymModalOpen(true)}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                <Plus size={18}/>
                                Create a New Gym
                            </button>

                            <button onClick={() => enterApp('')}
                                    className="text-zinc-500 text-xs hover:text-gold-400 py-2 transition-colors"
                            >
                                or view the Global Leaderboard
                            </button>

                            <button onClick={() => {
                                signOut(auth);
                                setViewState('landing');
                            }} className="text-zinc-600 text-xs hover:text-zinc-400 py-2">
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>


            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-gold-500/30">

            <nav className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
                {/* Gym Profile Section - always show, either specific gym or Global Leaderboard */}
                <div className="bg-zinc-950 border-b border-zinc-800">
                    <div className="max-w-6xl mx-auto px-4 py-3">
                        <div className="flex items-center gap-3">
                            {/* Gym Logo/Icon - smaller */}
                            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                                {filterGym && gyms.find(g => g.id === filterGym)?.logoUrl ? (
                                    <img
                                        src={gyms.find(g => g.id === filterGym)?.logoUrl}
                                        alt="Gym Logo"
                                        className="w-10 h-10 object-cover rounded"
                                    />
                                ) : filterGym ? (
                                    <MapPin className="w-10 h-10 text-gold-500"/>
                                ) : (
                                    <Globe className="w-10 h-10 text-blue-500"/>
                                )}
                            </div>

                            {/* Gym Info */}
                            <div className="flex-1">
                                <h2 className="text-lg font-black uppercase tracking-tighter text-white leading-none">
                                    {filterGym ? gyms.find(g => g.id === filterGym)?.name : 'Global Leaderboard'}
                                </h2>
                                {filterGym && gyms.find(g => g.id === filterGym)?.location && (
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {gyms.find(g => g.id === filterGym)?.location}
                                    </p>
                                )}
                                <p className="text-xs text-zinc-400 mt-1">
                                    {displayedAthletes.length} Athletes
                                    {filterGym && gyms.find(g => g.id === filterGym)?.charities?.length
                                        ? ` • ${gyms.find(g => g.id === filterGym)?.charities?.length} Partner Charities`
                                        : ''
                                    }
                                </p>
                            </div>

                            {/* Quick Admin Access (if admin) and Log Score/Sign Out */}
                            <div className="flex items-center gap-2">
                                {isAdmin && filterGym && (
                                    <button
                                        onClick={() => handleTabChange('admin')}
                                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        Manage Gym
                                    </button>
                                )}
                                <button
                                    onClick={() => userAthlete ? openScoreModal(userAthlete) : setIsProfileModalOpen(true)}
                                    className="p-2 px-3 text-xs bg-gold-600 hover:bg-gold-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                                >
                                    <Plus size={14}/> Log Score
                                </button>
                                <button onClick={() => signOut(auth)}
                                        className="p-2 text-zinc-500 hover:text-red-500 transition-colors bg-zinc-900/50 rounded-lg hover:bg-zinc-800"
                                        title="Sign Out">
                                    <LogOut size={14}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Row */}
                <div className="max-w-6xl mx-auto px-4 border-b border-zinc-800/50">
                    <div className="flex gap-6 overflow-x-auto no-scrollbar">
                        {[
                            {id: 'leaderboard', label: 'Overall', published: true},
                            // Only show workout tabs if published (or if super admin)
                            ...(workoutConfigs.w1.published || isSuperAdmin ? [{id: 'w1', label: workoutConfigs.w1.name, published: workoutConfigs.w1.published}] : []),
                            ...(workoutConfigs.w2.published || isSuperAdmin ? [{id: 'w2', label: workoutConfigs.w2.name, published: workoutConfigs.w2.published}] : []),
                            ...(workoutConfigs.w3.published || isSuperAdmin ? [{id: 'w3', label: workoutConfigs.w3.name, published: workoutConfigs.w3.published}] : []),
                            ...(filterGym && gyms.find(g => g.id === filterGym)?.charities !== undefined
                                ? [{id: 'charities', label: 'Charities', published: true}]
                                : []),
                            ...(isAdmin ? [{id: 'admin', label: 'Admin', published: true}] : []),
                            ...(isSuperAdmin ? [{id: 'superAdmin', label: 'Super Admin', published: true}] : []),
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id as ActiveTab)}
                                className={`
                                    py-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors
                                    ${activeTab === tab.id
                                    ? (tab.id === 'superAdmin' ? 'border-purple-500 text-white' : 'border-gold-500 text-white')
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'}
                                    ${!tab.published && isSuperAdmin ? 'opacity-50' : ''}
                                  `}
                                title={!tab.published ? 'Not published yet' : ''}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Filter Pills Section - Only show for leaderboard and workout tabs */}
            {(activeTab === 'leaderboard' || activeTab === 'w1' || activeTab === 'w2' || activeTab === 'w3') && (
                <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/50">
                    <div className="max-w-6xl mx-auto px-4 py-2">
                        <div className="flex items-center justify-between gap-4">
                            {/* Filter Pills */}
                            <div className="flex gap-2 items-center flex-wrap flex-1">
                                {filterGym && ( // Only show gym pill if a specific gym is selected
                                    <button
                                        onClick={() => setIsFilterPopoutOpen(true)}
                                        className="px-3 py-1.5 bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-full text-xs font-medium hover:bg-gold-500/30 transition-colors flex items-center gap-1.5"
                                    >
                                        {gyms.find(g => g.id === filterGym)?.name}
                                        <X size={12} onClick={(e) => { e.stopPropagation(); handleGymFilterChange(''); }} />
                                    </button>
                                )}
                                {filterDivision !== 'all' && (
                                    <button
                                        onClick={() => setIsFilterPopoutOpen(true)}
                                        className="px-3 py-1.5 bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-full text-xs font-medium hover:bg-gold-500/30 transition-colors flex items-center gap-1.5"
                                    >
                                        {filterDivision}
                                        <X size={12} onClick={(e) => { e.stopPropagation(); setFilterDivision('all'); }} />
                                    </button>
                                )}
                                {filterGender !== 'all' && (
                                    <button
                                        onClick={() => setIsFilterPopoutOpen(true)}
                                        className="px-3 py-1.5 bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-full text-xs font-medium hover:bg-gold-500/30 transition-colors flex items-center gap-1.5"
                                    >
                                        {filterGender === 'M' ? 'Male' : 'Female'}
                                        <X size={12} onClick={(e) => { e.stopPropagation(); setFilterGender('all'); }} />
                                    </button>
                                )}
                                {filterAgeGroup !== 'all' && (
                                    <button
                                        onClick={() => setIsFilterPopoutOpen(true)}
                                        className="px-3 py-1.5 bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-full text-xs font-medium hover:bg-gold-500/30 transition-colors flex items-center gap-1.5"
                                    >
                                        {AGE_GROUPS.find(g => g.value === filterAgeGroup)?.label}
                                        <X size={12} onClick={(e) => { e.stopPropagation(); setFilterAgeGroup('all'); }} />
                                    </button>
                                )}
                                {searchTerm && (
                                    <button
                                        onClick={() => setIsFilterPopoutOpen(true)}
                                        className="px-3 py-1.5 bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-full text-xs font-medium hover:bg-gold-500/30 transition-colors flex items-center gap-1.5"
                                    >
                                        "{searchTerm}"
                                        <X size={12} onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }} />
                                    </button>
                                )}
                                {(!filterGym && filterDivision === 'all' && filterGender === 'all' && filterAgeGroup === 'all' && !searchTerm) && (
                                    <span className="text-xs text-zinc-500">No filters applied</span>
                                )}
                            </div>

                            {/* Filter Button */}
                            <div className="flex gap-2">
                                {/* Removed My Gym / Global Toggle button */}
                                <button
                                    onClick={() => setIsFilterPopoutOpen(!isFilterPopoutOpen)}
                                    className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors flex-shrink-0 flex items-center gap-2"
                                    title="Filters"
                                >
                                    <Filter size={16} className="text-zinc-400" />
                                    <span className="text-sm text-zinc-300">Filter</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-6xl mx-auto px-4 py-6">

                {activeTab !== 'charities' && activeTab !== 'admin' && activeTab !== 'superAdmin' && (
                    <div className="flex justify-between items-end mb-4">
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
                            Showing {displayedAthletes.length} Athletes
                            {filterGym ? ` in ${gyms.find(g => g.id === filterGym)?.name}` : ' Globally'}
                        </p>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
                    </div>
                ) : activeTab === 'charities' ? (
                    filterGym ? (
                        <CharitiesDisplay
                            charities={gyms.find(g => g.id === filterGym)?.charities || []}
                            gymName={gyms.find(g => g.id === filterGym)?.name || ''}
                        />
                    ) : (
                        <div className="text-center py-10 text-zinc-500">
                            Select a gym to view charities
                        </div>
                    )
                ) : activeTab === 'admin' ? (
                    <div>
                        <h2 className="text-lg font-bold text-white mb-3">Pending Verifications</h2>
                        {pendingVerifications.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {pendingVerifications.map(({ athlete, workout, score, workoutLabel }, index) => (
                                    <div key={`${athlete.id}-${workout}-${index}`}
                                         className="group bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 transition-all flex flex-col justify-between">
                                        <div>
                                            <div onClick={() => openScoreModal(athlete as AthleteWithRank)} className="cursor-pointer">
                                                <h3 className="font-bold text-white truncate leading-tight">{athlete.name}</h3>
                                                <p className="text-xs text-zinc-400">{workoutLabel} Score: <span className="font-bold text-gold-400">{score}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3">
                                            <button onClick={() => handleVerifyScore(athlete.id, workout)}
                                                    className="flex-1 text-xs bg-gold-600 hover:bg-gold-500 text-white font-bold py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors">
                                                <ShieldCheck size={14}/> Verify
                                            </button>
                                            <button onClick={() => openScoreModal(athlete as AthleteWithRank)}
                                                    className="flex-none text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-bold p-1.5 rounded-md transition-colors" title="Edit Score">
                                                <ChevronRight size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                                <ShieldCheck className="w-10 h-10 text-zinc-700 mx-auto mb-3"/>
                                <h3 className="text-md font-bold text-white">All Scores Verified</h3>
                                <p className="text-zinc-500 text-sm mt-1">Nothing to see here!</p>
                            </div>
                        )}

                        {/* Gym Profile Management Section */}
                        {myGymId && (
                            <div className="mt-8">
                                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-gold-500" />
                                    Gym Profile
                                </h2>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Logo Preview */}
                                        <div className="lg:col-span-2">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                                                    {gymProfileForm.logoUrl ? (
                                                        <img
                                                            src={gymProfileForm.logoUrl}
                                                            alt="Gym Logo"
                                                            className="w-20 h-20 object-cover rounded"
                                                        />
                                                    ) : (
                                                        <MapPin className="w-20 h-20 text-zinc-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-white mb-1">
                                                        Gym Logo
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        Your logo appears on the gym profile and leaderboard
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gym Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Gym Name *
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g., CrossFit London"
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                                                value={gymProfileForm.name}
                                                onChange={(e) => setGymProfileForm({...gymProfileForm, name: e.target.value})}
                                            />
                                        </div>

                                        {/* Location */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Location
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g., London, UK"
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                                                value={gymProfileForm.location}
                                                onChange={(e) => setGymProfileForm({...gymProfileForm, location: e.target.value})}
                                            />
                                        </div>

                                        {/* Logo URL */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Logo URL
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://example.com/logo.png"
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                                                value={gymProfileForm.logoUrl}
                                                onChange={(e) => setGymProfileForm({...gymProfileForm, logoUrl: e.target.value})}
                                            />
                                        </div>

                                        {/* Website URL */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Website URL
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://www.example.com"
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                                                value={gymProfileForm.websiteUrl}
                                                onChange={(e) => setGymProfileForm({...gymProfileForm, websiteUrl: e.target.value})}
                                            />
                                        </div>

                                        {/* Save Button */}
                                        <div className="lg:col-span-2">
                                            <button
                                                onClick={async () => {
                                                    if (!gymProfileForm.name.trim()) {
                                                        alert('Gym name is required');
                                                        return;
                                                    }
                                                    try {
                                                        await updateDoc(doc(db, 'gyms', myGymId), {
                                                            name: gymProfileForm.name.trim(),
                                                            location: gymProfileForm.location.trim(),
                                                            logoUrl: gymProfileForm.logoUrl.trim(),
                                                            websiteUrl: gymProfileForm.websiteUrl.trim(),
                                                        });
                                                        alert('Gym profile updated successfully!');
                                                    } catch (error) {
                                                        console.error('Error updating gym profile:', error);
                                                        alert('Failed to update gym profile. Please try again.');
                                                    }
                                                }}
                                                className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold py-3 rounded-lg transition-colors"
                                            >
                                                Save Gym Profile
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Charity Management Section */}
                        {myGymId && (
                            <div className="mt-8">
                                <CharityManagement
                                    gymId={myGymId}
                                    charities={gyms.find(g => g.id === myGymId)?.charities || []}
                                    currentUserId={user?.uid || ''}
                                    onUpdate={() => {/* refetch handled by real-time listener */}}
                                />
                            </div>
                        )}
                    </div>
                ) : activeTab === 'superAdmin' ? (
                    <SuperAdminPanel
                        workoutConfigs={workoutConfigs}
                        onSaveWorkoutConfig={updateAllWorkoutConfigs}
                        gyms={gyms}
                        athletes={athletes}
                    />
                ) : rankedAthletes.length === 0 ? (
                    <div
                        className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                        <Filter className="w-12 h-12 text-zinc-700 mx-auto mb-4"/>
                        <h3 className="text-lg font-bold text-white">No Athletes Match Filters</h3>
                        <p className="text-zinc-500 text-sm mt-1">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <div className="grid gap-3" key={activeTab}>
                        {displayedAthletes.map((athlete, index) => (
                            <div
                                key={athlete.id}
                                onClick={() => (isAdmin || athlete.createdBy === user?.uid) && openScoreModal(athlete)}
                                className={`group bg-zinc-900/40 ${(isAdmin || athlete.createdBy === user?.uid) ? 'hover:bg-zinc-900 cursor-pointer' : ''} border border-zinc-800/60 hover:border-gold-500/30 rounded-xl p-4 transition-all relative overflow-hidden animate-in fade-in`}
                            >
                                <div
                                    className="absolute top-0 left-0 w-1 h-full bg-gold-500/0 group-hover:bg-gold-500 transition-colors"/>

                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center justify-center w-10 sm:w-12 shrink-0">
                                        <span
                                            className={`text-2xl font-black ${activeTab === 'leaderboard' ? 'text-zinc-500 group-hover:text-gold-500' : 'text-gold-500'} italic transition-colors`}>
                                          #{index + 1}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                            <h3 className="text-lg font-bold text-white truncate leading-tight">{athlete.name}</h3>
                                            <div className="flex gap-2 items-center flex-wrap">
                                                <span
                                                    className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-800 uppercase font-bold">
                                                  {athlete.division}
                                                </span>
                                                <span
                                                    className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-800 uppercase font-bold">
                                                  {athlete.gender}
                                                </span>
                                                {athlete.age && (
                                                    <span
                                                        className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-800 uppercase font-bold">
                                                        Age {athlete.age}
                                                      </span>
                                                )}
                                                {!filterGym && (
                                                    <span
                                                        className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-800 text-gold-500/70 bg-zinc-900/50 uppercase font-bold">
                                                        {athlete.gymId}
                                                      </span>
                                                )}
                                            </div>
                                        </div>

                                        {activeTab === 'leaderboard' ? (
                                            <div className="flex gap-4 mt-3 overflow-x-auto no-scrollbar text-xs">
                                                <div className="flex flex-col">
                                                    <span
                                                        className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider">Points</span>
                                                    <span
                                                        className="font-bold text-white text-sm">{athlete.totalPoints}</span>
                                                </div>
                                                <div className="w-px bg-zinc-800"/>
                                                {(['w1', 'w2', 'w3'] as const).map(wKey => (
                                                    <div key={wKey} className="flex flex-col">
                                                        <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider">
                                                            {workoutConfigs[wKey].name}
                                                        </span>
                                                        <span className={`${!athlete[wKey] ? 'text-zinc-700' : 'text-gold-400 font-medium'}`}>
                                                            {athlete[wKey] ? `${formatScoreDisplay(athlete, wKey)} (${athlete[`${wKey}_rank` as keyof AthleteWithRank]})` : '--'}
                                                            {athlete[`${wKey}_verified` as keyof Athlete] && <ShieldCheck size={12} className="inline-block ml-1 text-blue-500"/>}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="mt-2 flex items-baseline gap-3">
                                                <span className="text-2xl font-black text-gold-400">
                                                   {formatScoreDisplay(athlete, activeTab as WorkoutId)}
                                                </span>
                                                <span className="text-xs text-zinc-500 font-medium uppercase">
                                                  {athlete[activeTab as keyof Athlete] ? `Score (${athlete[`${activeTab}_rank` as keyof AthleteWithRank]} Points)` : 'No Score Logged'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {(isAdmin || athlete.createdBy === user?.uid) && <ChevronRight className="text-zinc-700 group-hover:text-gold-500 transition-colors"/>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Modal
                isOpen={isProfileModalOpen}
                onClose={handleCloseProfileModal}
                title="Create Your Profile"
            >
                <form onSubmit={handleAddAthlete}>
                    <Input
                        label="Full Name"
                        placeholder="e.g. Jane Doe"
                        value={newAthlete.name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAthlete({
                            ...newAthlete,
                            name: e.target.value
                        })}
                        autoFocus
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Division"
                            options={[
                                {label: 'Rx', value: 'Rx'},
                                {label: 'Scaled', value: 'Scaled'},
                                {label: 'Foundations', value: 'Foundations'}
                            ]}
                            value={newAthlete.division}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewAthlete({
                                ...newAthlete,
                                division: e.target.value as 'Rx' | 'Scaled' | 'Foundations'
                            })}
                        />
                        <Select
                            label="Gender"
                            options={[
                                {label: 'Male', value: 'M'},
                                {label: 'Female', value: 'F'},
                            ]}
                            value={newAthlete.gender}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewAthlete({
                                ...newAthlete,
                                gender: e.target.value as 'M' | 'F'
                            })}
                        />
                    </div>
                    <Input
                        label="Age"
                        type="number"
                        placeholder="e.g. 28"
                        value={newAthlete.age}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAthlete({
                            ...newAthlete,
                            age: e.target.value
                        })}
                    />
                    <button
                        type="submit"
                        disabled={!newAthlete.name}
                        className="w-full bg-gold-600 hover:bg-gold-500 text-white font-bold py-3 rounded-lg mt-2 transition-colors uppercase tracking-wide disabled:bg-zinc-700 disabled:cursor-not-allowed"
                    >
                        Create Profile
                    </button>
                    <p className="text-[10px] text-zinc-500 text-center mt-3">
                        This will create your profile in the <span
                        className="text-white font-bold">{gyms.find(g => g.id === myGymId)?.name}</span> gym.
                    </p>
                </form>
            </Modal>

            {isAdmin && (
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
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAthlete({
                                ...newAthlete,
                                name: e.target.value
                            })}
                            autoFocus
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Division"
                                options={[
                                    {label: 'Rx', value: 'Rx'},
                                    {label: 'Scaled', value: 'Scaled'},
                                    {label: 'Foundations', value: 'Foundations'}
                                ]}
                                value={newAthlete.division}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewAthlete({
                                    ...newAthlete,
                                    division: e.target.value as 'Rx' | 'Scaled' | 'Foundations'
                                })}
                            />
                            <Select
                                label="Gender"
                                options={[
                                    {label: 'Male', value: 'M'},
                                    {label: 'Female', value: 'F'},
                                ]}
                                value={newAthlete.gender}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewAthlete({
                                    ...newAthlete,
                                    gender: e.target.value as 'M' | 'F'
                                })}
                            />
                        </div>
                        <Input
                            label="Age"
                            type="number"
                            placeholder="e.g. 28"
                            value={newAthlete.age}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAthlete({
                                ...newAthlete,
                                age: e.target.value
                            })}
                        />
                        <button
                            type="submit"
                            className="w-full bg-gold-600 hover:bg-gold-500 text-white font-bold py-3 rounded-lg mt-2 transition-colors uppercase tracking-wide"
                        >
                            Add to Roster
                        </button>
                        <p className="text-[10px] text-zinc-500 text-center mt-3">
                            Adding to gym: <span
                            className="text-white font-bold">{gyms.find(g => g.id === myGymId)?.name}</span>
                        </p>
                    </form>
                </Modal>
            )}

            {editingAthlete && (
                <Modal
                    isOpen={isScoreModalOpen}
                    onClose={() => setIsScoreModalOpen(false)}
                    title={`Edit: ${editingAthlete.name}`}
                >
                    <form onSubmit={handleUpdateScore}>
                        <div className="grid grid-cols-1 gap-3 mb-6">
                            {(['w1', 'w2', 'w3'] as const).filter(workoutKey => workoutConfigs[workoutKey].published || isSuperAdmin).length === 0 ? (
                                <div className="p-6 bg-zinc-950/50 rounded-lg border border-zinc-800 text-center">
                                    <div className="text-zinc-500 mb-2">
                                        <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-zinc-400 font-medium">No workouts available yet</p>
                                    <p className="text-xs text-zinc-500 mt-1">Workouts will appear here once they are published.</p>
                                </div>
                            ) : (['w1', 'w2', 'w3'] as const)
                                .filter(workoutKey => workoutConfigs[workoutKey].published || isSuperAdmin)
                                .map(workoutKey => {
                                const config = workoutConfigs[workoutKey];
                                const scoreValue = scoreForm[workoutKey];
                                const verifiedKey = `${workoutKey}_verified` as const;
                                const cappedKey = `${workoutKey}_capped` as keyof ScoreForm;
                                const tiebreakerKey = `${workoutKey}_tiebreaker` as keyof ScoreForm;

                                return (
                                    <div key={workoutKey} className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-bold text-gold-500 uppercase tracking-wide">
                                                {config.name} Score
                                                <span className="text-zinc-500 font-normal ml-1">
                                                    ({config.scoreType === 'time' ? 'Time' :
                                                      config.scoreType === 'time_cap_reps' ? 'Time/Reps' :
                                                      config.unit || 'reps'})
                                                </span>
                                                {!config.published && isSuperAdmin && (
                                                    <span className="text-gold-500 font-normal ml-1">(Draft)</span>
                                                )}
                                            </h4>
                                            {isAdmin && (
                                                <div className="flex items-center">
                                                    <input type="checkbox" id={verifiedKey}
                                                           checked={scoreForm[verifiedKey]}
                                                           onChange={(e) => setScoreForm({
                                                               ...scoreForm,
                                                               [verifiedKey]: e.target.checked
                                                           })}
                                                           className="h-4 w-4 text-gold-600 bg-zinc-800 border-zinc-700 rounded focus:ring-gold-500"/>
                                                    <label htmlFor={verifiedKey}
                                                           className="ml-2 text-xs text-zinc-400">Verified</label>
                                                </div>
                                            )}
                                        </div>

                                        {config.description && (
                                            <p className="text-xs text-zinc-400 mb-3 whitespace-pre-line">{config.description}</p>
                                        )}

                                        {config.scoreType === 'time' && (
                                            <TimeInput
                                                value={scoreValue as number}
                                                onChange={(seconds) => setScoreForm({...scoreForm, [workoutKey]: seconds})}
                                                placeholder="MM:SS"
                                            />
                                        )}

                                        {config.scoreType === 'time_cap_reps' && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`${workoutKey}_capped_check`}
                                                        checked={scoreForm[cappedKey] as boolean || false}
                                                        onChange={(e) => setScoreForm({
                                                            ...scoreForm,
                                                            [cappedKey]: e.target.checked,
                                                            [workoutKey]: '' // Clear score when toggling
                                                        })}
                                                        className="h-4 w-4 text-gold-600 bg-zinc-800 border-zinc-700 rounded focus:ring-gold-500"
                                                    />
                                                    <label htmlFor={`${workoutKey}_capped_check`} className="text-xs text-zinc-400">
                                                        Did not finish (time capped)
                                                    </label>
                                                </div>
                                                {scoreForm[cappedKey] ? (
                                                    <>
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            placeholder={`Reps completed (cap: ${config.timeCap ? Math.floor(config.timeCap / 60) : '?'} min)`}
                                                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-gold-500 outline-none"
                                                            value={scoreValue as string}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setScoreForm({
                                                                ...scoreForm,
                                                                [workoutKey]: e.target.value
                                                            })}
                                                        />
                                                        <div className="pt-2 border-t border-zinc-800">
                                                            <label className="text-xs text-zinc-500 block mb-1">
                                                                {config.tiebreakerLabel || 'Tiebreaker time (for same reps)'}
                                                            </label>
                                                            <TimeInput
                                                                value={scoreForm[tiebreakerKey] as number}
                                                                onChange={(seconds) => setScoreForm({...scoreForm, [tiebreakerKey]: seconds})}
                                                                placeholder="MM:SS"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <TimeInput
                                                        value={scoreValue as number}
                                                        onChange={(seconds) => setScoreForm({...scoreForm, [workoutKey]: seconds})}
                                                        placeholder="Finish time (MM:SS)"
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {(config.scoreType === 'reps' || config.scoreType === 'weight') && (
                                            <div className="space-y-2">
                                                <input
                                                    type="number"

                                                    step="any"
                                                    placeholder={config.unit || '0'}
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:border-gold-500 outline-none"
                                                    value={scoreValue as string}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setScoreForm({
                                                        ...scoreForm,
                                                        [workoutKey]: e.target.value
                                                    })}
                                                />
                                                {config.hasTiebreaker && (
                                                    <div className="pt-2 border-t border-zinc-800">
                                                        <label className="text-xs text-zinc-500 block mb-1">
                                                            {config.tiebreakerLabel || 'Tiebreaker time'}
                                                        </label>
                                                        <TimeInput
                                                            value={scoreForm[tiebreakerKey] as number}
                                                            onChange={(seconds) => setScoreForm({...scoreForm, [tiebreakerKey]: seconds})}
                                                            placeholder="MM:SS"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {isAdmin && (
                            <div className="grid grid-cols-3 gap-2">
                                <Select
                                    label="Div"
                                    options={[{label: 'Rx', value: 'Rx'}, {label: 'Sc', value: 'Scaled'}, {
                                        label: 'Found',
                                        value: 'Foundations'
                                    }]}
                                    value={scoreForm.division}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setScoreForm({
                                        ...scoreForm,
                                        division: e.target.value as 'Rx' | 'Scaled' | 'Foundations'
                                    })}
                                />
                                <Select
                                    label="Sex"
                                    options={[{label: 'M', value: 'M'}, {label: 'F', value: 'F'}]}
                                    value={scoreForm.gender}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setScoreForm({
                                        ...scoreForm,
                                        gender: e.target.value as 'M' | 'F'
                                    })}
                                />
                                <Input
                                    label="Age"
                                    type="number"
                                    value={scoreForm.age}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setScoreForm({
                                        ...scoreForm,
                                        age: e.target.value
                                    })}
                                />
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteAthlete(editingAthlete.id)}
                                    className="flex-none bg-red-900/20 hover:bg-red-900/40 text-red-500 p-3 rounded-lg transition-colors border border-red-900/30"
                                >
                                    <Trash2 size={20}/>
                                </button>
                            )}
                            <button
                                type="submit"
                                className="flex-1 bg-gold-600 hover:bg-gold-500 text-white font-bold py-3 rounded-lg transition-colors uppercase tracking-wide"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            <Modal
                isOpen={isSelectGymModalOpen}
                onClose={() => setIsSelectGymModalOpen(false)}
                title="Select a New Gym"
            >

                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <Select
                        label="Select a Gym"
                        options={[{label: 'Select a gym...', value: ''}, ...gyms.map(gym => ({label: gym.name, value: gym.id}))]}
                        value={selectedGymId}
                        onChange={(e) => setSelectedGymId(e.target.value)}
                    />
                    <button
                        onClick={() => handleSetAthletesGym(user.uid, selectedGymId)}
                        disabled={!selectedGymId}
                        className="w-full bg-gold-600 hover:bg-gold-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={18}/>
                        Lets Go!
                    </button>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><span
                            className="w-full border-t border-zinc-800"></span></div>
                        <div className="relative flex justify-center text-xs uppercase"><span
                            className="bg-zinc-950 px-2 text-zinc-500">or</span></div>
                    </div>

                    <button
                        onClick={() => {
                            setIsSelectGymModalOpen(false)
                            setIsCreateGymModalOpen(true)
                        }
                    }
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                        <Plus size={18}/>
                        Create a New Gym
                    </button>

                    <button onClick={() => {
                        signOut(auth);
                        setViewState('landing');
                    }} className="text-zinc-600 text-xs hover:text-zinc-400 py-2">
                        Sign Out
                    </button>
                </div>
            </Modal>
            <Modal
                title="Create a New Gym"
                isOpen={isCreateGymModalOpen}
                onClose={() => setIsCreateGymModalOpen(false)}>
                <form onSubmit={handleCreateGym}>
                    <Input
                        label="Gym Name"
                        placeholder="e.g. CrossFit Central"
                        value={newGymName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewGymName(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="w-full bg-gold-600 hover:bg-gold-500 text-white font-bold py-3 rounded-lg mt-2 transition-colors uppercase tracking-wide"
                    >
                        Create Gym
                    </button>
                </form>
            </Modal>

            {/* Filter Popout Modal */}
            <Modal
                isOpen={isFilterPopoutOpen}
                onClose={() => setIsFilterPopoutOpen(false)}
                title="Filters"
            >
                <div className="space-y-4">
                    {/* Gym Filter */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Gym
                        </label>
                        <select
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500"
                            value={tempFilterGym}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTempFilterGym(e.target.value)}
                        >
                            <option value="">All Gyms</option> {/* Changed to All Gyms */}
                            {gyms.map(gym => (
                                <option key={gym.id} value={gym.id}>{gym.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Search Athletes
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"/>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={tempSearchTerm}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setTempSearchTerm(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:border-gold-500 transition-colors"
                            />
                            {tempSearchTerm && (
                                <button
                                    onClick={() => setTempSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                >
                                    <X size={16}/>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Division */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Division
                        </label>
                        <select
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500"
                            value={tempFilterDivision}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTempFilterDivision(e.target.value as DivisionFilter)}
                        >
                            <option value="all">All Divisions</option>
                            <option value="Rx">Rx</option>
                            <option value="Scaled">Scaled</option>
                            <option value="Foundations">Foundations</option>
                        </select>
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Gender
                        </label>
                        <select
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500"
                            value={tempFilterGender}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTempFilterGender(e.target.value as GenderFilter)}
                        >
                            <option value="all">All Genders</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                        </select>
                    </div>

                    {/* Age Group */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Age Group
                        </label>
                        <select
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500"
                            value={tempFilterAgeGroup}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTempFilterAgeGroup(e.target.value as AgeGroupFilter)}
                        >
                            {AGE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => {
                                setTempFilterGym('');
                                setTempSearchTerm('');
                                setTempFilterDivision('all');
                                setTempFilterGender('all');
                                setTempFilterAgeGroup('all');
                            }}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-lg transition-colors"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={() => {
                                handleGymFilterChange(tempFilterGym); // Apply gym filter
                                setSearchTerm(tempSearchTerm);
                                setFilterDivision(tempFilterDivision);
                                setFilterGender(tempFilterGender);
                                setFilterAgeGroup(tempFilterAgeGroup);
                                setIsFilterPopoutOpen(false);
                            }}
                            className="flex-1 bg-gold-500 hover:bg-gold-600 text-black font-bold py-2 rounded-lg transition-colors"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Footer */}
            <footer className="mt-12 border-t border-zinc-800 py-6">
                <div className="max-w-6xl mx-auto px-4">
                    <p className="text-center text-xs text-zinc-500">
                        Built with ❤️ by{' '}
                        <a
                            href="https://www.linkedin.com/in/david-robson-3a964018/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold-500 hover:text-gold-400 transition-colors"
                        >
                            David Robson
                        </a>
                    </p>
                </div>
            </footer>

        </div>
    );
}
