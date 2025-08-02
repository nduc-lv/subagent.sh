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

    // Perform comprehensive health checks
    const results = {
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'unknown', response_time: 0, error: undefined as string | undefined },
        github: { status: 'unknown' },
        memory: { status: 'unknown', usage_percent: 0 },
      },
      alerts: [] as string[],
    };

    // Database connection check
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      results.checks.database = { status: 'healthy', response_time: 0, error: undefined };
    } catch (error: any) {
      results.checks.database = { status: 'unhealthy', response_time: 0, error: error.message };
      results.alerts.push('Database connection failed');
    }

    // External API checks
    const externalChecks = await Promise.allSettled([
      fetch('https://api.github.com/zen', { signal: AbortSignal.timeout(5000) }),
    ]);

    results.checks.github = {
      status: externalChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
    };

    // Performance checks
    const memUsage = process.memoryUsage();
    const memoryAlert = memUsage.heapUsed / memUsage.heapTotal > 0.9;
    
    if (memoryAlert) {
      results.alerts.push('High memory usage detected');
    }

    results.checks.memory = {
      status: memoryAlert ? 'warning' : 'healthy',
      usage_percent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    };

    // Record metrics
    recordMetric('automated_health_check', 1, {
      status: results.alerts.length > 0 ? 'unhealthy' : 'healthy',
      alert_count: results.alerts.length.toString(),
    });

    // If there are alerts, you could send notifications here
    if (results.alerts.length > 0) {
      console.warn('Health check alerts:', results.alerts);
      // TODO: Send to Slack or email notification service
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Automated health check failed:', error);
    return NextResponse.json(
      { error: 'Health check failed', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}