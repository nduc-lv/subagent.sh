'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AgentCard } from '@/components/ui/agent-card';

interface FeaturedAgent {
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
  featured: boolean;
  verified: boolean;
  authorAvatar?: string;
  authorGitHubUrl?: string;
  isGitHubAuthor: boolean;
}

interface FeaturedAgentsSectionProps {
  featuredAgents: FeaturedAgent[];
}

export function FeaturedAgentsSection({ featuredAgents }: FeaturedAgentsSectionProps) {
  return (
    <section className="pt-12 sm:pt-16 md:pt-20 pb-12 sm:pb-16 md:pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Featured Sub-Agents</h2>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/agents">View All</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredAgents.slice(0, 3).map((agent) => (
            <AgentCard
              key={agent.id}
              id={agent.id}
              title={agent.title}
              description={agent.description}
              author={agent.author}
              authorUsername={agent.authorUsername}
              category={agent.category}
              tags={agent.tags}
              rating={agent.rating}
              downloads={agent.downloads}
              views={agent.views}
              forks={agent.forks}
              lastUpdated={agent.lastUpdated}
              featured={agent.featured}
              verified={agent.verified}
              authorAvatar={agent.authorAvatar}
              authorGitHubUrl={agent.authorGitHubUrl}
              isGitHubAuthor={agent.isGitHubAuthor}
              onClick={() => window.location.href = `/agents/${agent.id}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}