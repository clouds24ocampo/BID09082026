import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class VaultErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[VaultErrorBoundary] Uncaught component render error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 max-w-2xl mx-auto my-8 shadow-2xl animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {this.props.fallbackTitle || 'Document Vault Render Protected'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              An isolated render error occurred in this document module. The rest of the application remains secure and responsive.
            </p>
          </div>

          {this.state.error && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left text-[11px] font-mono text-slate-400 overflow-x-auto max-h-32">
              <p className="font-bold text-amber-400">{this.state.error.name}: {this.state.error.message}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Render</span>
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition flex items-center gap-2"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Reload Workspace</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default VaultErrorBoundary;
