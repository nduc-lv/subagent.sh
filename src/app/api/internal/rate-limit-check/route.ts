import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RateLimitType } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { type, userId } = await request.json();

    if (!type || !Object.keys(rateLimits).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid rate limit type' },
        { status: 400 }
      );
    }

    // Get client identifier
    const identifier = request.ip || 
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      'unknown';

    const result = await checkRateLimit({
      type: type as RateLimitType,
      identifier: `${type}:${identifier}`,
      userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return NextResponse.json(
      { error: 'Rate limit check failed' },
      { status: 500 }
    );
  }
}