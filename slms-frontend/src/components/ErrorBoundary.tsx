// src/components/ErrorBoundary.tsx
import React from "react";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: any }> {
  constructor(props: any) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err: any) {
    return { err };
  }
  componentDidCatch(err: any, info: any) {
    console.error("ErrorBoundary:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="p-6 rounded-xl border bg-white max-w-md text-center">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-gray-600">Please reload the page.</p>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
