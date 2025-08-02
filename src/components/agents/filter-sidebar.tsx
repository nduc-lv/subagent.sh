'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Star, 
  Grid3x3, 
  Code,
  Zap, 
  Sparkles,
  X,
  Globe,
  Server,
  Shield,
  Brain,
  Database,
  Palette,
  BarChart3,
  Settings,
  CheckSquare,
  BookOpen,
  Rocket,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const iconMap: Record<string, any> = {
  'web-scraping': Globe,
  'data-processing': Server,
  'security': Shield,
  'ai-ml': Brain,
  'database': Database,
  'ui-ux': Palette,
  'analytics': BarChart3,
  'api-tools': Settings,
  'testing': CheckSquare,
  'documentation': BookOpen,
  'development-tools': Code,
  'mobile-development': Rocket,
  'design': Palette,
  'automation': Zap,
  'blockchain': CheckSquare,
  'communication': Users,
  'content-management': BookOpen,
  'ecommerce': Globe,
  'education': BookOpen,
  'finance': BarChart3,
  'gaming': Rocket,
  'healthcare': Shield,
  'iot': Server,
  'productivity': Zap,
  'utilities': Code,
};

interface FilterSidebarProps {
  featuredOnly: boolean;
  setFeaturedOnly: (value: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  selectedFrameworks: string[];
  setSelectedFrameworks: (value: string[]) => void;
  categories: any[];
  facets: any;
  onPageChange: (page: number) => void;
  className?: string;
  hideCategoryFilter?: boolean;
}

export const FilterSidebar = React.memo(({
  featuredOnly,
  setFeaturedOnly,
  selectedCategory,
  setSelectedCategory,
  selectedFrameworks,
  setSelectedFrameworks,
  categories,
  facets,
  onPageChange,
  className,
  hideCategoryFilter = false
}: FilterSidebarProps) => (
  <div className={cn("space-y-8", className)}>
    {/* Quick Filters */}
    <div>
      <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        Quick Filters
      </h3>
      <div className="space-y-3">
        <motion.label 
          className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-primary/5 transition-colors group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Checkbox
            checked={featuredOnly}
            onCheckedChange={(checked) => {
              setFeaturedOnly(!!checked);
              onPageChange(1);
            }}
            className="group-hover:border-primary transition-colors"
          />
          <Star className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Featured only</span>
        </motion.label>
      </div>
    </div>

    {/* Categories */}
    {!hideCategoryFilter && (
    <div>
      <h3 className="font-semibold mb-3 text-base flex items-center gap-2">
        <Grid3x3 className="w-4 h-4 text-primary" />
        Categories
      </h3>
      <div className="space-y-1">
        <button
          onClick={() => {
            setSelectedCategory('');
            onPageChange(1);
          }}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
            !selectedCategory
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/50"
          )}
        >
          <Code className="w-4 h-4" />
          <span className="font-medium">All Categories</span>
        </button>
        {categories.map((category) => {
          const IconComponent = iconMap[category.slug] || Code;
          return (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                onPageChange(1);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                selectedCategory === category.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <IconComponent className="w-4 h-4" />
                <span className="font-medium">{category.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {category.agent_count}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
    )}

    {/* Frameworks */}
    {facets?.frameworks && facets.frameworks.length > 0 && (
      <div>
        <h3 className="font-semibold mb-3 text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Frameworks
        </h3>
        <div className="space-y-1">
          {facets.frameworks.slice(0, 8).map((framework: any, index: number) => (
            <label
              key={`${framework.value || 'unknown'}-${index}`}
              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={selectedFrameworks.includes(framework.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedFrameworks([...selectedFrameworks, framework.value]);
                  } else {
                    setSelectedFrameworks(selectedFrameworks.filter(f => f !== framework.value));
                  }
                  onPageChange(1);
                }}
              />
              <span className="text-sm">{framework.value}</span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {framework.count}
              </Badge>
            </label>
          ))}
        </div>
      </div>
    )}

    {/* Clear Filters */}
    {(featuredOnly || selectedCategory || selectedFrameworks.length > 0) && (
      <Button
        variant="outline"
        size="sm"
        className="w-full hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-colors"
        onClick={() => {
          setFeaturedOnly(false);
          setSelectedCategory('');
          setSelectedFrameworks([]);
          onPageChange(1);
        }}
      >
        <X className="w-4 h-4 mr-2" />
        Clear All Filters
      </Button>
    )}
  </div>
));

FilterSidebar.displayName = 'FilterSidebar';