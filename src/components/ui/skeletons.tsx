import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard = ({ className }: SkeletonCardProps) => (
  <div className={cn('card-surface p-6 space-y-4', className)}>
    <div className="skeleton-pulse h-4 w-1/3" />
    <div className="skeleton-pulse h-8 w-2/3" />
    <div className="space-y-2">
      <div className="skeleton-pulse h-3 w-full" />
      <div className="skeleton-pulse h-3 w-4/5" />
    </div>
  </div>
);

interface SkeletonTableProps {
  rows?: number;
  className?: string;
}

export const SkeletonTable = ({ rows = 5, className }: SkeletonTableProps) => (
  <div className={cn('card-surface p-4', className)}>
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-border">
        <div className="skeleton-pulse h-3 w-20" />
        <div className="skeleton-pulse h-3 w-24" />
        <div className="skeleton-pulse h-3 w-16" />
        <div className="skeleton-pulse h-3 w-20" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <div className="skeleton-pulse h-4 w-20" />
          <div className="skeleton-pulse h-4 w-24" />
          <div className="skeleton-pulse h-4 w-16" />
          <div className="skeleton-pulse h-4 w-20" />
        </div>
      ))}
    </div>
  </div>
);

interface SkeletonChartProps {
  className?: string;
}

export const SkeletonChart = ({ className }: SkeletonChartProps) => (
  <div className={cn('card-surface p-6', className)}>
    <div className="skeleton-pulse h-4 w-1/4 mb-4" />
    <div className="flex items-end gap-1 h-48">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="skeleton-pulse flex-1"
          style={{ height: `${20 + Math.random() * 80}%` }}
        />
      ))}
    </div>
  </div>
);
