'use client';

interface Props {
  /** Which shape to render */
  variant?: 'list' | 'card' | 'chat';
  /** How many rows/cards to show */
  rows?: number;
  /** Optional status message shown below the skeleton */
  status?: string;
}

function ShimmerBar({
  className = 'w-full',
  height = 'h-3',
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div className={`${height} rounded-md bg-stone-100 overflow-hidden relative ${className}`}>
      <div
        className="absolute inset-0 -translate-x-full animate-[padhai-shimmer_1.6s_infinite]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.15) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}

export default function PanelSkeleton({
  variant = 'list',
  rows = 3,
  status,
}: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <style>{`
        @keyframes padhai-shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Header skeleton — small heading + subtitle */}
        <header className="mb-4 sm:mb-6">
          <ShimmerBar className="w-40" height="h-6" />
          <div className="mt-2">
            <ShimmerBar className="w-56" />
          </div>
        </header>

        {/* Body */}
        {variant === 'card' && (
          <div className="bg-white border border-stone-200 rounded-lg p-6 sm:p-8 space-y-5">
            <ShimmerBar className="w-2/3" height="h-7" />
            <div className="space-y-2">
              <ShimmerBar className="w-full" height="h-4" />
              <ShimmerBar className="w-5/6" height="h-4" />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="space-y-3 pt-4 border-t border-stone-100">
                <ShimmerBar className="w-1/3" height="h-5" />
                <ShimmerBar className="w-full" />
                <ShimmerBar className="w-11/12" />
                <ShimmerBar className="w-4/5" />
              </div>
            ))}
          </div>
        )}

        {variant === 'list' && (
          <div className="space-y-2 sm:space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5"
              >
                <ShimmerBar className="w-1/2" height="h-4" />
                <div className="mt-2.5">
                  <ShimmerBar className="w-2/3" height="h-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {variant === 'chat' && (
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div
                key={i}
                className={`p-3 sm:p-4 rounded-lg border ${
                  i % 2 === 0
                    ? 'bg-accent-50/40 border-accent-100 ml-auto max-w-md'
                    : 'bg-white border-stone-200 max-w-lg'
                }`}
              >
                <ShimmerBar className="w-24 mb-2" height="h-2.5" />
                <div className="space-y-2">
                  <ShimmerBar className="w-full" />
                  <ShimmerBar className="w-5/6" />
                  {i % 2 === 1 && <ShimmerBar className="w-4/6" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {status && (
          <p className="text-center text-xs text-stone-400 italic mt-6">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}