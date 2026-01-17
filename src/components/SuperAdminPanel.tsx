import {type FC, useState} from 'react';
import {Building2, Settings, Users} from 'lucide-react';
import WorkoutConfigModal from './WorkoutConfigModal';
import GymManagement from './GymManagement';
import UserManagement from './UserManagement';
import {type Athlete, type WorkoutConfigs} from '../types';
import {type Gym} from '../hooks/useGyms';

interface SuperAdminPanelProps {
    workoutConfigs: WorkoutConfigs;
    onSaveWorkoutConfig: (configs: WorkoutConfigs) => Promise<void>;
    gyms: Gym[];
    athletes: Athlete[];
}

type SuperAdminTab = 'workouts' | 'gyms' | 'users';

const SuperAdminPanel: FC<SuperAdminPanelProps> = ({
    workoutConfigs,
    onSaveWorkoutConfig,
    gyms,
    athletes,
}) => {
    const [activeTab, setActiveTab] = useState<SuperAdminTab>('workouts');
    const [isWorkoutConfigModalOpen, setIsWorkoutConfigModalOpen] = useState(false);

    const tabs = [
        { id: 'workouts' as const, label: 'Workout Config', icon: Settings },
        { id: 'gyms' as const, label: 'Gym Management', icon: Building2 },
        { id: 'users' as const, label: 'User Management', icon: Users },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                    <Settings className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Super Admin Panel</h2>
                    <p className="text-xs text-zinc-400">Platform-wide administration</p>
                </div>
            </div>

            <div className="flex gap-2 border-b border-zinc-800 pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'workouts' && (
                <div className="space-y-4">
                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                        <h3 className="text-sm font-bold text-white mb-2">Current Workout Configuration</h3>
                        <p className="text-xs text-zinc-400 mb-4">
                            Configure how each workout is scored. This affects rankings across all gyms.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {(['w1', 'w2', 'w3'] as const).map(w => {
                                const config = workoutConfigs[w];
                                return (
                                    <div key={w} className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{config.name}</div>
                                        <div className="text-sm font-bold text-white capitalize">
                                            {config.scoreType.replace('_', ' ')}
                                        </div>
                                        {config.unit && (
                                            <div className="text-xs text-zinc-400">Unit: {config.unit}</div>
                                        )}
                                        {config.hasTiebreaker && (
                                            <div className="text-xs text-purple-400">Has tiebreaker</div>
                                        )}
                                        {config.timeCap && (
                                            <div className="text-xs text-zinc-400">Cap: {Math.floor(config.timeCap / 60)} min</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setIsWorkoutConfigModalOpen(true)}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Settings size={16} />
                            Edit Configuration
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'gyms' && (
                <GymManagement gyms={gyms} athletes={athletes} />
            )}

            {activeTab === 'users' && (
                <UserManagement athletes={athletes} gyms={gyms} />
            )}

            <WorkoutConfigModal
                isOpen={isWorkoutConfigModalOpen}
                onClose={() => setIsWorkoutConfigModalOpen(false)}
                workoutConfigs={workoutConfigs}
                onSave={onSaveWorkoutConfig}
            />
        </div>
    );
};

export default SuperAdminPanel;
