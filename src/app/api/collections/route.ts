import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get user session for authorization
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, slug, is_public } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if slug already exists for this user
    const { data: existingCollection } = await supabaseAdmin
      .from('collections')
      .select('id')
      .eq('slug', slug)
      .eq('user_id', session.user.id)
      .single();

    let finalSlug = slug;
    if (existingCollection) {
      // Append timestamp to make it unique
      finalSlug = `${slug}-${Date.now()}`;
    }

    // Create the collection
    const { data: collection, error } = await supabaseAdmin
      .from('collections')
      .insert({
        name,
        description,
        slug: finalSlug,
        user_id: session.user.id,
        author_id: session.user.id,
        is_public: is_public ?? true,
        agent_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create collection' },
        { status: 500 }
      );
    }

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const isPublic = searchParams.get('public');

    // Get user session for authorization when fetching user's collections
    let currentUserId: string | undefined;
    if (userId) {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            },
          },
        }
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      currentUserId = session?.user?.id;

      console.log('Session in API route:', { 
        hasSession: !!session, 
        userId: currentUserId, 
        requestedUserId: userId,
        cookiesCount: cookieStore.getAll().length 
      });

      // Only allow users to fetch their own collections
      if (!currentUserId || currentUserId !== userId) {
        console.log('Authorization failed:', { currentUserId, userId });
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    let query = supabaseAdmin
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId && currentUserId) {
      query = query.eq('user_id', userId);
    } else if (isPublic === 'true') {
      query = query.eq('is_public', true);
    } else {
      // Default to public collections only
      query = query.eq('is_public', true);
    }

    const { data: collections, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collections' },
        { status: 500 }
      );
    }

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}