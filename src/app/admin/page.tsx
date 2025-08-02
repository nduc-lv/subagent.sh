'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Activity,
  Users,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Server,
  Globe,
  Shield,
  Zap,
} from 'lucide-react';

interface HealthStatus {
  status: string;
  checks: Record<string, any>;
  response_time: number;
  timestamp: string;
}

interface Metrics {
  timestamp: string;
  system: {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    platform: string;
    node_version: string;
  };
  database: {
    total_agents: number;
    total_users: number;
    total_collections: number;
    active_users_7d: number;
  };
}

export default function AdminDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
    } catch (err) {
      setError('Failed to fetch health status');
      console.error(err);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError('Failed to fetch metrics');
      console.error(err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchHealthStatus(), fetchMetrics()]);
      setLoading(false);
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMemory = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => Promise.all([fetchHealthStatus(), fetchMetrics()])}>
          Refresh
        </Button>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {health && getStatusIcon(health.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health && (
                <Badge className={getStatusColor(health.status)}>
                  {health.status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Response time: {health?.response_time}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.database.total_users || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.database.active_users_7d || 0} active this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.database.total_agents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.database.total_collections || 0} collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics && formatMemory(metrics.system.memory.heapUsed)}
            </div>
            <p className="text-xs text-muted-foreground">
              of {metrics && formatMemory(metrics.system.memory.heapTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="system">System Info</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="external">External APIs</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {health?.checks && Object.entries(health.checks).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(typeof value === 'object' && value.status ? value.status : 'unknown')}
                      <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right">
                      {typeof value === 'object' ? (
                        <div>
                          <Badge className={getStatusColor(value.status || 'unknown')}>
                            {value.status || 'unknown'}
                          </Badge>
                          {value.response_time && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {value.response_time}ms
                            </p>
                          )}
                        </div>
                      ) : (
                        <span>{String(value)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Platform:</span>
                  <span>{metrics?.system.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span>Node Version:</span>
                  <span>{metrics?.system.node_version}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span>{metrics && formatUptime(metrics.system.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Environment:</span>
                  <span>{process.env.NODE_ENV}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Heap Used:</span>
                  <span>{metrics && formatMemory(metrics.system.memory.heapUsed)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Heap Total:</span>
                  <span>{metrics && formatMemory(metrics.system.memory.heapTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>RSS:</span>
                  <span>{metrics && formatMemory(metrics.system.memory.rss)}</span>
                </div>
                <div className="flex justify-between">
                  <span>External:</span>
                  <span>{metrics && formatMemory(metrics.system.memory.external)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.database.total_users || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.database.total_agents || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collections</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.database.total_collections || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users (7d)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.database.active_users_7d || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="external" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>External API Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {health?.checks?.external_apis?.map((api: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(api.status)}
                      <span className="font-medium capitalize">{api.service}</span>
                    </div>
                    <Badge className={getStatusColor(api.status)}>
                      {api.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}