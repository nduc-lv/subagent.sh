'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Star, Shield, Award } from 'lucide-react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface RatingProps {
  value: number;
  maxValue?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  verified?: boolean;
  featured?: boolean;
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  ({
    value,
    maxValue = 5,
    size = 'md',
    showValue = true,
    showCount = false,
    count,
    verified = false,
    featured = false,
    interactive = false,
    onChange,
    className,
    ...props
  }, ref) => {
    const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);
    
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };

    const textSizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };

    const handleStarClick = (starValue: number) => {
      if (interactive && onChange) {
        onChange(starValue);
      }
    };

    const handleStarHover = (starValue: number) => {
      if (interactive) {
        setHoveredValue(starValue);
      }
    };

    const handleMouseLeave = () => {
      if (interactive) {
        setHoveredValue(null);
      }
    };

    const getStarFillPercentage = (starIndex: number): number => {
      const currentValue = hoveredValue !== null ? hoveredValue : value;
      if (currentValue >= starIndex) return 100;
      if (currentValue > starIndex - 1) return (currentValue - (starIndex - 1)) * 100;
      return 0;
    };

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {/* Stars */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: maxValue }, (_, index) => {
            const starIndex = index + 1;
            const fillPercentage = getStarFillPercentage(starIndex);
            
            return (
              <motion.div
                key={index}
                className="relative"
                whileHover={interactive ? { scale: 1.1 } : undefined}
                whileTap={interactive ? { scale: 0.95 } : undefined}
              >
                <Star
                  className={cn(
                    sizeClasses[size],
                    "text-muted-foreground transition-all duration-200",
                    interactive && "cursor-pointer hover:text-yellow-400"
                  )}
                  onClick={() => handleStarClick(starIndex)}
                  onMouseEnter={() => handleStarHover(starIndex)}
                />
                
                {/* Filled portion */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ width: `${fillPercentage}%` }}
                >
                  <Star
                    className={cn(
                      sizeClasses[size],
                      "fill-yellow-400 text-yellow-400"
                    )}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Rating Value */}
        {showValue && (
          <span className={cn(
            "font-mono font-semibold text-foreground",
            textSizeClasses[size]
          )}>
            {(hoveredValue !== null ? hoveredValue : value).toFixed(1)}
          </span>
        )}

        {/* Rating Count */}
        {showCount && count !== undefined && (
          <span className={cn(
            "text-muted-foreground",
            textSizeClasses[size]
          )}>
            ({count.toLocaleString()})
          </span>
        )}

        {/* Verification Badges */}
        <div className="flex items-center gap-1">
          {verified && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Badge variant="terminal" className="gap-1 text-xs">
                <Shield className="h-3 w-3" />
                VERIFIED
              </Badge>
            </motion.div>
          )}
          
          {featured && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Badge variant="outline" className="gap-1 text-xs border-yellow-400 text-yellow-600">
                <Award className="h-3 w-3" />
                FEATURED
              </Badge>
            </motion.div>
          )}
        </div>
      </div>
    );
  }
);

Rating.displayName = 'Rating';

// Star rating input component for forms
interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  maxValue?: number;
  size?: 'sm' | 'md' | 'lg';
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const StarRatingInput = React.forwardRef<HTMLDivElement, StarRatingInputProps>(
  ({
    value,
    onChange,
    maxValue = 5,
    size = 'md',
    required = false,
    disabled = false,
    className,
    ...props
  }, ref) => {
    const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);
    
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8'
    };

    const handleStarClick = (starValue: number) => {
      if (!disabled) {
        onChange(starValue);
      }
    };

    const handleStarHover = (starValue: number) => {
      if (!disabled) {
        setHoveredValue(starValue);
      }
    };

    const handleMouseLeave = () => {
      setHoveredValue(null);
    };

    const getStarState = (starIndex: number) => {
      const currentValue = hoveredValue !== null ? hoveredValue : value;
      return currentValue >= starIndex;
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-1",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {Array.from({ length: maxValue }, (_, index) => {
          const starIndex = index + 1;
          const isActive = getStarState(starIndex);
          
          return (
            <motion.button
              key={index}
              type="button"
              disabled={disabled}
              className={cn(
                "focus:outline-none focus:ring-2 focus:ring-terminal-green/50 rounded",
                !disabled && "cursor-pointer"
              )}
              whileHover={!disabled ? { scale: 1.1 } : undefined}
              whileTap={!disabled ? { scale: 0.95 } : undefined}
              onClick={() => handleStarClick(starIndex)}
              onMouseEnter={() => handleStarHover(starIndex)}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  "transition-all duration-200",
                  isActive 
                    ? "fill-yellow-400 text-yellow-400" 
                    : "text-muted-foreground hover:text-yellow-400",
                  disabled && "hover:text-muted-foreground"
                )}
              />
            </motion.button>
          );
        })}
        
        {required && value === 0 && (
          <span className="text-xs text-destructive ml-2">
            Rating required
          </span>
        )}
      </div>
    );
  }
);

StarRatingInput.displayName = 'StarRatingInput';

export { Rating, StarRatingInput, type RatingProps, type StarRatingInputProps };