'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import Link from 'next/link';

export function GitHubStars() {
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStars() {
      try {
        const response = await fetch('https://api.github.com/repos/augmnt/subagents.sh');
        if (response.ok) {
          const data = await response.json();
          setStars(data.stargazers_count);
        }
      } catch (error) {
        console.error('Failed to fetch GitHub stars:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStars();
  }, []);

  if (loading) {
    return (
      <Link
        href="https://github.com/augmnt/subagents.sh"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
      >
        <Star className="h-4 w-4" />
        <span>Star</span>
      </Link>
    );
  }

  return (
    <Link
      href="https://github.com/augmnt/subagents.sh"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
    >
      <Star className="h-4 w-4" />
      <span>{stars ? stars.toLocaleString() : 'Star'}</span>
    </Link>
  );
}