'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  Code, 
  Database, 
  Globe, 
  Bot, 
  Zap, 
  Shield, 
  Search,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  name: string;
  description: string;
  count: number;
  icon?: string;
  featured?: boolean;
  className?: string;
  onClick?: () => void;
}

// Icon mapping for categories
const categoryIcons = {
  terminal: Terminal,
  code: Code,
  database: Database,
  web: Globe,
  ai: Bot,
  automation: Zap,
  security: Shield,
  search: Search,
} as const;

const CategoryCard = React.forwardRef<HTMLDivElement, CategoryCardProps>(
  ({
    name,
    description,
    count,
    icon = 'terminal',
    featured = false,
    className,
    onClick,
    ...props
  }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const IconComponent = categoryIcons[icon as keyof typeof categoryIcons] || Terminal;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ 
          scale: 1.02,
          transition: { duration: 0.2, ease: "easeOut" }
        }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-lg border bg-card p-6 shadow-sm transition-all duration-300",
          "hover:shadow-lg hover:border-terminal-green/50",
          featured && "border-terminal-green/30 bg-gradient-to-br from-card to-terminal-green/5",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        {...props}
      >
        {/* Featured indicator */}
        {featured && (
          <div className="absolute top-3 right-3">
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse" />
          </div>
        )}

        {/* Icon */}
        <div className="mb-4 flex items-center justify-between">
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={{ 
              scale: isHovered ? 1.1 : 1,
              rotate: isHovered ? 5 : 0
            }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg border transition-all duration-300",
              "bg-gradient-to-br from-terminal-green/10 to-terminal-green/5",
              "border-terminal-green/20 group-hover:border-terminal-green/40",
              "group-hover:shadow-lg group-hover:shadow-terminal-green/20"
            )}
          >
            <IconComponent className="h-6 w-6 text-terminal-green" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ 
              opacity: isHovered ? 1 : 0,
              x: isHovered ? 0 : 20
            }}
            transition={{ duration: 0.2 }}
          >
            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-lg font-semibold text-foreground group-hover:text-terminal-green transition-colors">
              {name}
            </h3>
            <Badge variant="ghost" className="text-xs">
              {count} agents
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>

        {/* Terminal-style bottom border */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-terminal-green/0 via-terminal-green to-terminal-green/0"
          initial={{ width: "0%" }}
          animate={{ width: isHovered ? "100%" : "0%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />

        {/* Hover overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-terminal-green/5 to-transparent pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Terminal-style dots pattern */}
        <div className="absolute top-3 left-3 flex gap-1 opacity-30">
          <div className="w-1 h-1 bg-terminal-green rounded-full" />
          <div className="w-1 h-1 bg-terminal-green rounded-full" />
          <div className="w-1 h-1 bg-terminal-green rounded-full" />
        </div>
      </motion.div>
    );
  }
);

CategoryCard.displayName = 'CategoryCard';

export { CategoryCard, type CategoryCardProps };