'use client';

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ComprehensiveSearch } from '@/components/search/comprehensive-search';
import { LoadingSpinner } from '@/components/ui/loading';

function SearchPageContent() {
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
              Search Agents
            </h1>
            <p className="text-xl text-muted-foreground">
              Discover the perfect sub-agents for your workflow with our advanced search and filtering system
            </p>
          </div>

          {/* Comprehensive Search Component */}
          <ComprehensiveSearch showSidebar={true} />
        </motion.div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SearchPageContent />
    </Suspense>
  );
}