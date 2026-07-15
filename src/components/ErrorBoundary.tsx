"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-surface border border-border rounded-xl text-center">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-danger-dim flex items-center justify-center mb-4">
            <svg
              width="22"
              height="22"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="text-danger"
            >
              <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5Zm0 6.5a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
            </svg>
          </div>

          {/* Heading */}
          <h2 className="text-foreground text-base font-semibold mb-2">
            Something went wrong
          </h2>

          {/* Error message */}
          {this.state.error?.message && (
            <p className="text-muted text-sm max-w-md mb-6">
              {this.state.error.message}
            </p>
          )}

          {/* Try again button */}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg bg-surface-2 border border-border text-foreground text-sm hover:bg-surface transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
