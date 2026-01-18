import { type FC, type ChangeEvent, useState, useEffect } from 'react';
import { Settings, Eye, EyeOff } from 'lucide-react';
import Modal from './Modal';
import Select from './Select';
import Input from './Input';
import { type WorkoutConfigs, type WorkoutConfig, type WorkoutId, type ScoreType } from '../types';

interface WorkoutConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    workoutConfigs: WorkoutConfigs;
    onSave: (configs: WorkoutConfigs) => Promise<void>;
}

const scoreTypeOptions = [
    { label: 'Reps (Higher = Better)', value: 'reps' },
    { label: 'Time (Lower = Better)', value: 'time' },
    { label: 'Weight (Higher = Better)', value: 'weight' },
    { label: 'Time Cap + Reps', value: 'time_cap_reps' },
];

const WorkoutConfigModal: FC<WorkoutConfigModalProps> = ({ isOpen, onClose, workoutConfigs, onSave }) => {
    const [localConfigs, setLocalConfigs] = useState<WorkoutConfigs>(workoutConfigs);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLocalConfigs(workoutConfigs);
    }, [workoutConfigs]);

    const handleConfigChange = (workoutId: WorkoutId, field: keyof WorkoutConfig, value: string | number | boolean) => {
        setLocalConfigs(prev => ({
            ...prev,
            [workoutId]: {
                ...prev[workoutId],
                [field]: value,
            },
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await onSave(localConfigs);
            onClose();
        } catch {
            setError('Failed to save configuration. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const renderWorkoutConfig = (workoutId: WorkoutId, config: WorkoutConfig) => {
        return (
            <div key={workoutId} className={`p-4 bg-zinc-950/50 rounded-lg border mb-4 ${config.published ? 'border-gold-500/50' : 'border-zinc-800'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Settings size={16} className={config.published ? 'text-gold-500' : 'text-zinc-500'} />
                        <h4 className="text-sm font-bold text-white uppercase tracking-wide">{config.name}</h4>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleConfigChange(workoutId, 'published', !config.published)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            config.published
                                ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                        }`}
                    >
                        {config.published ? <Eye size={12} /> : <EyeOff size={12} />}
                        {config.published ? 'Published' : 'Draft'}
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                        Description
                    </label>
                    <textarea
                        placeholder="e.g., 21-15-9 Thrusters and Pull-ups..."
                        value={config.description || ''}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                            handleConfigChange(workoutId, 'description', e.target.value)
                        }
                        rows={3}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all placeholder-zinc-600 text-sm resize-none"
                    />
                </div>

                <Select
                    label="Score Type"
                    options={scoreTypeOptions}
                    value={config.scoreType}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        handleConfigChange(workoutId, 'scoreType', e.target.value as ScoreType)
                    }
                />

                {config.scoreType === 'time_cap_reps' && (
                    <Input
                        label="Time Cap (minutes)"
                        type="number"
                        placeholder="e.g., 15"
                        value={config.timeCap ? Math.floor(config.timeCap / 60) : ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleConfigChange(workoutId, 'timeCap', parseInt(e.target.value) * 60 || 0)
                        }
                    />
                )}

                <Input
                    label="Unit Label"
                    placeholder="e.g., reps, lbs, kg"
                    value={config.unit || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleConfigChange(workoutId, 'unit', e.target.value)
                    }
                />

                {(config.scoreType === 'reps' || config.scoreType === 'weight') && (
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id={`${workoutId}_tiebreaker`}
                                checked={config.hasTiebreaker || false}
                                onChange={(e) => handleConfigChange(workoutId, 'hasTiebreaker', e.target.checked)}
                                className="h-4 w-4 text-gold-600 bg-zinc-800 border-zinc-700 rounded focus:ring-gold-500"
                            />
                            <label htmlFor={`${workoutId}_tiebreaker`} className="ml-2 text-xs text-zinc-400">
                                Has Tiebreaker Time
                            </label>
                        </div>

                        {config.hasTiebreaker && (
                            <Input
                                label="Tiebreaker Label"
                                placeholder="e.g., Time after round 2"
                                value={config.tiebreakerLabel || ''}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    handleConfigChange(workoutId, 'tiebreakerLabel', e.target.value)
                                }
                            />
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Workout Configuration">
            <p className="text-xs text-zinc-400 mb-4">
                Configure the scoring type for each workout. This affects how athletes are ranked.
            </p>

            {renderWorkoutConfig('w1', localConfigs.w1)}
            {renderWorkoutConfig('w2', localConfigs.w2)}
            {renderWorkoutConfig('w3', localConfigs.w3)}

            {error && (
                <p className="text-red-500 text-xs text-center mb-4">{error}</p>
            )}

            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gold-600 hover:bg-gold-500 text-white font-bold py-3 rounded-lg transition-colors uppercase tracking-wide disabled:bg-zinc-700 disabled:cursor-not-allowed"
            >
                {saving ? 'Saving...' : 'Save Configuration'}
            </button>
        </Modal>
    );
};

export default WorkoutConfigModal;
