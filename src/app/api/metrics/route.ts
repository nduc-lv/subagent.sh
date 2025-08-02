import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordMetric } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Collect system metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        platform: process.platform,
        node_version: process.version,
      },
    };

    // Database metrics
    try {
      const [
        { count: totalAgents },
        { count: totalUsers },
        { count: totalCollections },
        { count: activeUsers },
      ] = await Promise.all([
        supabase.from('agents').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('collections').select('*', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      metrics.database = {
        total_agents: totalAgents || 0,
        total_users: totalUsers || 0,
        total_collections: totalCollections || 0,
        active_users_7d: activeUsers || 0,
      };

      // Record metrics
      recordMetric({ name: 'total_agents', value: totalAgents || 0 });
      recordMetric({ name: 'total_users', value: totalUsers || 0 });
      recordMetric({ name: 'active_users_7d', value: activeUsers || 0 });
    } catch (error) {
      console.error('Failed to collect database metrics:', error);
      metrics.database = { error: 'Failed to collect database metrics' };
    }

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('Metrics collection failed:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, value, unit, tags } = body;

    if (!name || typeof value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid metric data' },
        { status: 400 }
      );
    }

    recordMetric({ name, value, unit, tags });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to record custom metric:', error);
    return NextResponse.json(
      { error: 'Failed to record metric' },
      { status: 500 }
    );
  }
}