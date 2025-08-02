'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { EnhancedAgentForm } from '@/components/forms/enhanced-agent-form';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAgent } from '@/hooks/use-database';
import { useAuth } from '@/contexts/auth-context';
import type { Agent } from '@/types';

function EditAgentPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const agentId = params.id as string;
  
  const { agent, loading, error } = useAgent(agentId);

  const handleSuccess = (updatedAgent: Agent) => {
    router.push(`/agents/${updatedAgent.id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Agent Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The agent you're trying to edit doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Check if user owns this agent
  if (!user || agent.author_id !== user.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You can only edit agents that you own.
          </p>
          <Button onClick={() => router.push(`/agents/${agentId}`)}>
            View Agent
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agent
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold">Edit Agent</h1>
          <p className="text-muted-foreground">
            Update your agent details and settings
          </p>
        </div>
      </div>

      <EnhancedAgentForm
        agent={agent}
        mode="edit"
        autosaveEnabled={false}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default function EditAgentPage() {
  return (
    <AuthGuard>
      <EditAgentPageContent />
    </AuthGuard>
  );
}