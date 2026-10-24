import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 liquid-glass rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-slate-900/80 to-black text-center space-y-4 animate-ios">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black txt-main">
              {this.props.fallbackTitle || 'Wystąpił drobny problem w tym module'}
            </h3>
            <p className="text-xs txt-sub max-w-md mx-auto leading-relaxed">
              Aplikacja zapobiegła wyłączeniu ekranu. Twoje dane i stan treningu są w pełni bezpieczne.
            </p>
            {this.state.error?.message && (
              <p className="text-[10px] font-mono text-rose-300/80 bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-500/20 max-w-sm mx-auto overflow-hidden text-ellipsis whitespace-nowrap">
                {this.state.error.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2.5 rounded-xl accent-bg text-black font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Odśwież Moduł</span>
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = '';
              }}
              className="px-4 py-2.5 rounded-xl liquid-pill text-xs font-bold txt-main border border-white/10 hover:border-white/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Powrót</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
