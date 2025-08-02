// Monitoring utilities (Sentry removed)
export const initSentry = () => {
  // No-op - Sentry removed
};

export const captureException = (error: Error) => {
  // Fallback to console logging
  console.error('Error captured:', error);
};

export const captureMessage = (message: string) => {
  console.log('Message captured:', message);
};

export const setUser = (user: any) => {
  // No-op
};

export const setTag = (key: string, value: string) => {
  // No-op
};

export const setContext = (key: string, context: any) => {
  // No-op
};

export const recordMetric = (name: string, value: number, tags?: Record<string, string>) => {
  console.log(`Metric: ${name} = ${value}`, tags);
};

export const trackRateLimit = (limit: number, remaining: number, reset: number) => {
  console.log(`Rate limit: ${remaining}/${limit}, resets at ${new Date(reset * 1000).toISOString()}`);
};

export const healthCheck = () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
};