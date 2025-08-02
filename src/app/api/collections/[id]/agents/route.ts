import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { agent_ids } = body;

    if (!agent_ids || !Array.isArray(agent_ids) || agent_ids.length === 0) {
      return NextResponse.json(
        { error: 'agent_ids array is required' },
        { status: 400 }
      );
    }

    // Check if collection exists and user owns it
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from('collections')
      .select('id, agent_count, user_id')
      .eq('id', params.id)
      .single();

    if (collectionError) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check if user owns the collection
    if (collection.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get the current max order_index for this collection
    const { data: maxOrderData } = await supabaseAdmin
      .from('collection_agents')
      .select('order_index')
      .eq('collection_id', params.id)
      .order('order_index', { ascending: false })
      .limit(1);

    const maxOrder = maxOrderData?.[0]?.order_index || 0;

    // Prepare agent entries with order_index
    const agentEntries = agent_ids.map((agent_id: string, index: number) => ({
      collection_id: params.id,
      agent_id,
      order_index: maxOrder + index + 1
    }));

    // Insert agents into collection (with conflict handling)
    const { error: insertError } = await supabaseAdmin
      .from('collection_agents')
      .upsert(agentEntries, { 
        onConflict: 'collection_id,agent_id',
        ignoreDuplicates: true 
      });

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json(
        { error: 'Failed to add agents to collection' },
        { status: 500 }
      );
    }

    // Update agent count
    const { error: updateError } = await supabaseAdmin
      .from('collections')
      .update({ 
        agent_count: collection.agent_count + agent_ids.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Failed to update agent count:', updateError);
    }

    return NextResponse.json({ 
      success: true, 
      added: agent_ids.length 
    });
  } catch (error) {
    console.error('Error adding agents to collection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { searchParams } = new URL(request.url);
    const agentIds = searchParams.get('agent_ids')?.split(',') || [];

    if (agentIds.length === 0) {
      return NextResponse.json(
        { error: 'agent_ids parameter is required' },
        { status: 400 }
      );
    }

    // Check if user owns the collection
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from('collections')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (collectionError || collection.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Remove agents from collection
    const { error: deleteError } = await supabaseAdmin
      .from('collection_agents')
      .delete()
      .eq('collection_id', params.id)
      .in('agent_id', agentIds);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove agents from collection' },
        { status: 500 }
      );
    }

    // Update agent count
    const { data: collectionData, error: countError } = await supabaseAdmin
      .from('collections')
      .select('agent_count')
      .eq('id', params.id)
      .single();

    if (!countError && collectionData) {
      const { error: updateError } = await supabaseAdmin
        .from('collections')
        .update({ 
          agent_count: Math.max(0, collectionData.agent_count - agentIds.length),
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id);

      if (updateError) {
        console.error('Failed to update agent count:', updateError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      removed: agentIds.length 
    });
  } catch (error) {
    console.error('Error removing agents from collection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}