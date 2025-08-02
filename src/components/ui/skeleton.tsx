'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'terminal';
  animate?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'default', animate = true, ...props }, ref) => {
    const baseClasses = "rounded-md bg-muted";
    
    if (variant === 'terminal') {
      return (
        <motion.div
          ref={ref}
          className={cn(
            baseClasses,
            "border border-terminal-green/20 bg-gradient-to-r from-muted via-terminal-green/5 to-muted",
            className
          )}
          animate={animate ? {
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          } : undefined}
          transition={animate ? {
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          } : undefined}
          style={{
            backgroundSize: '200% 100%'
          }}
          {...props}
        />
      );
    }

    return (
      <motion.div
        ref={ref}
        className={cn(baseClasses, className)}
        animate={animate ? {
          opacity: [0.5, 1, 0.5]
        } : undefined}
        transition={animate ? {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : undefined}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Agent Card Skeleton
const AgentCardSkeleton = React.forwardRef<HTMLDivElement, { className?: string }>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card p-6 space-y-4",
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton variant="terminal" className="h-6 w-48" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        {/* Code Preview */}
        <div className="space-y-2">
          <Skeleton variant="terminal" className="h-16 w-full" />
        </div>

        {/* Tags */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-3 w-12 mx-auto" />
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    );
  }
);

AgentCardSkeleton.displayName = 'AgentCardSkeleton';

// Category Card Skeleton
const CategoryCardSkeleton = React.forwardRef<HTMLDivElement, { className?: string }>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card p-6 space-y-4",
          className
        )}
        {...props}
      >
        {/* Icon and arrow */}
        <div className="flex items-center justify-between">
          <Skeleton variant="terminal" className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton variant="terminal" className="h-6 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }
);

CategoryCardSkeleton.displayName = 'CategoryCardSkeleton';

// Search Bar Skeleton
const SearchBarSkeleton = React.forwardRef<HTMLDivElement, { className?: string }>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        <Skeleton variant="terminal" className="h-12 w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
    );
  }
);

SearchBarSkeleton.displayName = 'SearchBarSkeleton';

// List Skeleton
interface ListSkeletonProps {
  count?: number;
  itemHeight?: string;
  className?: string;
}

const ListSkeleton = React.forwardRef<HTMLDivElement, ListSkeletonProps>(
  ({ count = 5, itemHeight = "h-16", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-3", className)}
        {...props}
      >
        {Array.from({ length: count }, (_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Skeleton variant="terminal" className={cn("w-full", itemHeight)} />
          </motion.div>
        ))}
      </div>
    );
  }
);

ListSkeleton.displayName = 'ListSkeleton';

// Terminal Window Skeleton
const TerminalSkeleton = React.forwardRef<HTMLDivElement, { className?: string }>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card overflow-hidden",
          className
        )}
        {...props}
      >
        {/* Terminal header */}
        <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
          <div className="flex gap-1">
            <Skeleton className="h-3 w-3 rounded-full bg-red-500/20" />
            <Skeleton className="h-3 w-3 rounded-full bg-yellow-500/20" />
            <Skeleton className="h-3 w-3 rounded-full bg-green-500/20" />
          </div>
          <Skeleton className="h-3 w-32" />
        </div>

        {/* Terminal content */}
        <div className="p-4 space-y-2 font-mono text-sm">
          {Array.from({ length: 8 }, (_, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <span className="text-terminal-green">$</span>
              <Skeleton variant="terminal" className={`h-4 w-${Math.floor(Math.random() * 40) + 20}`} />
            </motion.div>
          ))}
          
          {/* Cursor */}
          <div className="flex items-center gap-2">
            <span className="text-terminal-green">$</span>
            <motion.div
              className="w-2 h-4 bg-terminal-green"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        </div>
      </div>
    );
  }
);

TerminalSkeleton.displayName = 'TerminalSkeleton';

export { 
  Skeleton,
  AgentCardSkeleton,
  CategoryCardSkeleton,
  SearchBarSkeleton,
  ListSkeleton,
  TerminalSkeleton,
  type SkeletonProps,
  type ListSkeletonProps
};