'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Friendly name shown in the fallback, e.g. "Quiz", "Chat" */
  label?: string;
  /** Optional callback when an error is caught */
  onError?: (error: Error, info: { componentStack?: string }) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  retryCount: number;
  showDetails: boolean;
}

const MAX_AUTO_RETRIES = 1;

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    componentStack: null,
    retryCount: 0,
    showDetails: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error(
      `[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`,
      error,
      info
    );

    this.setState({ componentStack: info?.componentStack ?? null });

    // Attempt one silent auto-retry — most errors are transient (a bad fetch,
    // a race in async state, etc.). If we recover silently, the user never
    // knows anything happened.
    if (this.state.retryCount < MAX_AUTO_RETRIES) {
      setTimeout(() => {
        this.setState((s) => ({
          hasError: false,
          error: null,
          componentStack: null,
          retryCount: s.retryCount + 1,
        }));
      }, 100);
    }

    this.props.onError?.(error, info);
  }

  handleRetry = () => {
    this.setState((s) => ({
      hasError: false,
      error: null,
      componentStack: null,
      showDetails: false,
      retryCount: s.retryCount + 1,
    }));
  };

  toggleDetails = () => {
    this.setState((s) => ({ showDetails: !s.showDetails }));
  };

  handleReport = () => {
    const { error, componentStack } = this.state;
    const label = this.props.label ?? 'panel';
    const title = encodeURIComponent(
      `[Bug] ${label} crashed: ${error?.message?.slice(0, 80) ?? 'Unknown error'}`
    );
    const body = encodeURIComponent(
      [
        '**Panel:** ' + label,
        '',
        '**Error message:**',
        '```',
        error?.message ?? 'Unknown',
        '```',
        '',
        '**Stack trace:**',
        '```',
        error?.stack?.slice(0, 2000) ?? '(none)',
        '```',
        '',
        '**Component stack:**',
        '```',
        componentStack?.slice(0, 2000) ?? '(none)',
        '```',
        '',
        '_Reported from PadhAI error boundary._',
      ].join('\n')
    );
    const url = `https://github.com/Aditya-cyber-hind/PadhAI/issues/new?title=${title}&body=${body}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const label = this.props.label ?? 'This panel';
    const { error, componentStack, showDetails } = this.state;

    return (
      <div className="h-full w-full flex items-center justify-center p-6 bg-stone-50/50">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl shadow-sm p-6 text-center">
          {/* Icon badge */}
          <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h2 className="font-display text-lg font-bold text-stone-900 mb-1">
            {label} ran into a problem
          </h2>
          <p className="text-sm text-stone-500 mb-5">
            Your data is safe. Try again — if it keeps happening, you can report it.
          </p>

          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium shadow-sm hover:bg-accent-600 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={this.handleReport}
              className="px-4 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors"
            >
              Report issue
            </button>
          </div>

          {error && (
            <div className="text-left">
              <button
                onClick={this.toggleDetails}
                className="text-[11px] text-stone-400 hover:text-stone-700 transition-colors mx-auto block"
              >
                {showDetails ? '▾ Hide details' : '▸ Show details'}
              </button>
              {showDetails && (
                <pre className="mt-2 max-h-48 overflow-auto p-3 rounded-lg bg-stone-50 border border-stone-200 text-[10px] font-mono text-stone-600 whitespace-pre-wrap break-words">
                  {error.message}
                  {error.stack ? '\n\n' + error.stack.split('\n').slice(0, 8).join('\n') : ''}
                  {componentStack ? '\n\n' + componentStack.split('\n').slice(0, 5).join('\n') : ''}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}