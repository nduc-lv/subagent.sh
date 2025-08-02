'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  X, 
  Star, 
  Calendar, 
  Tag, 
  Code, 
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  TrendingUp,
  Award
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { SearchFilters, SearchFacets } from '@/types';

interface AdvancedFiltersProps {
  filters: SearchFilters;
  facets: SearchFacets | null;
  onFilterChange: (key: keyof SearchFilters, value: any) => void;
  onClearFilters: () => void;
  onSaveSearch?: (name: string) => void;
  className?: string;
}

interface FilterSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: number | string;
}

function FilterSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultExpanded = true, 
  badge 
}: FilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{title}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t"
          >
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TagCloudProps {
  tags: Array<{ name: string; count: number }>;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  maxTags?: number;
}

function TagCloud({ tags, selectedTags, onTagToggle, maxTags = 20 }: TagCloudProps) {
  const [showAll, setShowAll] = useState(false);
  const displayTags = showAll ? tags : tags.slice(0, maxTags);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {displayTags.map(tag => (
          <Badge
            key={tag.name}
            variant={selectedTags.includes(tag.name) ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              "hover:bg-terminal-green hover:text-terminal-green-foreground",
              selectedTags.includes(tag.name) && "bg-terminal-green text-terminal-green-foreground"
            )}
            onClick={() => onTagToggle(tag.name)}
          >
            <Tag className="w-3 h-3 mr-1" />
            {tag.name}
            <span className="ml-1 text-xs opacity-75">({tag.count})</span>
          </Badge>
        ))}
      </div>
      
      {tags.length > maxTags && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full"
        >
          {showAll ? 'Show less' : `Show ${tags.length - maxTags} more`}
        </Button>
      )}
    </div>
  );
}

export function AdvancedFilters({
  filters,
  facets,
  onFilterChange,
  onClearFilters,
  onSaveSearch,
  className
}: AdvancedFiltersProps) {
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveSearch, setShowSaveSearch] = useState(false);

  const hasActiveFilters = !!(
    filters.category ||
    (filters.tags && filters.tags.length > 0) ||
    filters.language ||
    filters.framework ||
    filters.ratingMin ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.featured
  );

  const activeFilterCount = [
    filters.category,
    filters.tags && filters.tags.length > 0,
    filters.language,
    filters.framework,
    filters.ratingMin,
    filters.dateFrom,
    filters.dateTo,
    filters.featured
  ].filter(Boolean).length;

  const handleSaveSearch = () => {
    if (onSaveSearch && saveSearchName.trim()) {
      onSaveSearch(saveSearchName.trim());
      setSaveSearchName('');
      setShowSaveSearch(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h2 className="font-semibold">Filters</h2>
          {activeFilterCount > 0 && (
            <Badge variant="default" className="bg-terminal-green">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterChange('featured', !filters.featured)}
          className={cn(
            "flex-1",
            filters.featured && "bg-terminal-green/10 border-terminal-green text-terminal-green"
          )}
        >
          <Star className="h-4 w-4 mr-1" />
          Featured
        </Button>
        
        {onSaveSearch && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveSearch(!showSaveSearch)}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        )}
      </div>

      {/* Save Search */}
      <AnimatePresence>
        {showSaveSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2"
          >
            <Input
              placeholder="Search name..."
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim()}
                className="flex-1"
              >
                Save Search
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveSearch(false)}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Filter */}
      <FilterSection
        title="Rating"
        icon={Star}
        badge={filters.ratingMin ? `${filters.ratingMin}+` : undefined}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Minimum Rating</Label>
            <span className="text-sm text-muted-foreground">
              {filters.ratingMin || 0}+ stars
            </span>
          </div>
          <Slider
            value={[filters.ratingMin || 0]}
            onValueChange={([value]) => onFilterChange('ratingMin', value || undefined)}
            max={5}
            min={0}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Any</span>
            <span>5 stars</span>
          </div>
        </div>
      </FilterSection>

      {/* Categories */}
      {facets?.categories && (
        <FilterSection
          title="Categories"
          icon={Layers}
          badge={filters.category ? 1 : undefined}
        >
          <div className="space-y-2">
            <button
              onClick={() => onFilterChange('category', undefined)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                "hover:bg-muted",
                !filters.category && "bg-terminal-green/10 text-terminal-green font-medium"
              )}
            >
              All Categories
            </button>
            {facets.categories.map(category => (
              <button
                key={category.value}
                onClick={() => onFilterChange('category', 
                  filters.category === category.value ? undefined : category.value
                )}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  "hover:bg-muted",
                  filters.category === category.value && 
                    "bg-terminal-green/10 text-terminal-green font-medium"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{category.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {category.count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </FilterSection>
      )}


      {/* Frameworks */}
      {facets?.frameworks && facets.frameworks.length > 0 && (
        <FilterSection
          title="Frameworks"
          icon={Layers}
          badge={filters.framework ? 1 : undefined}
        >
          <div className="space-y-2">
            {facets.frameworks.slice(0, 10).map(framework => (
              <label
                key={framework.name}
                className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
              >
                <Checkbox
                  checked={filters.framework === framework.name}
                  onCheckedChange={(checked) => 
                    onFilterChange('framework', checked ? framework.name : undefined)
                  }
                />
                <span className="flex-1 text-sm">{framework.name}</span>
                <span className="text-xs text-muted-foreground">
                  {framework.count}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Tags */}
      {facets?.tags && facets.tags.length > 0 && (
        <FilterSection
          title="Tags"
          icon={Tag}
          badge={filters.tags?.length || undefined}
        >
          <TagCloud
            tags={facets.tags}
            selectedTags={filters.tags || []}
            onTagToggle={(tag) => {
              const currentTags = filters.tags || [];
              const newTags = currentTags.includes(tag)
                ? currentTags.filter(t => t !== tag)
                : [...currentTags, tag];
              onFilterChange('tags', newTags);
            }}
          />
        </FilterSection>
      )}

      {/* Date Range */}
      <FilterSection
        title="Date Range"
        icon={Calendar}
        badge={filters.dateFrom || filters.dateTo ? 1 : undefined}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="date-from" className="text-sm">From</Label>
            <Input
              id="date-from"
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => onFilterChange('dateFrom', e.target.value || undefined)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="date-to" className="text-sm">To</Label>
            <Input
              id="date-to"
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => onFilterChange('dateTo', e.target.value || undefined)}
              className="mt-1"
            />
          </div>
          {(filters.dateFrom || filters.dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onFilterChange('dateFrom', undefined);
                onFilterChange('dateTo', undefined);
              }}
              className="w-full"
            >
              Clear Date Range
            </Button>
          )}
        </div>
      </FilterSection>
    </div>
  );
}