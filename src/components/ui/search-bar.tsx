'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Filter, 
  ChevronDown,
  Clock,
  Star,
  TrendingUp,
  Command
} from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  suggestions?: string[];
  filters?: Filter[];
  activeFilters?: string[];
  onFilterChange?: (filters: string[]) => void;
  showRecentSearches?: boolean;
  recentSearches?: string[];
  className?: string;
}

interface Filter {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

const SearchBar = React.forwardRef<HTMLDivElement, SearchBarProps>(
  ({
    placeholder = "Search agents...",
    value = "",
    onChange,
    onSubmit,
    suggestions = [],
    filters = [],
    activeFilters = [],
    onFilterChange,
    showRecentSearches = true,
    recentSearches = [],
    className,
    ...props
  }, ref) => {
    const [inputValue, setInputValue] = React.useState(value);
    const [isFocused, setIsFocused] = React.useState(false);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [showFilters, setShowFilters] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange?.(newValue);
      setShowSuggestions(newValue.length > 0 || showRecentSearches);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit?.(inputValue);
      setShowSuggestions(false);
      inputRef.current?.blur();
    };

    const handleSuggestionClick = (suggestion: string) => {
      setInputValue(suggestion);
      onChange?.(suggestion);
      onSubmit?.(suggestion);
      setShowSuggestions(false);
      inputRef.current?.blur();
    };

    const handleFilterToggle = (filterId: string) => {
      const newFilters = activeFilters.includes(filterId)
        ? activeFilters.filter(f => f !== filterId)
        : [...activeFilters, filterId];
      onFilterChange?.(newFilters);
    };

    const removeFilter = (filterId: string) => {
      const newFilters = activeFilters.filter(f => f !== filterId);
      onFilterChange?.(newFilters);
    };

    const clearSearch = () => {
      setInputValue("");
      onChange?.("");
      inputRef.current?.focus();
    };

    React.useEffect(() => {
      setInputValue(value);
    }, [value]);

    return (
      <div ref={ref} className={cn("relative w-full", className)} {...props}>
        {/* Search Input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className={cn(
            "relative flex items-center rounded-lg border bg-background transition-all duration-200",
            "focus-within:border-terminal-green/50 focus-within:ring-2 focus-within:ring-terminal-green/20",
            isFocused && "border-terminal-green/50 ring-2 ring-terminal-green/20"
          )}>
            <Search className="ml-3 h-4 w-4 text-muted-foreground" />
            
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => {
                setIsFocused(true);
                setShowSuggestions(inputValue.length > 0 || showRecentSearches);
              }}
              onBlur={() => {
                setIsFocused(false);
                // Delay hiding suggestions to allow clicks
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder={placeholder}
              className={cn(
                "flex-1 bg-transparent px-3 py-3 text-sm font-mono placeholder:text-muted-foreground",
                "focus:outline-none"
              )}
            />

            <div className="flex items-center gap-1 pr-3">
              {inputValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={clearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}

              {filters.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 gap-1",
                    showFilters && "bg-terminal-green/10 text-terminal-green"
                  )}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-3 w-3" />
                  Filters
                  <ChevronDown className={cn(
                    "h-3 w-3 transition-transform",
                    showFilters && "rotate-180"
                  )} />
                </Button>
              )}

              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>
          </div>
        </form>

        {/* Active Filters */}
        <AnimatePresence>
          {activeFilters.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex flex-wrap gap-1"
            >
              {activeFilters.map((filterId) => {
                const filter = filters.find(f => f.id === filterId);
                if (!filter) return null;
                
                return (
                  <motion.div
                    key={filterId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge
                      variant="terminal"
                      className="gap-1 cursor-pointer hover:bg-terminal-green/20"
                      onClick={() => removeFilter(filterId)}
                    >
                      {filter.icon}
                      {filter.label}
                      <X className="h-3 w-3" />
                    </Badge>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Dropdown */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-full z-50 rounded-lg border bg-popover p-2 shadow-lg"
            >
              <div className="grid grid-cols-2 gap-1">
                {filters.map((filter) => (
                  <Button
                    key={filter.id}
                    variant={activeFilters.includes(filter.id) ? "terminal" : "ghost"}
                    size="sm"
                    className="justify-start gap-2"
                    onClick={() => handleFilterToggle(filter.id)}
                  >
                    {filter.icon}
                    <span>{filter.label}</span>
                    {filter.count && (
                      <Badge variant="ghost" className="ml-auto text-xs">
                        {filter.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (isFocused || inputValue) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-full z-40 rounded-lg border bg-popover shadow-lg overflow-hidden"
            >
              {/* Recent Searches */}
              {showRecentSearches && recentSearches.length > 0 && !inputValue && (
                <div className="p-3 border-b">
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Recent searches
                  </div>
                  <div className="space-y-1">
                    {recentSearches.slice(0, 5).map((search, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-2 py-1 text-sm rounded hover:bg-accent transition-colors"
                        onClick={() => handleSuggestionClick(search)}
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && inputValue && (
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Suggestions
                  </div>
                  <div className="space-y-1">
                    {suggestions.slice(0, 8).map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-2 py-1 text-sm rounded hover:bg-accent transition-colors"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {inputValue && suggestions.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No suggestions found
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';

export { SearchBar, type SearchBarProps, type Filter };