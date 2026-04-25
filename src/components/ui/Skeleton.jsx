import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
      {...props}
    />
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between pb-4">
        <Skeleton className="h-8 w-[150px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-surface-2 h-10 w-full" />
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex p-4 gap-4">
              {Array.from({ length: cols }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="p-6 bg-surface border border-border rounded-2xl space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}
