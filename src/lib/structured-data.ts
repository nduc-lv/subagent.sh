import { Agent, Profile, Category, Review } from '@/types';

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export function generateAgentStructuredData(
  agent: Agent & { 
    profiles?: Profile; 
    categories?: Category;
    reviews?: Review[];
  }
): StructuredData {
  const author = agent.profiles;
  const category = agent.categories;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: agent.name,
    description: agent.description,
    url: `https://subagents.sh/agents/${agent.id}`,
    author: {
      '@type': 'Person',
      name: author?.full_name || author?.username || 'Unknown Author',
      url: author?.username ? `https://subagents.sh/user/${author.username}` : undefined,
      image: author?.avatar_url,
    },
    applicationCategory: category?.name || 'Developer Tools',
    applicationSubCategory: 'Claude Code Sub-Agent',
    operatingSystem: 'Cross-platform',
    programmingLanguage: 'TypeScript',
    keywords: agent.tags.join(', '),
    dateCreated: agent.created_at,
    dateModified: agent.updated_at,
    version: agent.version,
    downloadUrl: agent.github_url,
    codeRepository: agent.github_url,
    aggregateRating: agent.rating_count > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: agent.rating_average,
      ratingCount: agent.rating_count,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/DownloadAction',
        userInteractionCount: agent.download_count,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ViewAction',
        userInteractionCount: agent.view_count,
      },
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };
}

export function generatePersonStructuredData(
  profile: Profile & {
    agentCount?: number;
    totalDownloads?: number;
  }
): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.full_name || profile.username,
    alternateName: profile.username,
    description: profile.bio,
    url: `https://subagents.sh/user/${profile.username}`,
    image: profile.avatar_url,
    location: profile.location,
    sameAs: [
      profile.website_url,
      profile.github_username ? `https://github.com/${profile.github_username}` : undefined,
      profile.twitter_username ? `https://twitter.com/${profile.twitter_username}` : undefined,
    ].filter(Boolean),
    knowsAbout: [
      'Claude Code',
      'AI Development',
      'Automation',
      'Programming',
    ],
    jobTitle: 'Developer',
    worksFor: {
      '@type': 'Organization',
      name: 'Open Source Community',
    },
    creator: profile.agentCount ? {
      '@type': 'CreativeWork',
      name: `${profile.agentCount} Claude Code Sub-Agents`,
      description: `Created ${profile.agentCount} sub-agents with ${profile.totalDownloads || 0} total downloads`,
    } : undefined,
  };
}

export function generateCategoryStructuredData(
  category: Category & {
    agents?: Agent[];
  }
): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Agents`,
    description: category.description,
    url: `https://subagents.sh/categories/${category.slug}`,
    about: {
      '@type': 'Thing',
      name: category.name,
      description: category.description,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: category.agent_count,
      itemListElement: category.agents?.slice(0, 10).map((agent, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'SoftwareApplication',
          name: agent.name,
          description: agent.short_description || agent.description,
          url: `https://subagents.sh/agents/${agent.id}`,
        },
      })) || [],
    },
  };
}

export function generateWebsiteStructuredData(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Subagents.sh',
    description: 'Discover and share Claude Code sub-agents to enhance your development workflow',
    url: 'https://subagents.sh',
    publisher: {
      '@type': 'Organization',
      name: 'Subagents.sh',
      url: 'https://subagents.sh',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://subagents.sh/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateBreadcrumbStructuredData(items: Array<{
  name: string;
  url: string;
}>): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}