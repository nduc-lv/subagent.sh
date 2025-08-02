import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { checkRateLimit } from '@/lib/rate-limit';

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      'anonymous';
    
    const rateLimitResult = await checkRateLimit({
      type: 'heavy',
      identifier: `account-delete:${identifier}`
    });
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Start a transaction to delete all user data
    const userId = user.id;
    const serviceClient = createServiceClient();

    try {
      // Delete user's reviews (this will cascade to review votes, flags, etc)
      await serviceClient
        .from('reviews')
        .delete()
        .eq('user_id', userId);

      // Delete user's agents (this will cascade to agent_tags, etc)
      await serviceClient
        .from('agents')
        .delete()
        .eq('author_id', userId);

      // Delete user's review votes
      await serviceClient
        .from('review_votes')
        .delete()
        .eq('user_id', userId);

      // Delete user's review flags
      await serviceClient
        .from('review_flags')
        .delete()
        .eq('user_id', userId);

      // Delete user's review responses
      await serviceClient
        .from('review_responses')
        .delete()
        .eq('user_id', userId);

      // Delete user profile
      await serviceClient
        .from('profiles')
        .delete()
        .eq('id', userId);

      // Finally, delete the auth user
      const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(userId);
      
      if (deleteUserError) {
        throw deleteUserError;
      }

      return NextResponse.json({ 
        message: 'Account successfully deleted' 
      });

    } catch (dbError) {
      console.error('Database error during user deletion:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete account data' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}