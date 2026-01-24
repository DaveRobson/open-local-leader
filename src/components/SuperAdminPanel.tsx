import {type FC, useState} from 'react';
import {AlertCircle, Building2, Settings, Users, Eye, EyeOff} from 'lucide-react';
import WorkoutConfigModal from './WorkoutConfigModal';
import GymManagement from './GymManagement';
import UserManagement from './UserManagement';
import ErrorLogViewer from './ErrorLogViewer';
import {type Athlete, type WorkoutConfigs} from '../types';
import {type Gym} from '../hooks/useGyms';

interface SuperAdminPanelProps {
    workoutConfigs: WorkoutConfigs;
    onSaveWorkoutConfig: (configs: WorkoutConfigs) => Promise<void>;
    gyms: Gym[];
    athletes: Athlete[];
}

type SuperAdminTab = 'workouts' | 'gyms' | 'users' | 'errors';

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
        { id: 'errors' as const, label: 'Error Logs', icon: AlertCircle },
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

            <div className="flex gap-2 border-b border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                    >
                        <tab.icon size={16} className="flex-shrink-0" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden text-xs">{tab.id === 'workouts' ? 'Config' : tab.id === 'gyms' ? 'Gyms' : tab.id === 'users' ? 'Users' : 'Errors'}</span>
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
                                    <div key={w} className={`p-3 bg-zinc-950 rounded-lg border ${config.published ? 'border-gold-500/50' : 'border-zinc-800'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-xs text-zinc-500 uppercase tracking-wider">{config.name}</div>
                                            <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                                                config.published
                                                    ? 'bg-gold-500/20 text-gold-400'
                                                    : 'bg-zinc-800 text-zinc-500'
                                            }`}>
                                                {config.published ? <Eye size={10} /> : <EyeOff size={10} />}
                                                {config.published ? 'Live' : 'Draft'}
                                            </div>
                                        </div>
                                        <div className="text-sm font-bold text-white capitalize mb-1">
                                            {config.scoreType.replace('_', ' ')}
                                        </div>
                                        {config.description && (
                                            <div className="text-xs text-zinc-400 mb-2 line-clamp-2">{config.description}</div>
                                        )}
                                        <div className="flex flex-wrap gap-1">
                                            {config.unit && (
                                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{config.unit}</span>
                                            )}
                                            {config.hasTiebreaker && (
                                                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">Tiebreaker</span>
                                            )}
                                            {config.timeCap && (
                                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{Math.floor(config.timeCap / 60)} min cap</span>
                                            )}
                                        </div>
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

            {activeTab === 'errors' && (
                <ErrorLogViewer athletes={athletes} />
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
