'use client';

import * as React from 'react';
import Link from 'next/link';
import { Star, Eye, GitFork, Calendar, User, Tag, Github, ArrowRight, TrendingUp, Verified } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  id: string;
  title: string;
  description: string;
  author: string;
  authorUsername?: string;
  category: string;
  tags: string[];
  rating: number;
  downloads: number;
  views: number;
  forks: number;
  lastUpdated: string;
  codePreview?: string;
  verified?: boolean;
  featured?: boolean;
  isGitHubAuthor?: boolean;
  authorAvatar?: string;
  authorGitHubUrl?: string;
  className?: string;
  onClick?: () => void;
}

// Generate unique placeholder images for different components
const generatePlaceholderImage = (width: number, height: number, seed?: string) => {
  const baseUrl = 'https://picsum.photos';
  const seedParam = seed ? `?random=${seed}` : `?random=${Math.floor(Math.random() * 1000)}`;
  return `${baseUrl}/${width}/${height}${seedParam}`;
};

const AgentCard = React.forwardRef<HTMLDivElement, AgentCardProps>(
  ({
    id,
    title,
    description,
    author,
    authorUsername,
    category,
    tags,
    rating,
    downloads,
    views,
    forks,
    lastUpdated,
    codePreview,
    verified = false,
    featured = false,
    isGitHubAuthor = false,
    authorAvatar,
    authorGitHubUrl,
    className,
    onClick,
    ...props
  }, ref) => {
    const [showFullCode, setShowFullCode] = React.useState(false);


    // Format stats with clean display
    const formatStat = (value: number) => {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
      return value.toLocaleString();
    };

    return (
      <div
        ref={ref}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-xl transition-all duration-500 h-full flex flex-col",
          "bg-gradient-to-br from-card via-card/98 to-card/95 backdrop-blur-md",
          "border border-border/60 hover:border-border/80",
          "hover:shadow-2xl hover:shadow-primary/15 hover:scale-[1.03]",
          // Featured styling - subtle glow without border
          featured && [
            "shadow-lg shadow-amber-500/20",
            "bg-gradient-to-br from-amber-50/5 via-card/98 to-amber-50/5",
            "hover:shadow-amber-500/30",
          ],
          className
        )}
        onClick={onClick}
        {...props}
      >
        {/* Clean gradient overlay on hover */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          featured && "from-amber-400/10 via-amber-100/5 to-amber-500/10"
        )} />

        {/* Featured corner accent */}
        {featured && (
          <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-amber-400/60" />
        )}

        {/* Card Content */}
        <div className="relative px-4 py-5 flex-1 flex flex-col">
          {/* Header Section */}
          <div className="mb-4">
            <div className="flex items-start justify-between mb-4">
              {/* Category Badge with Featured indicator */}
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/15 text-primary border-0 font-semibold px-3 py-1">
                  {category}
                </Badge>
                {featured && (
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-medium text-amber-600 ml-1">Featured</span>
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-500 stroke-2" />
                <span className="text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold group-hover:text-primary transition-all duration-300 leading-tight mb-3 text-foreground/90">
              {title}
            </h3>
            
            {/* Description */}
            <p className="text-muted-foreground/80 leading-relaxed text-sm mb-4">
              {description.length > 100 ? description.substring(0, 100) + '...' : description}
            </p>
          </div>

          {/* Tags - simplified */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {tags.slice(0, 3).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="text-xs bg-muted/20 hover:bg-muted/40 border-border/30 transition-all duration-300 hover:scale-105"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Footer - simplified */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-4">
              {/* Author */}
              <div className="flex items-center gap-2">
                {authorUsername ? (
                  <Link 
                    href={`/user/${authorUsername}`}
                    className="flex items-center gap-2 hover:scale-105 transition-transform duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-6 h-6 flex-shrink-0">
                      {authorAvatar ? (
                        <img 
                          src={authorAvatar || generatePlaceholderImage(40, 40, author)}
                          alt={author}
                          className="w-full h-full rounded-full border border-border/30 object-cover cursor-pointer hover:border-primary/50"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center cursor-pointer hover:bg-gradient-to-br hover:from-primary/30 hover:to-primary/15">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-foreground/70 truncate max-w-[80px] sm:max-w-[120px] cursor-pointer hover:text-primary transition-colors duration-200">
                      {author}
                    </span>
                  </Link>
                ) : (
                  <>
                    <div className="w-6 h-6 flex-shrink-0">
                      {authorAvatar ? (
                        <img 
                          src={authorAvatar || generatePlaceholderImage(40, 40, author)}
                          alt={author}
                          className="w-full h-full rounded-full border border-border/30 object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-foreground/70 truncate max-w-[80px] sm:max-w-[120px]">
                      {author}
                    </span>
                  </>
                )}
              </div>
              
              {/* Downloads */}
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-medium text-muted-foreground">
                  {formatStat(downloads)}
                </span>
              </div>
            </div>
            
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
            >
              <span className="font-medium">View</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

AgentCard.displayName = 'AgentCard';

export { AgentCard, type AgentCardProps };