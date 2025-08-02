'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

export function MaintenanceBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if maintenance mode is enabled
    const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
    
    // Check if user has dismissed the banner
    const isDismissed = localStorage.getItem('maintenance-banner-dismissed') === 'true';
    
    setIsVisible(maintenanceMode && !isDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setIsVisible(false);
    localStorage.setItem('maintenance-banner-dismissed', 'true');
  };

  if (!isVisible || dismissed) {
    return null;
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800 rounded-none border-x-0">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <span>
          We're performing scheduled maintenance. Some features may be temporarily unavailable.
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-auto p-1 text-yellow-800 hover:text-yellow-900"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}