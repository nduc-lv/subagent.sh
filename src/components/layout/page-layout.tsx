'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
  variant?: 'default' | 'centered' | 'wide';
  animate?: boolean;
}

const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  ({
    children,
    title,
    description,
    showBackButton = false,
    onBack,
    className,
    variant = 'default',
    animate = true,
    ...props
  }, ref) => {
    const containerVariants = {
      initial: { 
        opacity: 0, 
        y: 20,
        filter: 'blur(4px)'
      },
      animate: { 
        opacity: 1, 
        y: 0,
        filter: 'blur(0px)',
        transition: {
          duration: 0.4,
          ease: [0.23, 1, 0.32, 1],
          staggerChildren: 0.1
        }
      },
      exit: { 
        opacity: 0, 
        y: -20,
        filter: 'blur(4px)',
        transition: {
          duration: 0.3,
          ease: [0.23, 1, 0.32, 1]
        }
      }
    };

    const itemVariants = {
      initial: { opacity: 0, y: 20 },
      animate: { 
        opacity: 1, 
        y: 0,
        transition: {
          duration: 0.3,
          ease: [0.23, 1, 0.32, 1]
        }
      }
    };

    const getContainerClasses = () => {
      const base = "min-h-screen pb-16";
      
      switch (variant) {
        case 'centered':
          return cn(base, "container mx-auto px-4 max-w-4xl");
        case 'wide':
          return cn(base, "container mx-auto px-4 max-w-7xl");
        default:
          return cn(base, "container mx-auto px-4 max-w-6xl");
      }
    };

    const content = (
      <div
        ref={ref}
        className={cn(getContainerClasses(), className)}
        {...props}
      >
        {/* Header Section */}
        {(title || description || showBackButton) && (
          <motion.div
            variants={animate ? itemVariants : undefined}
            className="py-8 space-y-4"
          >
            {showBackButton && (
              <motion.button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </motion.button>
            )}
            
            {title && (
              <motion.h1 
                className="text-4xl md:text-5xl font-mono font-bold text-foreground tracking-tight"
                variants={animate ? itemVariants : undefined}
              >
                <span className="text-terminal-green">&gt;</span> {title}
              </motion.h1>
            )}
            
            {description && (
              <motion.p 
                className="text-lg text-muted-foreground max-w-3xl"
                variants={animate ? itemVariants : undefined}
              >
                {description}
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Main Content */}
        <motion.div
          variants={animate ? itemVariants : undefined}
          className="space-y-8"
        >
          {children}
        </motion.div>
      </div>
    );

    if (!animate) {
      return content;
    }

    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {content}
      </motion.div>
    );
  }
);

PageLayout.displayName = 'PageLayout';

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  pageKey: string;
  className?: string;
}

const PageTransition = React.forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ children, pageKey, className, ...props }, ref) => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={pageKey}
          ref={ref}
          initial={{ 
            opacity: 0, 
            x: 300,
            filter: 'blur(4px)'
          }}
          animate={{ 
            opacity: 1, 
            x: 0,
            filter: 'blur(0px)'
          }}
          exit={{ 
            opacity: 0, 
            x: -300,
            filter: 'blur(4px)'
          }}
          transition={{
            type: "tween",
            ease: [0.23, 1, 0.32, 1],
            duration: 0.4
          }}
          className={className}
          {...props}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }
);

PageTransition.displayName = 'PageTransition';

// Section wrapper with staggered animation
interface SectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  delay?: number;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ children, title, description, className, delay = 0, ...props }, ref) => {
    const variants = {
      hidden: { opacity: 0, y: 40 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: {
          duration: 0.5,
          ease: [0.23, 1, 0.32, 1],
          delay,
          staggerChildren: 0.1
        }
      }
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: {
          duration: 0.3,
          ease: [0.23, 1, 0.32, 1]
        }
      }
    };

    return (
      <motion.section
        ref={ref}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className={cn("space-y-6", className)}
        {...props}
      >
        {(title || description) && (
          <motion.div variants={itemVariants} className="space-y-2">
            {title && (
              <h2 className="text-2xl md:text-3xl font-mono font-semibold text-foreground">
                <span className="text-terminal-green">#</span> {title}
              </h2>
            )}
            {description && (
              <p className="text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </motion.div>
        )}
        
        <motion.div variants={itemVariants}>
          {children}
        </motion.div>
      </motion.section>
    );
  }
);

Section.displayName = 'Section';

// Grid container with staggered children
interface AnimatedGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  staggerDelay?: number;
}

const AnimatedGrid = React.forwardRef<HTMLDivElement, AnimatedGridProps>(
  ({ 
    children, 
    columns = 3, 
    gap = 'md', 
    className,
    staggerDelay = 0.1,
    ...props 
  }, ref) => {
    const gridClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    };

    const gapClasses = {
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8'
    };

    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: 0.1
        }
      }
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
          duration: 0.4,
          ease: [0.23, 1, 0.32, 1]
        }
      }
    };

    return (
      <motion.div
        ref={ref}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className={cn(
          'grid',
          gridClasses[columns],
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, index) => (
          <motion.div key={index} variants={itemVariants}>
            {child}
          </motion.div>
        ))}
      </motion.div>
    );
  }
);

AnimatedGrid.displayName = 'AnimatedGrid';

export { 
  PageLayout, 
  PageTransition, 
  Section, 
  AnimatedGrid,
  type PageLayoutProps,
  type PageTransitionProps,
  type SectionProps,
  type AnimatedGridProps
};