/**
 * Skeleton Loader Components
 *
 * Animated placeholder content for loading states.
 */

interface SkeletonProps {
  className?: string;
}

// Base skeleton element with animation
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

// Text line skeleton
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

// Card skeleton
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

// List item skeleton
export function SkeletonListItem({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 ${className}`}
      aria-hidden="true"
    >
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// Table row skeleton
export function SkeletonTableRow({ columns = 4, className = '' }: { columns?: number; className?: string }) {
  return (
    <tr className={className} aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Stats card skeleton
export function SkeletonStatsCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}
      aria-hidden="true"
    >
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

// Dashboard grid skeleton
export function SkeletonDashboard() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatsCard key={i} />
        ))}
      </div>
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

// Spec/Fix list skeleton
export function SkeletonSpecList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-label="Loading specifications">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Task list skeleton
export function SkeletonTaskList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-label="Loading tasks">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

// Memory block skeleton
export function SkeletonMemoryBlock({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3">
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}

// Full page loader
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64" role="status" aria-label="Loading page">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 dark:border-gray-700 border-t-indigo-600" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    </div>
  );
}

// Inline loader (for buttons, etc.)
export function InlineLoader({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full ${sizeClasses[size]} border-gray-200 dark:border-gray-700 border-t-current`}
    />
  );
}
