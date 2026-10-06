"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white font-sans">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-black">Application Error</h1>
          <p className="text-xs text-slate-400">
            A critical system error occurred. Please refresh or try again.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
