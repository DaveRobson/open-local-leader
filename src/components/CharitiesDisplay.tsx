import { ExternalLink, Heart } from 'lucide-react';
import type { Charity } from '../hooks/useGyms';

interface CharitiesDisplayProps {
    charities: Charity[];
    gymName: string;
}

export function CharitiesDisplay({ charities, gymName }: CharitiesDisplayProps) {
    if (!charities || charities.length === 0) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="text-center">
                    <Heart className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-zinc-400 mb-2">No charity partners yet</h3>
                    <p className="text-zinc-500">Check back soon!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-6">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
                    Charity Partners
                </h2>
                <p className="text-zinc-400">
                    {gymName} is proud to support these charitable organizations
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {charities.map((charity) => (
                    <div
                        key={charity.id}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:bg-zinc-800 transition-colors"
                    >
                        {/* Logo/Icon */}
                        <div className="mb-4">
                            {charity.logoUrl ? (
                                <img
                                    src={charity.logoUrl}
                                    alt={`${charity.name} logo`}
                                    className="w-16 h-16 object-contain rounded"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-gold-500/10 rounded flex items-center justify-center">
                                    <Heart className="w-8 h-8 text-gold-500" />
                                </div>
                            )}
                        </div>

                        {/* Charity Info */}
                        <h3 className="text-lg font-bold text-white mb-2">
                            {charity.name}
                        </h3>
                        <p className="text-sm text-zinc-400 mb-4 line-clamp-3">
                            {charity.description}
                        </p>

                        {/* Visit Website Link */}
                        <a
                            href={charity.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black font-medium rounded-lg text-sm transition-colors"
                        >
                            Visit Website
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
