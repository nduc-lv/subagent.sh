import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Enhanced admin authentication
    const adminSecret = request.headers.get('x-admin-secret');
    const userAgent = request.headers.get('user-agent');
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    // Rate limiting for admin endpoints
    const rateLimitResult = await checkRateLimit({ type: 'admin', identifier: clientIP });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }
    
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET || !process.env.ADMIN_SECRET) {
      console.warn(`Unauthorized admin access attempt from IP: ${clientIP}, User-Agent: ${userAgent}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Log admin access for audit trail
    console.log(`Admin access granted to IP: ${clientIP} for deployments GET`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get recent deployments
    const { data: deployments, error } = await supabase
      .from('deployments')
      .select('*')
      .order('deployed_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json(deployments);
  } catch (error) {
    console.error('Failed to fetch deployments:', error);
    // Don't expose internal error details
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Enhanced admin authentication
    const adminSecret = request.headers.get('x-admin-secret');
    const userAgent = request.headers.get('user-agent');
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    // Rate limiting for admin endpoints
    const rateLimitResult = await checkRateLimit({ type: 'admin', identifier: clientIP });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }
    
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET || !process.env.ADMIN_SECRET) {
      console.warn(`Unauthorized admin access attempt from IP: ${clientIP}, User-Agent: ${userAgent}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Log admin access for audit trail
    console.log(`Admin access granted to IP: ${clientIP} for deployments POST`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Add payload size validation
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
    }

    const deployment = await request.json();

    // Record deployment
    const { data, error } = await supabase
      .from('deployments')
      .insert([deployment])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to record deployment:', error);
    // Don't expose internal error details
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}