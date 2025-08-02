import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordMetric } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results = {
      timestamp: new Date().toISOString(),
      cleaned: {
        old_sessions: 0,
        unconfirmed_users: 0,
        orphaned_bookmarks: 0,
        old_deployments: 0,
        stats_updated: false,
      },
      errors: [] as string[],
    };

    // Clean up old sessions (older than 30 days)
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { count } = await supabase
        .from('auth.sessions')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());
      
      results.cleaned.old_sessions = count || 0;
    } catch (error: any) {
      results.errors.push(`Failed to clean sessions: ${error.message}`);
    }

    // Clean up unconfirmed users (older than 7 days)
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { count } = await supabase
        .from('auth.users')
        .delete()
        .lt('created_at', sevenDaysAgo.toISOString())
        .is('email_confirmed_at', null);
      
      results.cleaned.unconfirmed_users = count || 0;
    } catch (error: any) {
      results.errors.push(`Failed to clean unconfirmed users: ${error.message}`);
    }

    // Clean up orphaned bookmarks (bookmarks without valid agents)
    try {
      const { count } = await supabase
        .from('bookmarks')
        .delete()
        .not('agent_id', 'in', 
          supabase.from('agents').select('id')
        );
      
      results.cleaned.orphaned_bookmarks = count || 0;
    } catch (error: any) {
      results.errors.push(`Failed to clean orphaned bookmarks: ${error.message}`);
    }

    // Clean up old deployment logs (older than 90 days)
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const { count } = await supabase
        .from('deployments')
        .delete()
        .lt('deployed_at', ninetyDaysAgo.toISOString());
      
      results.cleaned.old_deployments = count || 0;
    } catch (error: any) {
      results.errors.push(`Failed to clean deployment logs: ${error.message}`);
    }

    // Update database statistics
    try {
      await supabase.rpc('update_table_stats');
      results.cleaned.stats_updated = true;
    } catch (error: any) {
      results.errors.push(`Failed to update statistics: ${error.message}`);
    }

    // Record cleanup metrics
    recordMetric('cleanup_job', 1, {
      sessions_cleaned: (results.cleaned.old_sessions || 0).toString(),
      users_cleaned: (results.cleaned.unconfirmed_users || 0).toString(),
      bookmarks_cleaned: (results.cleaned.orphaned_bookmarks || 0).toString(),
      errors: results.errors.length.toString(),
    });

    // Log cleanup results
    console.log('Cleanup job completed:', results);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Cleanup job failed:', error);
    
    recordMetric('cleanup_job_failed', 1, {
      error: error.message,
    });

    return NextResponse.json(
      { 
        error: 'Cleanup job failed', 
        message: error.message,
        timestamp: new Date().toISOString() 
      },
      { status: 500 }
    );
  }
}