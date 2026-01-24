import { useState } from 'react';
import { Heart, Pencil, Trash2, ExternalLink, Plus } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Charity } from '../hooks/useGyms';
import type { CharityForm } from '../types';
import { CharityFormModal } from './CharityFormModal';
import { logError } from '../utils/logger';

interface CharityManagementProps {
    gymId: string;
    charities: Charity[];
    currentUserId: string;
    onUpdate: () => void;
}

export function CharityManagement({ gymId, charities, currentUserId }: CharityManagementProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCharity, setEditingCharity] = useState<Charity | null>(null);
    const [deletingCharityId, setDeletingCharityId] = useState<string | null>(null);

    const handleAddCharity = async (form: CharityForm) => {
        try {
            const newCharity: Charity = {
                id: crypto.randomUUID(),
                name: form.name,
                description: form.description,
                websiteUrl: form.websiteUrl,
                logoUrl: form.logoUrl || '',
                addedAt: Timestamp.now(),
                addedBy: currentUserId,
            };

            await updateDoc(doc(db, 'gyms', gymId), {
                charities: arrayUnion(newCharity),
            });

            setIsAddModalOpen(false);
        } catch (error) {
            logError('Error adding charity', error);
            alert('Failed to add charity. Please try again.');
        }
    };

    const handleEditCharity = async (form: CharityForm) => {
        if (!editingCharity) return;

        try {
            // Fetch current charities array
            const gymDoc = await getDoc(doc(db, 'gyms', gymId));
            const currentCharities = gymDoc.data()?.charities || [];

            // Update the specific charity
            const updatedCharities = currentCharities.map((c: Charity) =>
                c.id === editingCharity.id
                    ? {
                        ...c,
                        name: form.name,
                        description: form.description,
                        websiteUrl: form.websiteUrl,
                        logoUrl: form.logoUrl || '',
                    }
                    : c
            );

            await updateDoc(doc(db, 'gyms', gymId), {
                charities: updatedCharities,
            });

            setEditingCharity(null);
        } catch (error) {
            logError('Error editing charity', error);
            alert('Failed to edit charity. Please try again.');
        }
    };

    const handleDeleteCharity = async (charityId: string) => {
        try {
            // Find the charity object to remove
            const gymDoc = await getDoc(doc(db, 'gyms', gymId));
            const charityToRemove = gymDoc.data()?.charities?.find((c: Charity) => c.id === charityId);

            if (charityToRemove) {
                await updateDoc(doc(db, 'gyms', gymId), {
                    charities: arrayRemove(charityToRemove),
                });
            }

            setDeletingCharityId(null);
        } catch (error) {
            logError('Error deleting charity', error);
            alert('Failed to delete charity. Please try again.');
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Heart className="w-5 h-5 text-gold-500" />
                        Charity Partners
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        Manage your gym's charity partnerships
                    </p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Charity
                </button>
            </div>

            {/* Charities List */}
            {!charities || charities.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
                    <Heart className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-zinc-400 mb-2">
                        No charity partners yet
                    </h3>
                    <p className="text-sm text-zinc-500 mb-4">
                        Add your first charity partner to support causes your gym cares about
                    </p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add First Charity
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {charities.map((charity) => (
                        <div
                            key={charity.id}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="flex items-start gap-4">
                                {/* Logo */}
                                <div className="flex-shrink-0">
                                    {charity.logoUrl ? (
                                        <img
                                            src={charity.logoUrl}
                                            alt={`${charity.name} logo`}
                                            className="w-12 h-12 object-contain rounded"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-gold-500/10 rounded flex items-center justify-center">
                                            <Heart className="w-6 h-6 text-gold-500" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-white">
                                            {charity.name}
                                        </h3>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => setEditingCharity(charity)}
                                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                                                title="Edit charity"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeletingCharityId(charity.id)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-700 rounded transition-colors"
                                                title="Delete charity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-zinc-400 mb-3">
                                        {charity.description}
                                    </p>
                                    <a
                                        href={charity.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-gold-500 hover:text-gold-400 transition-colors"
                                    >
                                        {charity.websiteUrl}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Charity Modal */}
            <CharityFormModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddCharity}
                title="Add Charity Partner"
            />

            {/* Edit Charity Modal */}
            {editingCharity && (
                <CharityFormModal
                    isOpen={true}
                    onClose={() => setEditingCharity(null)}
                    onSubmit={handleEditCharity}
                    initialData={{
                        name: editingCharity.name,
                        description: editingCharity.description,
                        websiteUrl: editingCharity.websiteUrl,
                        logoUrl: editingCharity.logoUrl,
                    }}
                    title="Edit Charity Partner"
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingCharityId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-white mb-3">Delete Charity Partner?</h3>
                        <p className="text-zinc-400 mb-6">
                            Are you sure you want to remove this charity partner? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingCharityId(null)}
                                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteCharity(deletingCharityId)}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
