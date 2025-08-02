'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SearchAnalyticsDashboard } from '@/components/search/search-analytics-dashboard';

export default function SearchAnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-terminal-green to-blue-500 bg-clip-text text-transparent">
              Search Analytics
            </h1>
            <p className="text-xl text-muted-foreground">
              Comprehensive insights into search behavior and platform usage
            </p>
          </div>

          {/* Analytics Dashboard */}
          <SearchAnalyticsDashboard />
        </motion.div>
      </div>
    </div>
  );
}