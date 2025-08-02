'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  Star, 
  Loader2,
  Command,
  ArrowUp
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SearchSuggestion } from '@/types';

interface EnhancedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  suggestions: SearchSuggestion[];
  recentSearches: string[];
  placeholder?: string;
  className?: string;
  showShortcuts?: boolean;
  showSuggestions?: boolean;
}

export function EnhancedSearchBar({
  value,
  onChange,
  onSearch,
  suggestions,
  recentSearches,
  placeholder = "Search agents...",
  className,
  showShortcuts = true,
  showSuggestions = true
}: EnhancedSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Combined suggestions list
  const allSuggestions = React.useMemo(() => {
    const items: Array<{
      type: 'suggestion' | 'recent';
      text: string;
      frequency?: number;
    }> = [];

    // Add search suggestions first
    suggestions.forEach(s => {
      items.push({
        type: 'suggestion',
        text: s.suggestion,
        frequency: s.frequency
      });
    });

    // Add recent searches that don't conflict with suggestions
    const suggestionTexts = new Set(suggestions.map(s => s.suggestion));
    recentSearches.forEach(search => {
      if (!suggestionTexts.has(search) && search.toLowerCase().includes(value.toLowerCase())) {
        items.push({
          type: 'recent',
          text: search
        });
      }
    });

    return items.slice(0, 8); // Limit total suggestions
  }, [suggestions, recentSearches, value]);

  const showDropdown = showSuggestions && isFocused && (value.length > 0 || recentSearches.length > 0);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        if (!showDropdown) return;
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : -1
        );
        break;
      
      case 'ArrowUp':
        if (!showDropdown) return;
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (showDropdown && selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
          const selected = allSuggestions[selectedIndex];
          onChange(selected.text);
          setSelectedIndex(-1);
          setIsFocused(false);
          onSearch();
        } else {
          onSearch();
        }
        break;
      
      case 'Escape':
        setIsFocused(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;

      case 'Tab':
        if (!showDropdown) return;
        if (selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
          e.preventDefault();
          const selected = allSuggestions[selectedIndex];
          onChange(selected.text);
          setSelectedIndex(-1);
        }
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setIsFocused(false);
    setSelectedIndex(-1);
    onSearch();
  };

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [allSuggestions]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    if (showShortcuts) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showShortcuts]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          className={cn(
            "pl-10 pr-16 h-12 text-base",
            "transition-all duration-200",
            isFocused && "ring-2 ring-terminal-green/20 border-terminal-green/30"
          )}
          autoComplete="off"
          spellCheck={false}
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button
            onClick={onSearch}
            className="h-8 px-3"
          >
            <ArrowUp className="h-4 w-4 rotate-45" />
          </Button>
        </div>

        {showShortcuts && !isFocused && (
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
            <Badge variant="outline" className="text-xs font-mono">
              <Command className="h-3 w-3 mr-1" />
              K
            </Badge>
          </div>
        )}
      </div>

      {/* Search Suggestions Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {/* Search Suggestions */}
            {allSuggestions.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                  Suggestions
                </div>
                {allSuggestions.map((item, index) => (
                  <button
                    key={`${item.type}-${item.text}-${index}`}
                    onClick={() => handleSuggestionClick(item.text)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors",
                      "hover:bg-muted focus:bg-muted focus:outline-none",
                      selectedIndex === index && "bg-terminal-green/10 text-terminal-green"
                    )}
                  >
                    {item.type === 'recent' ? (
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    
                    <span className="flex-1 truncate">{item.text}</span>
                    
                    {item.type === 'suggestion' && item.frequency && item.frequency > 1 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {item.frequency}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches (when no input) */}
            {value.length === 0 && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                  Recent searches
                </div>
                {recentSearches.slice(0, 5).map((search, index) => (
                  <button
                    key={`recent-${search}-${index}`}
                    onClick={() => handleSuggestionClick(search)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors",
                      "hover:bg-muted focus:bg-muted focus:outline-none",
                      selectedIndex === index && "bg-terminal-green/10 text-terminal-green"
                    )}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate">{search}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {allSuggestions.length === 0 && value.length > 0 && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No suggestions found
              </div>
            )}

            {/* Keyboard shortcuts help */}
            {showShortcuts && (
              <div className="border-t p-2 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Press Tab to complete</span>
                  <span>&uarr;&darr; to navigate</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}