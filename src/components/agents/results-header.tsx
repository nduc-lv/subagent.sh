'use client';

import React from 'react';
import { 
  Loader2,
  ChevronDown,
  Search,
  Calendar,
  Download,
  Star,
  RefreshCw,
  TrendingUp,
  Grid3x3,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant', icon: Search },
  { value: 'newest', label: 'Newest First', icon: Calendar },
  { value: 'downloads', label: 'Most Downloaded', icon: Download },
  { value: 'rating', label: 'Highest Rated', icon: Star },
  { value: 'updated', label: 'Recently Updated', icon: RefreshCw },
  { value: 'trending', label: 'Trending', icon: TrendingUp },
];

const VIEW_MODES = [
  { value: 'grid', label: 'Grid', icon: Grid3x3 },
  { value: 'list', label: 'List', icon: List },
  { value: 'compact', label: 'Compact', icon: List },
];

interface ResultsHeaderProps {
  loading: boolean;
  resultsCount: number;
  hasActiveFilters: boolean;
  sortBy: string;
  setSortBy: (value: string) => void;
  viewMode: 'grid' | 'list' | 'compact';
  setViewMode: (value: 'grid' | 'list' | 'compact') => void;
  user?: any;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  selectAllAgents: () => void;
  clearSelection: () => void;
  onPageChange: (page: number) => void;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  loading,
  resultsCount,
  hasActiveFilters,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  user,
  isAllSelected,
  isSomeSelected,
  selectAllAgents,
  clearSelection,
  onPageChange
}) => {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {loading && resultsCount === 0 ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </span>
              ) : (
                `${resultsCount} Agent${resultsCount !== 1 ? 's' : ''} Found`
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? 'Filtered results' : 'All available agents'}
            </p>
          </div>
          
          {user && resultsCount > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
              <Checkbox
                checked={isAllSelected}
                indeterminate={isSomeSelected}
                onCheckedChange={(checked) => {
                  if (checked) {
                    selectAllAgents();
                  } else {
                    clearSelection();
                  }
                }}
              />
              <span className="text-sm font-medium">Select all visible</span>
            </div>
          )}
        </div>
      </div>

      {/* Sort and View Controls */}
      <div className="flex items-center justify-end gap-3">
        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[140px]">
              {SORT_OPTIONS.find(opt => opt.value === sortBy)?.icon && (
                React.createElement(SORT_OPTIONS.find(opt => opt.value === sortBy)!.icon, { className: "h-4 w-4 mr-2" })
              )}
              {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || 'Sort'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value);
                    onPageChange(1);
                  }}
                  className={cn(
                    "cursor-pointer",
                    sortBy === option.value && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {option.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[100px]">
              {React.createElement(VIEW_MODES.find(mode => mode.value === viewMode)!.icon, { className: "h-4 w-4 mr-2" })}
              {VIEW_MODES.find(mode => mode.value === viewMode)?.label}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>View Mode</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {VIEW_MODES.map(mode => {
              const Icon = mode.icon;
              return (
                <DropdownMenuItem
                  key={mode.value}
                  onClick={() => setViewMode(mode.value as 'grid' | 'list' | 'compact')}
                  className={cn(
                    "cursor-pointer",
                    viewMode === mode.value && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {mode.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};