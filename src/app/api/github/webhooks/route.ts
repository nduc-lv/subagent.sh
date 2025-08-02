import { NextRequest, NextResponse } from 'next/server';
import { createWebhookHandler, WebhookSecurity } from '@/lib/github/webhooks';
import { githubSyncer } from '@/lib/github/sync';
import { headers } from 'next/headers';

// Initialize webhook handler with secret from environment
const webhookHandler = createWebhookHandler({
  secret: process.env.GITHUB_WEBHOOK_SECRET,
  log: console,
});

// Helper function to get repository sync by full name
async function getRepositorySyncByFullName(fullName: string) {
  // This would fetch from database
  // For now, return mock data
  return {
    id: 'mock-repo-sync-id',
    agent_id: 'mock-agent-id',
    repository_id: 123,
    repository_full_name: fullName,
    sync_enabled: true,
    auto_update: true,
    webhook_id: 12345,
    last_sync_at: null,
    last_commit_sha: null,
    sync_status: 'success' as const,
    sync_error: null,
    config: {
      branch: 'main',
      path: '',
      readme_as_description: true,
      tags_from_topics: true,
      version_from_releases: true,
      auto_publish: false,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Helper function to log webhook events
async function logWebhookEvent(
  eventType: string,
  action: string,
  repository: string,
  processed: boolean,
  error?: string
) {
  console.log(`[WEBHOOK] ${eventType}.${action} for ${repository}: ${processed ? 'processed' : 'failed'}`, error);
  
  // This would store in database for audit purposes
}

/**
 * POST /api/github/webhooks - Handle GitHub webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const signature = headersList.get('x-hub-signature-256') || '';
    const eventType = headersList.get('x-github-event') || '';
    const deliveryId = headersList.get('x-github-delivery') || '';
    const userAgent = headersList.get('user-agent') || '';
    
    // Security checks
    if (!userAgent.includes('GitHub-Hookshot')) {
      return NextResponse.json(
        { error: 'Invalid user agent' },
        { status: 403 }
      );
    }

    // Validate event type
    if (!webhookHandler.isValidEventType(eventType)) {
      return NextResponse.json(
        { error: 'Unsupported event type' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.text();
    
    // Validate signature
    if (process.env.GITHUB_WEBHOOK_SECRET) {
      const validation = webhookHandler.validateSignature(body, signature);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || 'Invalid signature' },
          { status: 403 }
        );
      }
    }

    // Parse payload
    const webhookEvent = webhookHandler.parsePayload(body, {
      'x-github-event': eventType,
      'x-github-delivery': deliveryId,
    });

    if (!webhookEvent) {
      return NextResponse.json(
        { error: 'Failed to parse webhook payload' },
        { status: 400 }
      );
    }

    // Handle ping events
    if (eventType === 'ping') {
      return NextResponse.json({ message: 'Webhook received successfully' });
    }

    // Extract repository information
    const repoInfo = webhookHandler.extractRepositoryInfo(JSON.parse(body));
    if (!repoInfo) {
      return NextResponse.json(
        { error: 'Repository information not found in payload' },
        { status: 400 }
      );
    }

    // Check if this is a significant change
    if (!webhookHandler.isSignificantChange(eventType, JSON.parse(body))) {
      await logWebhookEvent(eventType, JSON.parse(body).action || 'unknown', repoInfo.fullName, true, 'Not significant');
      return NextResponse.json({ message: 'Event received but not significant' });
    }

    // Rate limiting check
    if (!webhookHandler.shouldProcessWebhook(repoInfo.fullName, eventType)) {
      await logWebhookEvent(eventType, JSON.parse(body).action || 'unknown', repoInfo.fullName, false, 'Rate limited');
      return NextResponse.json({ message: 'Event rate limited' });
    }

    // Get repository sync configuration
    const repositorySync = await getRepositorySyncByFullName(repoInfo.fullName);
    if (!repositorySync || !repositorySync.sync_enabled) {
      await logWebhookEvent(eventType, JSON.parse(body).action || 'unknown', repoInfo.fullName, false, 'Sync disabled');
      return NextResponse.json({ message: 'Repository sync not enabled' });
    }

    // Store webhook payload for processing
    const payloadId = await webhookHandler.storeWebhookPayload(
      eventType,
      JSON.parse(body),
      signature,
      deliveryId
    );

    // Process the webhook event
    try {
      await processWebhookEvent(eventType, JSON.parse(body), repositorySync);
      await webhookHandler.markPayloadProcessed(payloadId);
      await logWebhookEvent(eventType, JSON.parse(body).action || 'unknown', repoInfo.fullName, true);
    } catch (error) {
      await webhookHandler.markPayloadProcessed(payloadId, String(error));
      await logWebhookEvent(eventType, JSON.parse(body).action || 'unknown', repoInfo.fullName, false, String(error));
      throw error;
    }

    return NextResponse.json({ 
      message: 'Webhook processed successfully',
      eventType,
      repository: repoInfo.fullName,
      deliveryId,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Process specific webhook events
 */
async function processWebhookEvent(eventType: string, payload: any, repositorySync: any) {
  const { action } = payload;

  switch (eventType) {
    case 'push':
      // Handle push events - trigger content sync
      if (repositorySync.auto_update) {
        await githubSyncer.syncRepository(repositorySync, { 
          updateContent: true,
          updateMetadata: false 
        });
      }
      break;

    case 'release':
      // Handle release events - update version and metadata
      if (action === 'published' || action === 'updated') {
        await githubSyncer.syncRepository(repositorySync, { 
          updateMetadata: true,
          updateContent: false 
        });
      }
      break;

    case 'repository':
      // Handle repository events - update metadata
      if (['updated', 'publicized', 'privatized'].includes(action)) {
        await githubSyncer.syncRepository(repositorySync, { 
          updateMetadata: true,
          updateContent: false 
        });
      }
      break;

    case 'star':
    case 'fork':
    case 'watch':
      // Handle social events - update statistics
      await githubSyncer.syncRepository(repositorySync, { 
        updateMetadata: true,
        updateContent: false 
      });
      break;

    case 'issues':
    case 'pull_request':
      // Handle development activity - could trigger analytics updates
      // For now, just log the event
      console.log(`Development activity in ${repositorySync.repository_full_name}: ${eventType}.${action}`);
      break;

    default:
      console.log(`Unhandled webhook event: ${eventType}.${action}`);
  }
}

/**
 * GET /api/github/webhooks - Get webhook status and configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      // Return webhook service status
      return NextResponse.json({
        success: true,
        status: 'active',
        secret_configured: !!process.env.GITHUB_WEBHOOK_SECRET,
        supported_events: [
          'push',
          'release',
          'repository',
          'star',
          'fork',
          'issues',
          'pull_request',
          'watch',
        ],
      });

    } else if (action === 'test') {
      // Test webhook configuration
      return NextResponse.json({
        success: true,
        message: 'Webhook endpoint is accessible',
        timestamp: new Date().toISOString(),
      });

    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Webhook status error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get webhook status', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Security middleware for webhook endpoints
 * Note: This would be better placed in middleware.ts file
 */
function securityCheck(request: NextRequest) {
  // Check if request is from GitHub
  const userAgent = request.headers.get('user-agent') || '';
  if (!userAgent.includes('GitHub-Hookshot')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  // Check IP if configured
  if (process.env.VERIFY_GITHUB_IP === 'true') {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 
               request.headers.get('x-real-ip') || 
               'unknown';

    if (!WebhookSecurity.isValidGitHubIP(ip)) {
      return NextResponse.json(
        { error: 'Invalid source IP' },
        { status: 403 }
      );
    }
  }

  return null;
}