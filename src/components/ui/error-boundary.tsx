"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallbackText?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught SplitLedger UI error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-center space-y-4 my-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {this.props.fallbackText || "Something went wrong loading this view"}
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              {this.state.error?.message || "An unexpected UI error occurred."}
            </p>
          </div>
          <Button
            size="sm"
            onClick={this.handleReset}
            className="rounded-xl text-xs gap-1.5 bg-rose-600 text-white hover:bg-rose-700 font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Reloading Component</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
