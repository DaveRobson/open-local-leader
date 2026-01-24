import { type FC, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Search, RefreshCw } from 'lucide-react';
import { useErrorLogs, type ErrorLog } from '../hooks/useErrorLogs';
import { type Athlete } from '../types';

interface ErrorLogViewerProps {
    athletes: Athlete[];
}

const ErrorLogViewer: FC<ErrorLogViewerProps> = ({ athletes }) => {
    const [userIdFilter, setUserIdFilter] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const { logs, loading, error } = useErrorLogs({
        userId: userIdFilter || undefined,
    });

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const formatTimestamp = (timestamp: ErrorLog['timestamp']): string => {
        if (!timestamp) return 'Unknown';
        try {
            const date = timestamp.toDate();
            return date.toLocaleString();
        } catch {
            return 'Invalid date';
        }
    };

    const getLevelColor = (level: ErrorLog['level']): string => {
        switch (level) {
            case 'error':
                return 'bg-red-500/20 text-red-400';
            case 'warn':
                return 'bg-yellow-500/20 text-yellow-400';
            case 'info':
                return 'bg-blue-500/20 text-blue-400';
            default:
                return 'bg-zinc-500/20 text-zinc-400';
        }
    };

    const getAthleteNameById = (userId: string | null): string => {
        if (!userId) return 'Anonymous';
        const athlete = athletes.find((a) => a.id === userId);
        return athlete?.name || userId.slice(0, 8) + '...';
    };

    if (error) {
        return (
            <div className="p-6 bg-red-900/20 rounded-xl border border-red-900/30 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="text-md font-bold text-white">Error Loading Logs</h3>
                <p className="text-zinc-500 text-sm mt-1">
                    {error.message || 'Failed to load error logs. Check Firestore rules.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-white">
                    Error Logs ({logs.length})
                </h3>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Filter by User ID..."
                        value={userIdFilter}
                        onChange={(e) => setUserIdFilter(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-purple-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-10 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                    <AlertCircle className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <h3 className="text-md font-bold text-white">No Error Logs</h3>
                    <p className="text-zinc-500 text-sm mt-1">
                        {userIdFilter ? `No logs found for user "${userIdFilter}"` : 'No errors have been logged yet.'}
                    </p>
                </div>
            ) : (
                <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-800">
                            <thead className="bg-zinc-950/50">
                                <tr>
                                    <th scope="col" className="w-8 px-2 py-2"></th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                        Level
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                        Message
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {logs.map((log) => {
                                    const isExpanded = expandedRows.has(log.id);
                                    return (
                                        <>
                                            <tr
                                                key={log.id}
                                                className="hover:bg-zinc-800/40 transition-colors cursor-pointer"
                                                onClick={() => toggleRow(log.id)}
                                            >
                                                <td className="px-2 py-3 text-zinc-500">
                                                    {isExpanded ? (
                                                        <ChevronDown size={14} />
                                                    ) : (
                                                        <ChevronRight size={14} />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-400">
                                                    {formatTimestamp(log.timestamp)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span
                                                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${getLevelColor(log.level)}`}
                                                    >
                                                        {log.level}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-300">
                                                    {getAthleteNameById(log.userId)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-white truncate max-w-xs">
                                                    {log.message}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr key={`${log.id}-details`} className="bg-zinc-950/50">
                                                    <td colSpan={5} className="px-4 py-4">
                                                        <div className="space-y-3 text-xs">
                                                            <div>
                                                                <span className="text-zinc-500 uppercase tracking-wider">
                                                                    URL:
                                                                </span>
                                                                <span className="text-zinc-300 ml-2 break-all">
                                                                    {log.url || 'N/A'}
                                                                </span>
                                                            </div>
                                                            {log.error && (
                                                                <div>
                                                                    <span className="text-zinc-500 uppercase tracking-wider">
                                                                        Error:
                                                                    </span>
                                                                    <div className="mt-1 bg-zinc-900 p-3 rounded-lg border border-zinc-800 font-mono text-red-400 text-xs overflow-x-auto">
                                                                        {log.error.name && (
                                                                            <div>
                                                                                <span className="text-zinc-500">Name: </span>
                                                                                {log.error.name}
                                                                            </div>
                                                                        )}
                                                                        {log.error.code && (
                                                                            <div>
                                                                                <span className="text-zinc-500">Code: </span>
                                                                                {log.error.code}
                                                                            </div>
                                                                        )}
                                                                        {log.error.message && (
                                                                            <div>
                                                                                <span className="text-zinc-500">Message: </span>
                                                                                {log.error.message}
                                                                            </div>
                                                                        )}
                                                                        {log.error.stack && (
                                                                            <div className="mt-2">
                                                                                <span className="text-zinc-500">Stack:</span>
                                                                                <pre className="mt-1 whitespace-pre-wrap break-all text-[10px]">
                                                                                    {log.error.stack}
                                                                                </pre>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {log.context && Object.keys(log.context).length > 0 && (
                                                                <div>
                                                                    <span className="text-zinc-500 uppercase tracking-wider">
                                                                        Context:
                                                                    </span>
                                                                    <pre className="mt-1 bg-zinc-900 p-3 rounded-lg border border-zinc-800 font-mono text-zinc-300 text-xs overflow-x-auto whitespace-pre-wrap">
                                                                        {JSON.stringify(log.context, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <span className="text-zinc-500 uppercase tracking-wider">
                                                                    User Agent:
                                                                </span>
                                                                <span className="text-zinc-400 ml-2 text-[10px]">
                                                                    {log.userAgent || 'N/A'}
                                                                </span>
                                                            </div>
                                                            {log.userId && (
                                                                <div>
                                                                    <span className="text-zinc-500 uppercase tracking-wider">
                                                                        User ID:
                                                                    </span>
                                                                    <span className="text-zinc-300 ml-2 font-mono">
                                                                        {log.userId}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ErrorLogViewer;
