'use client';

// React performance optimization utilities
import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';

// Higher-order component for memoizing expensive components
export function withPerformance<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  propsAreEqual?: (prevProps: T, nextProps: T) => boolean
) {
  const MemoizedComponent = memo(Component, propsAreEqual);
  MemoizedComponent.displayName = `withPerformance(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

// Custom hook for debounced values
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for throttled callbacks
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]) as T;
}

// Custom hook for optimized event handlers
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps) as T;
}

// Custom hook for intersection observer (lazy loading)
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options.threshold, options.rootMargin]);

  return isIntersecting;
}

// Optimized list component with virtualization
interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = useThrottledCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 16); // 60fps

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            width: '100%',
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={keyExtractor(item, startIndex + index)}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Lazy loading wrapper component
interface LazyComponentProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}

export const LazyComponent = memo(({ 
  children, 
  placeholder = <div>Loading...</div>,
  rootMargin = '50px',
  threshold = 0.1
}: LazyComponentProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref, { rootMargin, threshold });
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isVisible && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [isVisible, hasLoaded]);

  return (
    <div ref={ref}>
      {hasLoaded ? children : placeholder}
    </div>
  );
});

LazyComponent.displayName = 'LazyComponent';

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderStart = useRef(performance.now());
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = performance.now() - renderStart.current;
    
    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(
        `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
      );
    }
    
    renderStart.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
    markRenderStart: () => {
      renderStart.current = performance.now();
    }
  };
}

// Optimized image component with lazy loading
interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  lazy?: boolean;
}

export const OptimizedImage = memo(({
  src,
  alt,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4=',
  lazy = true,
  ...props
}: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = useState(lazy ? placeholder : src);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const isVisible = useIntersectionObserver({ current: imageRef });

  useEffect(() => {
    if (isVisible && lazy && imageSrc === placeholder) {
      setImageSrc(src);
    }
  }, [isVisible, lazy, src, imageSrc, placeholder]);

  return (
    <img
      ref={setImageRef}
      src={imageSrc}
      alt={alt}
      loading={lazy ? 'lazy' : 'eager'}
      {...props}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Skeleton loading component
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}

export const Skeleton = memo(({ 
  width = '100%', 
  height = '1rem',
  className = '',
  variant = 'text'
}: SkeletonProps) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
});

Skeleton.displayName = 'Skeleton';