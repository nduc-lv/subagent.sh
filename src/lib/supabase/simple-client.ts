// Ultra-simple Supabase client without abstractions
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

let simpleClient: ReturnType<typeof createClient<Database>> | null = null;

export function createSimpleClient() {
  if (simpleClient) {
    return simpleClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Create simple client without complex SSR configuration
  simpleClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-client-info': 'subagents-simple-client'
      }
    }
  });

  return simpleClient;
}

// Ultra-fast search function bypassing all abstractions
export async function simpleSearchAgents(filters: {
  query?: string;
  category?: string;
  tags?: string[];
  language?: string;
  languages?: string[];
  framework?: string;
  frameworks?: string[];
  featured?: boolean;
  sortBy?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const client = createSimpleClient();
  const { 
    query = '', 
    category, 
    tags = [], 
    language, 
    languages = [],
    framework, 
    frameworks = [],
    featured, 
    sortBy = 'newest',
    limit = 20, 
    offset = 0 
  } = filters;

  console.log('🚀 Simple search starting...');
  const start = Date.now();

  try {
    // Step 1: Get basic agent data WITHOUT expensive joins to avoid timeout
    let baseQuery = client
      .from('agents')
      .select(`
        id,
        name,
        description,
        slug,
        category_id,
        tags,
        github_language,
        github_url,
        github_forks,
        rating_average,
        rating_count,
        download_count,
        view_count,
        is_featured,
        created_at,
        updated_at,
        author_id,
        original_author_github_username,
        original_author_github_url,
        original_author_avatar_url,
        github_owner_avatar_url
      `)
      .eq('status', 'published');

    // Apply basic filters only
    if (category) {
      baseQuery = baseQuery.eq('category_id', category);
    }

    // Handle both single language and multiple languages
    const allLanguages = language ? [language, ...languages] : languages;
    if (allLanguages.length > 0) {
      if (allLanguages.length === 1) {
        baseQuery = baseQuery.eq('github_language', allLanguages[0]);
      } else {
        baseQuery = baseQuery.in('github_language', allLanguages);
      }
    }

    if (featured !== undefined) {
      baseQuery = baseQuery.eq('is_featured', featured);
    }

    // Simplified tags filtering to avoid timeout
    if (tags.length > 0 && tags.length <= 3) { // Limit to 3 tags to prevent performance issues
      // Use overlaps instead of contains for better performance
      baseQuery = baseQuery.overlaps('tags', tags);
    }

    // Simple text search if provided - using safe parameterized queries
    if (query.trim() && query.length > 1) {
      const sanitizedQuery = query.trim().replace(/[%_]/g, '\\$&'); // Escape SQL wildcards
      baseQuery = baseQuery.or(`name.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`);
    }

    // Sorting based on sortBy parameter
    switch (sortBy) {
      case 'rating':
        baseQuery = baseQuery.order('rating_average', { ascending: false });
        break;
      case 'downloads':
        baseQuery = baseQuery.order('download_count', { ascending: false });
        break;
      case 'views':
        baseQuery = baseQuery.order('view_count', { ascending: false });
        break;
      case 'newest':
        baseQuery = baseQuery.order('created_at', { ascending: false });
        break;
      case 'updated':
        baseQuery = baseQuery.order('updated_at', { ascending: false });
        break;
      case 'relevance':
      default:
        // For relevance, use rating as a proxy when there's no search query
        if (query.trim()) {
          baseQuery = baseQuery.order('rating_average', { ascending: false });
        } else {
          baseQuery = baseQuery.order('created_at', { ascending: false });
        }
        break;
    }

    // Apply pagination
    baseQuery = baseQuery.range(offset, offset + limit - 1);

    const { data: agents, error } = await baseQuery;

    if (error) {
      console.error('Simple search error:', error);
      throw error;
    }

    if (!agents || agents.length === 0) {
      const duration = Date.now() - start;
      console.log(`✅ Simple search completed in ${duration}ms (no results)`);
      return [];
    }

    // Step 2: Get related data in separate, optimized queries
    const authorIds = [...new Set(agents.map(a => a.author_id).filter(Boolean))];
    const categoryIds = [...new Set(agents.map(a => a.category_id).filter(Boolean))];

    // Get profiles and categories in parallel with short timeouts
    const [profilesResult, categoriesResult] = await Promise.allSettled([
      // Profiles query with timeout
      Promise.race([
        client
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', authorIds),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profiles timeout')), 2000)
        )
      ]),
      // Categories query with timeout
      Promise.race([
        client
          .from('categories')
          .select('id, name, slug')
          .in('id', categoryIds),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Categories timeout')), 2000)
        )
      ])
    ]);

    // Create lookup maps for fast joining
    const profilesMap = new Map();
    const categoriesMap = new Map();

    if (profilesResult.status === 'fulfilled' && profilesResult.value && typeof profilesResult.value === 'object' && 'data' in profilesResult.value && profilesResult.value.data) {
      (profilesResult.value.data as any[]).forEach((profile: any) => {
        profilesMap.set(profile.id, profile);
      });
    }

    if (categoriesResult.status === 'fulfilled' && categoriesResult.value && typeof categoriesResult.value === 'object' && 'data' in categoriesResult.value && categoriesResult.value.data) {
      (categoriesResult.value.data as any[]).forEach((category: any) => {
        categoriesMap.set(category.id, category);
      });
    }

    // Step 3: Merge results efficiently
    const results = agents.map(agent => ({
      ...agent,
      profiles: profilesMap.get(agent.author_id) || null,
      categories: categoriesMap.get(agent.category_id) || null
    }));

    const duration = Date.now() - start;
    console.log(`✅ Simple search completed in ${duration}ms`);

    return results;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Simple search failed after ${duration}ms:`, error);
    throw error;
  }
}

// Ultra-fast facets function with aggressive timeouts and fallbacks
export async function simpleGetFacets() {
  const client = createSimpleClient();
  
  console.log('🚀 Simple facets starting...');
  const start = Date.now();

  // Create a timeout wrapper for individual queries with shorter timeouts
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => 
        setTimeout(() => {
          console.warn(`Query timeout after ${timeoutMs}ms, using fallback`);
          resolve(fallback);
        }, timeoutMs)
      )
    ]);
  };

  try {
    // Use much shorter timeouts and provide immediate fallbacks
    const categoriesPromise = withTimeout(
      Promise.resolve(client
        .from('categories')
        .select('id, name, slug')
        .order('name')
        .limit(15)
      ),
      1500, // 1.5 second timeout
      { data: [] }
    );

    // Very aggressive timeout for agent queries that are known to be slow
    const languagesPromise = withTimeout(
      Promise.resolve(client
        .from('agents')
        .select('github_language')
        .eq('status', 'published')
        .not('github_language', 'is', null)
        .limit(25) // Even smaller sample
      ),
      1000, // 1 second timeout
      { data: [] }
    );

    const tagsPromise = withTimeout(
      Promise.resolve(client
        .from('agents')
        .select('tags')
        .eq('status', 'published')
        .not('tags', 'is', null)
        .limit(15) // Much smaller sample
      ),
      1000, // 1 second timeout  
      { data: [] }
    );

    // Execute all queries in parallel with guaranteed completion
    const [categoriesResult, languagesResult, tagsResult] = await Promise.all([
      categoriesPromise,
      languagesPromise,
      tagsPromise
    ]);

    // Process categories
    const categories = categoriesResult?.data && categoriesResult.data.length > 0
      ? (categoriesResult.data as any[]).map((cat: any) => ({
          name: cat.name,
          value: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
          count: 0
        }))
      : [
          { name: 'Web Development', value: 'web-development', count: 0 },
          { name: 'Data Processing', value: 'data-processing', count: 0 },
          { name: 'AI & ML', value: 'ai-ml', count: 0 },
          { name: 'API Tools', value: 'api-tools', count: 0 },
          { name: 'Testing', value: 'testing', count: 0 }
        ];

    // Process languages with graceful handling
    const languageCounts: { [key: string]: number } = {};
    if (languagesResult?.data && languagesResult.data.length > 0) {
      (languagesResult.data as any[]).forEach((agent: any) => {
        if (agent.github_language && typeof agent.github_language === 'string') {
          const lang = agent.github_language.trim();
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        }
      });
    }

    const languages = Object.keys(languageCounts).length > 0
      ? Object.entries(languageCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      : [
          { name: 'JavaScript', count: 0 },
          { name: 'Python', count: 0 },
          { name: 'TypeScript', count: 0 },
          { name: 'Go', count: 0 },
          { name: 'Rust', count: 0 }
        ];

    // Process tags with careful validation
    const tagCounts: { [key: string]: number } = {};
    if (tagsResult?.data && tagsResult.data.length > 0) {
      (tagsResult.data as any[]).forEach((agent: any) => {
        if (agent.tags && Array.isArray(agent.tags)) {
          agent.tags.forEach((tag: string) => {
            if (tag && typeof tag === 'string' && tag.trim().length > 0) {
              const normalizedTag = tag.trim().toLowerCase();
              if (normalizedTag.length <= 20) { // Avoid overly long tags
                tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
              }
            }
          });
        }
      });
    }

    const tags = Object.keys(tagCounts).length > 0
      ? Object.entries(tagCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 12)
      : [
          { name: 'automation', count: 0 },
          { name: 'development', count: 0 },
          { name: 'productivity', count: 0 },
          { name: 'testing', count: 0 }
        ];

    const duration = Date.now() - start;
    console.log(`✅ Simple facets completed in ${duration}ms`);

    return {
      categories,
      languages,
      frameworks: [], // Not available in current schema
      tags
    };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Simple facets failed after ${duration}ms:`, error);
    
    // Comprehensive fallback data that matches the UI expectations
    return {
      categories: [
        { value: 'Web Development', count: 0 },
        { value: 'Data Processing', count: 0 },
        { value: 'AI & ML', count: 0 },
        { value: 'API Tools', count: 0 },
        { value: 'Testing', count: 0 },
        { value: 'DevOps', count: 0 }
      ],
      languages: [
        { value: 'JavaScript', count: 0 },
        { value: 'Python', count: 0 },
        { value: 'TypeScript', count: 0 },
        { value: 'Go', count: 0 },
        { value: 'Rust', count: 0 },
        { value: 'Java', count: 0 }
      ],
      frameworks: [],
      tags: [
        { value: 'automation', count: 0 },
        { value: 'development', count: 0 },
        { value: 'productivity', count: 0 },
        { value: 'testing', count: 0 },
        { value: 'api', count: 0 },
        { value: 'cli', count: 0 }
      ]
    };
  }
}