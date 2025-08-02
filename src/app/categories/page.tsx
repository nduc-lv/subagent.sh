'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ArrowRight,
  Code,
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
  Users,
  Zap,
  Grid3x3,
  TrendingUp,
  Sparkles,
  SortAsc
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCategories } from '@/hooks/use-database';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Icon mapping for categories
const iconMap: Record<string, React.ComponentType<any>> = {
  'web-development': Globe,
  'data-science': BarChart3,
  'devops': Server,
  'api-tools': Settings,
  'testing': CheckSquare,
  'documentation': BookOpen,
  'development-tools': Code,
  'mobile-development': Rocket,
  'ai-ml': Brain,
  'security': Shield,
  'database': Database,
  'design': Palette,
  'analytics': BarChart3,
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
  'web-scraping': Globe,
  'data-processing': Server,
  'ui-ux': Palette,
};

// Color mapping for category icons
const colorMap: Record<string, string> = {
  'web-development': 'text-blue-500',
  'data-science': 'text-green-500',
  'devops': 'text-purple-500',
  'api-tools': 'text-orange-500',
  'testing': 'text-red-500',
  'documentation': 'text-indigo-500',
  'development-tools': 'text-pink-500',
  'mobile-development': 'text-teal-500',
  'ai-ml': 'text-cyan-500',
  'security': 'text-amber-500',
  'database': 'text-emerald-500',
  'design': 'text-violet-500',
  'analytics': 'text-lime-500',
  'automation': 'text-yellow-500',
  'blockchain': 'text-orange-600',
  'communication': 'text-blue-600',
  'content-management': 'text-purple-600',
  'ecommerce': 'text-green-600',
  'education': 'text-indigo-600',
  'finance': 'text-emerald-600',
  'gaming': 'text-pink-600',
  'healthcare': 'text-red-600',
  'iot': 'text-teal-600',
  'productivity': 'text-amber-600',
  'utilities': 'text-gray-500',
  'web-scraping': 'text-blue-400',
  'data-processing': 'text-green-400',
  'ui-ux': 'text-purple-400',
};

// Category descriptions
const categoryDescriptions: Record<string, string> = {
  'web-development': 'Build modern web applications with cutting-edge frameworks and tools',
  'data-science': 'Analyze, visualize, and extract insights from complex datasets',
  'devops': 'Streamline deployment, monitoring, and infrastructure management',
  'api-tools': 'Design, test, and manage APIs with powerful development tools',
  'testing': 'Ensure code quality with comprehensive testing and QA solutions',
  'documentation': 'Create clear, maintainable documentation for your projects',
  'development-tools': 'Enhance your coding workflow with productivity-boosting utilities',
  'mobile-development': 'Build native and cross-platform mobile applications',
  'ai-ml': 'Leverage artificial intelligence and machine learning capabilities',
  'security': 'Protect applications and data with security-focused tools',
  'database': 'Manage, query, and optimize database operations efficiently',
  'design': 'Create stunning user interfaces and visual experiences',
  'analytics': 'Track performance and gain insights from user behavior',
  'automation': 'Automate repetitive tasks and workflows for efficiency',
  'blockchain': 'Develop decentralized applications and smart contracts',
  'communication': 'Enable seamless communication and collaboration features',
  'content-management': 'Manage and organize digital content effectively',
  'ecommerce': 'Build and optimize online stores and payment systems',
  'education': 'Create engaging learning experiences and educational tools',
  'finance': 'Develop financial applications and payment processing solutions',
  'gaming': 'Build interactive games and entertainment applications',
  'healthcare': 'Develop healthcare solutions and medical applications',
  'iot': 'Connect and manage Internet of Things devices and sensors',
  'productivity': 'Boost efficiency with workflow and task management tools',
  'utilities': 'Essential utilities and helper tools for development',
  'web-scraping': 'Extract and process data from websites efficiently',
  'data-processing': 'Transform and manipulate data for analysis and insights',
  'ui-ux': 'Design exceptional user interfaces and experiences',
};

export default function CategoriesPage() {
  const { categories, loading } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count'>('count');

  // Filter and sort categories
  const filteredAndSortedCategories = useMemo(() => {
    const filtered = categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryDescriptions[category.slug]?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return (b.agent_count || 0) - (a.agent_count || 0);
      }
    });
  }, [categories, searchTerm, sortBy]);

  // Calculate total agents across all categories
  const totalAgents = categories.reduce((sum, cat) => sum + (cat.agent_count || 0), 0);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-16 pb-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-muted/20 pointer-events-none" />
        <div className="relative container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Grid3x3 className="w-8 h-8 text-primary" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-terminal-green via-blue-500 to-purple-500 bg-clip-text text-transparent leading-tight py-2">
              Agent Categories
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
              Explore our comprehensive collection of sub-agent categories. From web development to AI/ML, 
              find the perfect tools to enhance your development workflow.
            </p>

            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>{categories.length} Categories</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>{totalAgents}+ Agents</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Growing Daily</span>
              </div>
            </div>

            <Button size="lg" asChild>
              <Link href="/agents">
                <Search className="mr-2 h-4 w-4" />
                Browse All Agents
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          {/* Search and Filter Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="max-w-2xl mx-auto mb-12"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 blur-xl group-hover:blur-2xl transition-all duration-500 opacity-70" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 text-base bg-background/95 backdrop-blur-sm border-muted-foreground/20 hover:border-muted-foreground/30 focus:border-primary transition-colors shadow-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'count' ? 'default' : 'outline'}
                  onClick={() => setSortBy('count')}
                  className="h-12 px-4"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  By Count
                </Button>
                <Button
                  variant={sortBy === 'name' ? 'default' : 'outline'}
                  onClick={() => setSortBy('name')}
                  className="h-12 px-4"
                >
                  <SortAsc className="h-4 w-4 mr-2" />
                  By Name
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="pt-16 pb-24 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-muted/8 to-purple-500/5 pointer-events-none" />
        <div className="relative container mx-auto px-4 max-w-7xl">
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                >
                  <Card className="h-full animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-4/5" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10" />
                        </div>
                      </div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!loading && (
            <AnimatePresence mode="wait">
              <motion.div
                key={searchTerm + sortBy}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredAndSortedCategories.map((category, index) => {
                  const IconComponent = iconMap[category.slug] || Code;
                  const iconColor = colorMap[category.slug] || 'text-primary';
                  const description = categoryDescriptions[category.slug] || 'Discover powerful tools and utilities for this category.';

                  return (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.5 }}
                    >
                      <Link href={`/categories/${category.slug}`} className="block group h-full">
                        <Card className="h-full border border-border/60 bg-gradient-to-br from-card/80 via-card to-card/95 backdrop-blur-sm hover:bg-card hover:border-border/80 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group-hover:translate-y-[-4px]">
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          <CardContent className="relative p-6 h-full flex flex-col">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="relative">
                                <div className={cn(
                                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                                  "bg-gradient-to-br from-background/80 to-muted/40 border border-border/30 group-hover:border-primary/30"
                                )}>
                                  <IconComponent className={cn("h-6 w-6 transition-all duration-300", iconColor)} />
                                </div>
                                <div className={cn(
                                  "absolute inset-0 rounded-full opacity-10 scale-150 group-hover:scale-[2] transition-transform duration-500 pointer-events-none",
                                  iconColor
                                )} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors duration-300 truncate">
                                  {category.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs font-medium bg-primary/10 text-primary border-0"
                                  >
                                    {category.agent_count || 0} agents
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                              {description}
                            </p>
                            
                            <div className="flex items-center justify-end pt-2">
                              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0">
                                <ArrowRight className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}

          {/* No Results State */}
          {!loading && filteredAndSortedCategories.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-24"
            >
              <Card className="max-w-md mx-auto backdrop-blur-md bg-muted/5 border-border/30">
                <CardContent className="p-12">
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-20 h-20 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    <Search className="w-10 h-10 text-primary" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold mb-4">No categories found</h3>
                  <p className="text-muted-foreground mb-8 text-lg">
                    Try adjusting your search terms to find what you're looking for.
                  </p>
                  
                  <Button 
                    onClick={() => setSearchTerm('')}
                    variant="outline"
                  >
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 pointer-events-none" />
        <div className="relative container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Find Your Perfect Agents?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Explore thousands of specialized sub-agents across all categories to supercharge your development workflow.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/agents">
                  <Search className="mr-2 h-4 w-4" />
                  Browse All Agents
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/submit">
                  <Zap className="mr-2 h-4 w-4" />
                  Submit Your Agent
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}