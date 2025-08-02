'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  Search, 
  Star, 
  Grid3x3, 
  Tag as TagIcon, 
  Settings, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ActiveFiltersProps {
  hasActiveFilters: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setSearchInput: (value: string) => void;
  featuredOnly: boolean;
  setFeaturedOnly: (value: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  categories: any[];
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  selectedFrameworks: string[];
  toggleFramework: (framework: string) => void;
  clearFilters: () => void;
  onPageChange: (page: number) => void;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  hasActiveFilters,
  searchQuery,
  setSearchQuery,
  setSearchInput,
  featuredOnly,
  setFeaturedOnly,
  selectedCategory,
  setSelectedCategory,
  categories,
  selectedTags,
  toggleTag,
  selectedFrameworks,
  toggleFramework,
  clearFilters,
  onPageChange
}) => {
  if (!hasActiveFilters) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <Card className="backdrop-blur-md bg-card/60 border-border/50">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Active filters:
              </span>
              
              {searchQuery && (
                <Badge variant="secondary" className="gap-2">
                  <Search className="w-3 h-3" />
                  "{searchQuery}"
                  <X
                    className="h-3 w-3 cursor-pointer hover:bg-muted rounded-full p-0.5"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchInput('');
                      onPageChange(1);
                    }}
                  />
                </Badge>
              )}
              
              {featuredOnly && (
                <Badge variant="secondary" className="gap-2">
                  <Star className="w-3 h-3" />
                  Featured
                  <X
                    className="h-3 w-3 cursor-pointer hover:bg-muted rounded-full p-0.5"
                    onClick={() => {
                      setFeaturedOnly(false);
                      onPageChange(1);
                    }}
                  />
                </Badge>
              )}
              
              {selectedCategory && (
                <Badge variant="secondary" className="gap-2">
                  <Grid3x3 className="w-3 h-3" />
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <X
                    className="h-3 w-3 cursor-pointer hover:bg-muted rounded-full p-0.5"
                    onClick={() => {
                      setSelectedCategory('');
                      onPageChange(1);
                    }}
                  />
                </Badge>
              )}
              
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-2">
                  <TagIcon className="w-3 h-3" />
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer hover:bg-muted rounded-full p-0.5"
                    onClick={() => toggleTag(tag)}
                  />
                </Badge>
              ))}
              
              {selectedFrameworks.map(framework => (
                <Badge key={framework} variant="secondary" className="gap-2">
                  <Settings className="w-3 h-3" />
                  {framework}
                  <X
                    className="h-3 w-3 cursor-pointer hover:bg-muted rounded-full p-0.5"
                    onClick={() => toggleFramework(framework)}
                  />
                </Badge>
              ))}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4 mr-1" />
                Clear all
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};