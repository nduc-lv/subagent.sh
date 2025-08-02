'use client';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useEffect } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    // Track Core Web Vitals
    if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true') {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    }
  }, []);

  return (
    <>
      {children}
      {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </>
  );
}