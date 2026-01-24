import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logError } from '../utils/logger';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        logError('React render error', error, {
            componentStack: errorInfo.componentStack,
        });
    }

    handleRefresh = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="bg-red-500/10 p-4 rounded-full ring-1 ring-red-500/20">
                                <AlertTriangle className="w-12 h-12 text-red-500" />
                            </div>
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">
                                Something went wrong
                            </h1>
                            <p className="text-zinc-400 text-sm">
                                We've logged this error and will look into it. Please try refreshing the page.
                            </p>
                        </div>

                        {import.meta.env.DEV && this.state.error && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left">
                                <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
                                    Error Details (dev only)
                                </p>
                                <p className="text-sm text-red-400 font-mono break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={this.handleRefresh}
                            className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                        >
                            <RefreshCw size={18} />
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
