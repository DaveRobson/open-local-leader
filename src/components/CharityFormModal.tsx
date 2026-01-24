import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CharityForm } from '../types';

interface CharityFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (form: CharityForm) => Promise<void>;
    initialData?: CharityForm;
    title: string;
}

const isValidUrl = (url: string): boolean => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
};

export function CharityFormModal({ isOpen, onClose, onSubmit, initialData, title }: CharityFormModalProps) {
    const [form, setForm] = useState<CharityForm>({
        name: '',
        description: '',
        websiteUrl: '',
        logoUrl: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setForm(initialData);
        } else {
            setForm({
                name: '',
                description: '',
                websiteUrl: '',
                logoUrl: '',
            });
        }
        setErrors({});
    }, [initialData, isOpen]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!form.name.trim()) {
            newErrors.name = 'Charity name is required';
        } else if (form.name.length > 100) {
            newErrors.name = 'Name must be 100 characters or less';
        }

        if (!form.description.trim()) {
            newErrors.description = 'Description is required';
        } else if (form.description.length > 200) {
            newErrors.description = 'Description must be 200 characters or less';
        }

        if (!form.websiteUrl.trim()) {
            newErrors.websiteUrl = 'Website URL is required';
        } else if (!isValidUrl(form.websiteUrl)) {
            newErrors.websiteUrl = 'Please enter a valid URL (must start with http:// or https://)';
        }

        if (form.logoUrl && !isValidUrl(form.logoUrl)) {
            newErrors.logoUrl = 'Please enter a valid URL (must start with http:// or https://)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(form);
            onClose();
        } catch (error) {
            console.error('Error submitting charity form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Charity Name */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Charity Name *
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-gold-500"
                            placeholder="e.g., American Red Cross"
                            maxLength={100}
                        />
                        {errors.name && (
                            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                        )}
                        <p className="text-xs text-zinc-500 mt-1">
                            {form.name.length}/100 characters
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Description *
                        </label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-gold-500 resize-none"
                            placeholder="Brief description of the charity and its mission"
                            rows={3}
                            maxLength={200}
                        />
                        {errors.description && (
                            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                        )}
                        <p className="text-xs text-zinc-500 mt-1">
                            {form.description.length}/200 characters
                        </p>
                    </div>

                    {/* Website URL */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Website URL *
                        </label>
                        <input
                            type="url"
                            value={form.websiteUrl}
                            onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-gold-500"
                            placeholder="https://example.org"
                        />
                        {errors.websiteUrl && (
                            <p className="text-red-500 text-sm mt-1">{errors.websiteUrl}</p>
                        )}
                    </div>

                    {/* Logo URL */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Logo URL (Optional)
                        </label>
                        <input
                            type="url"
                            value={form.logoUrl || ''}
                            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-gold-500"
                            placeholder="https://example.org/logo.png"
                        />
                        {errors.logoUrl && (
                            <p className="text-red-500 text-sm mt-1">{errors.logoUrl}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Charity'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
