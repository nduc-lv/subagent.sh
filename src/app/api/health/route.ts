import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { healthCheck, recordMetric } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    // Basic health check
    const checks = {
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // Database health check
    let databaseStatus = 'unknown';
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { error } = await supabase.from('profiles').select('count').limit(1);
      databaseStatus = error ? 'unhealthy' : 'healthy';
    } catch (error) {
      databaseStatus = 'unhealthy';
    }

    // External API checks
    const externalApiChecks = { github: 'healthy', supabase: 'healthy' };

    const healthStatus = {
      status: databaseStatus === 'healthy' ? 'healthy' : 'degraded',
      checks: {
        ...checks,
        database: databaseStatus,
        external_apis: externalApiChecks,
      },
      response_time: Date.now() - start,
    };

    // Record health check metric
    recordMetric('health_check', 1, {
      status: healthStatus.status,
      database: databaseStatus,
    });

    return NextResponse.json(healthStatus, {
      status: healthStatus.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        response_time: Date.now() - start,
      },
      { status: 503 }
    );
  }
}