'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, Star, GitFork, Calendar, ExternalLink, Eye, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface ImportOptions {
  readmeAsDescription: boolean;
  tagsFromTopics: boolean;
  versionFromReleases: boolean;
  autoPublish: boolean;
  defaultCategory?: string;
}

interface SubAgentPreview {
  name: string;
  description?: string;
  content?: string;
  tools: string[];
  tags: string[];
  version: string;
  file_path?: string;
  agent_type: string;
}

interface RepositoryPreview {
  agents: SubAgentPreview[];
  repository: {
    name: string;
    description?: string;
    language?: string;
    license?: string;
    github_stars: number;
    github_forks: number;
    github_repo_url: string;
  };
}

interface ImportResult {
  success: boolean;
  agents?: any[];
  agent?: any; // backward compatibility
  repository?: any;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    processing_time_ms: number;
    files_processed: number;
    features_detected: string[];
    agents_created?: number;
  };
}

export function GitHubImportForm() {
  const [activeTab, setActiveTab] = useState('url');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState<ImportOptions>({
    readmeAsDescription: true,
    tagsFromTopics: true,
    versionFromReleases: true,
    autoPublish: true,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [preview, setPreview] = useState<RepositoryPreview | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

  // Validate and preview repository
  const validateRepository = async (repoUrl: string) => {
    if (!repoUrl) {
      setPreview(null);
      setValidationError(null);
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch(`/api/github/import?action=preview&url=${encodeURIComponent(repoUrl)}&${new URLSearchParams({
        readmeAsDescription: options.readmeAsDescription.toString(),
        tagsFromTopics: options.tagsFromTopics.toString(),
        versionFromReleases: options.versionFromReleases.toString(),
        autoPublish: options.autoPublish.toString(),
      })}`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to validate repository');
      }

      // Handle both new format (previews) and old format (preview)
      if (result.previews && result.previews.length > 0) {
        const previewData: RepositoryPreview = {
          agents: result.previews.map((agent: any) => ({
            name: agent.name,
            description: agent.description,
            content: agent.content,
            tools: agent.tools || [],
            tags: agent.tags || [],
            version: agent.version || '1.0.0',
            file_path: agent.file_path,
            agent_type: agent.agent_type || 'subagent',
          })),
          repository: {
            name: result.previews[0]?.github_repo_name || 'Repository',
            description: result.previews[0]?.short_description,
            language: result.previews[0]?.github_language,
            license: result.previews[0]?.github_license,
            github_stars: result.previews[0]?.github_stars || 0,
            github_forks: result.previews[0]?.github_forks || 0,
            github_repo_url: result.previews[0]?.github_url || '',
          },
        };
        setPreview(previewData);
      } else if (result.preview) {
        // Legacy format fallback
        const previewData: RepositoryPreview = {
          agents: [{
            name: result.preview.name,
            description: result.preview.description,
            content: result.preview.content,
            tools: result.preview.tools || [],
            tags: result.preview.tags || [],
            version: result.preview.version || '1.0.0',
            file_path: result.preview.file_path,
            agent_type: result.preview.agent_type || 'subagent',
          }],
          repository: {
            name: result.preview.github_repo_name || 'Repository',
            description: result.preview.short_description,
            language: result.preview.github_language,
            license: result.preview.github_license,
            github_stars: result.preview.github_stars || 0,
            github_forks: result.preview.github_forks || 0,
            github_repo_url: result.preview.github_url || '',
          },
        };
        setPreview(previewData);
        // Select all agents by default
        const allAgentPaths = previewData.agents.map(agent => agent.file_path).filter(Boolean);
        setSelectedAgents(new Set(allAgentPaths));
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Validation failed');
      setPreview(null);
      setSelectedAgents(new Set());
    } finally {
      setIsValidating(false);
    }
  };

  // Import single repository
  const importRepository = async (repoUrl: string) => {
    setIsLoading(true);
    setImportResult(null);

    try {
      // Get selected agent paths or import all if none selected
      const selectedAgentPaths = selectedAgents.size > 0 
        ? Array.from(selectedAgents)
        : undefined;

      const response = await fetch('/api/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: repoUrl, 
          options,
          selectedAgents: selectedAgentPaths 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResult(result);
    } catch (error) {
      setImportResult({
        success: false,
        errors: [error instanceof Error ? error.message : 'Import failed'],
      });
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search repositories
  const searchRepositories = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/github/repositories?action=search&query=${encodeURIComponent(searchQuery)}&sort=stars&per_page=20`);
      const result = await response.json();

      if (response.ok) {
        setSearchResults(result.repositories || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get user repositories
  const getUserRepositories = async () => {
    if (!username.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/github/repositories?action=user&username=${encodeURIComponent(username)}&per_page=50`);
      const result = await response.json();

      if (response.ok) {
        setUserRepos(result.repositories || []);
      }
    } catch (error) {
      console.error('Failed to get user repositories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Import selected repositories
  const importSelectedRepositories = async () => {
    const selectedRepoUrls = Array.from(selectedRepos);
    if (selectedRepoUrls.length === 0) return;

    setIsLoading(true);
    try {
      let response, result;
      
      if (activeTab === 'search') {
        // Use search import endpoint
        response = await fetch('/api/github/import/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: searchQuery,
            options,
            searchOptions: {
              sort: 'stars',
              order: 'desc',
              limit: selectedRepoUrls.length
            }
          }),
        });
      } else if (activeTab === 'user') {
        // Use user import endpoint  
        response = await fetch('/api/github/import/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username,
            options,
            filters: {
              includeForks: false,
              minStars: 0
            }
          }),
        });
      } else {
        // Fallback to individual imports for URL tab
        const results = [];
        for (const repoUrl of selectedRepoUrls) {
          const response = await fetch('/api/github/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: repoUrl, options }),
          });
          const result = await response.json();
          results.push(result);
        }
        setImportResult({
          success: true,
          metadata: {
            processing_time_ms: 0,
            files_processed: results.length,
            features_detected: ['batch_import'],
          },
        });
        return;
      }
      
      result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Batch import failed');
      }
      
      setImportResult({
        success: result.success,
        agents: result.agents,
        metadata: {
          processing_time_ms: 0,
          files_processed: result.summary?.total || 0,
          features_detected: ['batch_import'],
          agents_created: result.summary?.agents_created || 0,
        },
        summary: result.summary,
      });
    } catch (error) {
      setImportResult({
        success: false,
        errors: [error instanceof Error ? error.message : 'Batch import failed'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setSelectedAgents(new Set()); // Reset selection when URL changes
    // Debounce validation
    const timer = setTimeout(() => validateRepository(value), 500);
    return () => clearTimeout(timer);
  };

  const toggleRepoSelection = (repoUrl: string) => {
    const newSelection = new Set(selectedRepos);
    if (newSelection.has(repoUrl)) {
      newSelection.delete(repoUrl);
    } else {
      newSelection.add(repoUrl);
    }
    setSelectedRepos(newSelection);
  };

  const toggleAgentSelection = (agentPath: string) => {
    const newSelection = new Set(selectedAgents);
    if (newSelection.has(agentPath)) {
      newSelection.delete(agentPath);
    } else {
      newSelection.add(agentPath);
    }
    setSelectedAgents(newSelection);
  };

  const selectAllAgents = () => {
    if (preview) {
      const allPaths = preview.agents.map(agent => agent.file_path).filter(Boolean);
      setSelectedAgents(new Set(allPaths));
    }
  };

  const deselectAllAgents = () => {
    setSelectedAgents(new Set());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Import from GitHub
          </CardTitle>
          <CardDescription>
            Import agents directly from GitHub repositories with automatic metadata extraction and synchronization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url">Repository URL</TabsTrigger>
              <TabsTrigger value="search">Search Repositories</TabsTrigger>
              <TabsTrigger value="user">User Repositories</TabsTrigger>
            </TabsList>

            {/* Import Options */}
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-medium">Import Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="readmeAsDescription"
                    checked={options.readmeAsDescription}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, readmeAsDescription: !!checked }))}
                  />
                  <Label htmlFor="readmeAsDescription" className="text-sm">Use README as description</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tagsFromTopics"
                    checked={options.tagsFromTopics}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, tagsFromTopics: !!checked }))}
                  />
                  <Label htmlFor="tagsFromTopics" className="text-sm">Generate tags from topics</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="versionFromReleases"
                    checked={options.versionFromReleases}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, versionFromReleases: !!checked }))}
                  />
                  <Label htmlFor="versionFromReleases" className="text-sm">Use latest release version</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoPublish"
                    checked={options.autoPublish}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, autoPublish: !!checked }))}
                  />
                  <Label htmlFor="autoPublish" className="text-sm">Auto-publish agent</Label>
                </div>
              </div>
            </div>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repo-url">Repository URL</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/owner/repository"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  disabled={isLoading}
                />
                {isValidating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating repository...
                  </div>
                )}
                {validationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}
              </div>

              {preview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Preview - {preview.agents.length} Sub-Agent{preview.agents.length !== 1 ? 's' : ''} Found
                    </CardTitle>
                    <CardDescription>
                      Repository: {preview.repository.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Repository Info */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{preview.repository.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4" />
                            {preview.repository.github_stars}
                          </div>
                          <div className="flex items-center gap-1">
                            <GitFork className="h-4 w-4" />
                            {preview.repository.github_forks}
                          </div>
                        </div>
                      </div>
                      {preview.repository.description && (
                        <p className="text-sm text-muted-foreground">{preview.repository.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <span className="font-medium">Language:</span> {preview.repository.language || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">License:</span> {preview.repository.license || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Sub-Agents */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">Sub-Agents to Import:</h5>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={selectAllAgents}
                            disabled={selectedAgents.size === preview.agents.length}
                          >
                            Select All
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={deselectAllAgents}
                            disabled={selectedAgents.size === 0}
                          >
                            Deselect All
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedAgents.size} of {preview.agents.length} agents selected
                      </div>
                      {preview.agents.map((agent, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={agent.file_path ? selectedAgents.has(agent.file_path) : false}
                                onCheckedChange={() => agent.file_path && toggleAgentSelection(agent.file_path)}
                                disabled={!agent.file_path}
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h6 className="font-medium">{agent.name}</h6>
                                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                                  </div>
                                  <Badge variant="outline">{agent.agent_type}</Badge>
                                </div>
                                
                                <div>
                                  <span className="text-sm font-medium">Tools: </span>
                                  <span className="text-sm text-muted-foreground">
                                    {agent.tools.length > 0 ? agent.tools.join(', ') : 'Inherits all tools'}
                                  </span>
                                </div>
                                
                                <div className="flex flex-wrap gap-1">
                                  {agent.tags.slice(0, 5).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {agent.tags.length > 5 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{agent.tags.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                                
                                {agent.file_path && (
                                  <div className="text-xs text-muted-foreground">
                                    File: {agent.file_path}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={() => importRepository(url)}
                disabled={!preview || isLoading || selectedAgents.size === 0}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  selectedAgents.size === 0 
                    ? 'Select at least one agent to import'
                    : `Import ${selectedAgents.size} Selected Agent${selectedAgents.size !== 1 ? 's' : ''}`
                )}
              </Button>
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchRepositories()}
                />
                <Button onClick={searchRepositories} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((repo) => (
                    <Card key={repo.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedRepos.has(repo.html_url)}
                              onCheckedChange={() => toggleRepoSelection(repo.html_url)}
                            />
                            <h4 className="font-medium">{repo.full_name}</h4>
                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{repo.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {repo.stargazers_count}
                            </div>
                            <div className="flex items-center gap-1">
                              <GitFork className="h-3 w-3" />
                              {repo.forks_count}
                            </div>
                            {repo.language && <Badge variant="outline">{repo.language}</Badge>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {selectedRepos.size > 0 && (
                    <Button onClick={importSelectedRepositories} disabled={isLoading} className="w-full">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing {selectedRepos.size} repositories...
                        </>
                      ) : (
                        `Import ${selectedRepos.size} selected repositories`
                      )}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="user" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="GitHub username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && getUserRepositories()}
                />
                <Button onClick={getUserRepositories} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load Repos'}
                </Button>
              </div>

              {userRepos.length > 0 && (
                <div className="space-y-2">
                  {userRepos.map((repo) => (
                    <Card key={repo.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedRepos.has(repo.html_url)}
                              onCheckedChange={() => toggleRepoSelection(repo.html_url)}
                            />
                            <h4 className="font-medium">{repo.name}</h4>
                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            {repo.private && <Badge variant="secondary">Private</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{repo.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {repo.stargazers_count}
                            </div>
                            <div className="flex items-center gap-1">
                              <GitFork className="h-3 w-3" />
                              {repo.forks_count}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(repo.updated_at).toLocaleDateString()}
                            </div>
                            {repo.language && <Badge variant="outline">{repo.language}</Badge>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {selectedRepos.size > 0 && (
                    <Button onClick={importSelectedRepositories} disabled={isLoading} className="w-full">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing {selectedRepos.size} repositories...
                        </>
                      ) : (
                        `Import ${selectedRepos.size} selected repositories`
                      )}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Import Result */}
          {importResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  Import {importResult.success ? 'Successful' : 'Failed'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {importResult.success ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <p className="text-green-600 font-medium">
                        Repository imported successfully!
                      </p>
                    </div>
                    
                    {importResult.metadata?.agents_created && (
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          ✅ {importResult.metadata.agents_created} sub-agent{importResult.metadata.agents_created !== 1 ? 's' : ''} created successfully
                        </p>
                      </div>
                    )}
                    
                    {importResult.agents && importResult.agents.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Imported Sub-Agents:</h4>
                        <div className="space-y-2">
                          {importResult.agents.map((agent: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{agent.name}</p>
                                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                                </div>
                                <Badge variant="outline">{agent.status}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {importResult.metadata && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Processing time: {importResult.metadata.processing_time_ms}ms</p>
                        <p>Files processed: {importResult.metadata.files_processed}</p>
                        {importResult.metadata.features_detected && importResult.metadata.features_detected.length > 0 && (
                          <p>Features: {importResult.metadata.features_detected.join(', ')}</p>
                        )}
                      </div>
                    )}
                    
                    {importResult.warnings && importResult.warnings.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div>Warnings:</div>
                          <ul className="list-disc list-inside">
                            {importResult.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div>
                    {importResult.errors?.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}