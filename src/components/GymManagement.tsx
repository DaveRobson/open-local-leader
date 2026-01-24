import {type ChangeEvent, type FC, useState} from 'react';
import {Building2, Edit2, Save, Trash2, UserMinus, UserPlus} from 'lucide-react';
import {arrayRemove, arrayUnion, deleteDoc, doc, updateDoc} from 'firebase/firestore';
import {db} from '../config/firebase';
import Modal from './Modal';
import Input from './Input';
import {type Gym} from '../hooks/useGyms';
import {type Athlete} from '../types';
import {logError} from '../utils/logger';

interface GymManagementProps {
    gyms: Gym[];
    athletes: Athlete[];
}

const GymManagement: FC<GymManagementProps> = ({ gyms, athletes }) => {
    const [editingGym, setEditingGym] = useState<Gym | null>(null);
    const [editName, setEditName] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const gymAthletes = (gymId: string) => athletes.filter(a => a.gymId === gymId);

    const openEditModal = (gym: Gym) => {
        setEditingGym(gym);
        setEditName(gym.name);
        setIsEditModalOpen(true);
    };

    const openAdminModal = (gym: Gym) => {
        setEditingGym(gym);
        setSelectedUserId('');
        setIsAdminModalOpen(true);
    };

    const handleSaveGymName = async () => {
        if (!editingGym || !editName.trim()) return;

        try {
            const gymRef = doc(db, 'gyms', editingGym.id);
            await updateDoc(gymRef, { name: editName.trim() });
            setIsEditModalOpen(false);
            setEditingGym(null);
        } catch (error) {
            logError('Error updating gym name', error, { gymId: editingGym.id, newName: editName.trim() });
        }
    };

    const handleDeleteGym = async (gymId: string) => {
        if (!confirm('Are you sure you want to delete this gym? This cannot be undone. Athletes will NOT be deleted.')) return;

        try {
            await deleteDoc(doc(db, 'gyms', gymId));
        } catch (error) {
            logError('Error deleting gym', error, { gymId });
        }
    };

    const handleAddAdmin = async (userId: string) => {
        if (!editingGym) return;

        try {
            const gymRef = doc(db, 'gyms', editingGym.id);
            await updateDoc(gymRef, { admins: arrayUnion(userId) });
            setSelectedUserId('');
        } catch (error) {
            logError('Error adding admin', error, { gymId: editingGym.id, userId });
        }
    };

    const handleRemoveAdmin = async (userId: string) => {
        if (!editingGym) return;

        try {
            const gymRef = doc(db, 'gyms', editingGym.id);
            await updateDoc(gymRef, { admins: arrayRemove(userId) });
        } catch (error) {
            logError('Error removing admin', error, { gymId: editingGym.id, userId });
        }
    };

    const filteredGyms = gyms.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-white">All Gyms ({gyms.length})</h3>
                <input
                    type="text"
                    placeholder="Search gyms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 w-full sm:w-48"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGyms.map(gym => (
                    <div key={gym.id} className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 hover:border-purple-500/30 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Building2 size={18} className="text-purple-500" />
                                <div>
                                    <h4 className="font-bold text-white">{gym.name}</h4>
                                    <p className="text-xs text-zinc-500">{gym.id}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => openEditModal(gym)}
                                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                    title="Edit gym name"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDeleteGym(gym.id)}
                                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded transition-colors"
                                    title="Delete gym"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="text-xs text-zinc-400 mb-2">
                            {gymAthletes(gym.id).length} athletes
                        </div>

                        <div className="space-y-1 mb-3">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider">Admins ({gym.admins?.length || 0})</div>
                            {gym.admins?.slice(0, 3).map(adminId => {
                                const admin = athletes.find(a => a.id === adminId);
                                return (
                                    <div key={adminId} className="text-xs text-zinc-300">
                                        {admin?.name || adminId.slice(0, 8) + '...'}
                                    </div>
                                );
                            })}
                            {(gym.admins?.length || 0) > 3 && (
                                <div className="text-xs text-zinc-500">+{gym.admins.length - 3} more</div>
                            )}
                        </div>

                        <button
                            onClick={() => openAdminModal(gym)}
                            className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                            <UserPlus size={14} />
                            Manage Admins
                        </button>
                    </div>
                ))}
            </div>

            {filteredGyms.length === 0 && (
                <div className="text-center py-10 text-zinc-500">
                    No gyms found matching "{searchTerm}"
                </div>
            )}

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Gym Name"
            >
                <Input
                    label="Gym Name"
                    value={editName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                    autoFocus
                />
                <button
                    onClick={handleSaveGymName}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <Save size={16} />
                    Save Changes
                </button>
            </Modal>

            <Modal
                isOpen={isAdminModalOpen}
                onClose={() => setIsAdminModalOpen(false)}
                title={`Manage Admins: ${editingGym?.name || ''}`}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                            Current Admins
                        </label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {editingGym?.admins?.map(adminId => {
                                const admin = athletes.find(a => a.id === adminId);
                                return (
                                    <div key={adminId} className="flex items-center justify-between p-2 bg-zinc-950 rounded-lg">
                                        <span className="text-sm text-white">
                                            {admin?.name || adminId.slice(0, 16) + '...'}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveAdmin(adminId)}
                                            className="p-1 text-red-500 hover:bg-red-500/20 rounded transition-colors"
                                            title="Remove admin"
                                        >
                                            <UserMinus size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                            {(!editingGym?.admins || editingGym.admins.length === 0) && (
                                <p className="text-xs text-zinc-500 p-2">No admins</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                            Add Admin
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-2"
                        >
                            <option value="">Select a user...</option>
                            {athletes
                                .filter(a => !editingGym?.admins?.includes(a.id))
                                .map(athlete => (
                                    <option key={athlete.id} value={athlete.id}>
                                        {athlete.name} ({athlete.gymId})
                                    </option>
                                ))}
                        </select>
                        <button
                            onClick={() => selectedUserId && handleAddAdmin(selectedUserId)}
                            disabled={!selectedUserId}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-700 disabled:cursor-not-allowed"
                        >
                            <UserPlus size={16} />
                            Add Admin
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default GymManagement;
