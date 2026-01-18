import { type FC, useState } from 'react';
import { Trash2, Shield, ShieldOff } from 'lucide-react';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { type Athlete } from '../types';
import { type Gym } from '../hooks/useGyms';

interface UserManagementProps {
    athletes: Athlete[];
    gyms: Gym[];
}

const UserManagement: FC<UserManagementProps> = ({ athletes, gyms }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This will remove their profile and scores permanently.')) return;

        try {
            await deleteDoc(doc(db, 'cf_leaderboard_athletes', userId));
            // Note: This doesn't delete the Firebase Auth user, only the profile data.
            // A cloud function would be needed for full user deletion.
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleToggleAdmin = async (athlete: Athlete) => {
        if (!athlete.gymId) {
            alert('User must belong to a gym to be made an admin.');
            return;
        }
        const gym = gyms.find(g => g.id === athlete.gymId);
        if (!gym) {
            alert('Gym not found for this user.');
            return;
        }

        const gymRef = doc(db, 'gyms', gym.id);
        const currentAdmins = gym.admins || [];
        const isCurrentlyAdmin = currentAdmins.includes(athlete.id);

        try {
            const newAdmins = isCurrentlyAdmin
                ? currentAdmins.filter(id => id !== athlete.id)
                : [...currentAdmins, athlete.id];

            await updateDoc(gymRef, { admins: newAdmins });
        } catch (error) {
            console.error('Error toggling admin status:', error);
        }
    };

    const filteredAthletes = athletes.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">All Users ({athletes.length})</h3>
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 w-48"
                />
            </div>

            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-800">
                        <thead className="bg-zinc-950/50">
                        <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">User</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Gym</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Role</th>
                            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                        {filteredAthletes.map(athlete => {
                            const gym = gyms.find(g => g.id === athlete.gymId);
                            const isGymAdmin = gym?.admins?.includes(athlete.id) || false;

                            return (
                                <tr key={athlete.id} className="hover:bg-zinc-800/40 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-sm font-medium text-white">{athlete.name}</div>
                                        <div className="text-xs text-zinc-500">{athlete.id}</div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
                                        {gym?.name || <span className="text-zinc-500">No Gym</span>}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {athlete.superAdmin ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-500/20 text-purple-400">Super Admin</span>
                                        ) : isGymAdmin ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gold-500/20 text-gold-400">Gym Admin</span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-zinc-700/50 text-zinc-400">Member</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            {!athlete.superAdmin && (
                                                <button
                                                    onClick={() => handleToggleAdmin(athlete)}
                                                    disabled={!athlete.gymId}
                                                    className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isGymAdmin ? 'text-gold-500 hover:bg-gold-500/20' : 'text-zinc-400 hover:bg-zinc-700'}`}
                                                    title={isGymAdmin ? 'Demote from Gym Admin' : 'Promote to Gym Admin'}
                                                >
                                                    {isGymAdmin ? <ShieldOff size={14} /> : <Shield size={14} />}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteUser(athlete.id)}
                                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/20 rounded transition-colors"
                                                title="Delete user profile"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;