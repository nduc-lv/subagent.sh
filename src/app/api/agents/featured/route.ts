import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/database';

export async function GET() {
  try {
    // Get featured agents using the database method
    const data = await db.getFeaturedAgents(3);

    if (!data) {
      return NextResponse.json({ agents: [] });
    }

    // Transform the data to match the expected format for the homepage
    const featuredAgents = data.map(agent => ({
      name: agent.name,
      description: agent.description?.length > 100 
        ? agent.description.substring(0, 100)
        : agent.description,
      category: agent.categories?.name || 'General',
      downloads: agent.download_count || 0,
      rating: parseFloat(agent.rating_average || '0'),
      tags: (agent.tags || []).slice(0, 3), // Limit to 3 tags max
      id: agent.id,
      slug: agent.slug,
      author: agent.profiles ? {
        username: agent.profiles.username,
        full_name: agent.profiles.full_name,
        avatar_url: agent.profiles.avatar_url
      } : null,
    }));

    return NextResponse.json({ agents: featuredAgents });
  } catch (error) {
    console.error('Error fetching featured agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured agents' },
      { status: 500 }
    );
  }
}