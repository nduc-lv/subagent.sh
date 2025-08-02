'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Upload, 
  Github, 
  ExternalLink, 
  Loader2, 
  Plus, 
  X, 
  Eye,
  FileText,
  Settings,
  Tag as TagIcon,
  AlertCircle,
  Check,
  Import,
  Code,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgentMutations, useCategories } from '@/hooks/use-database';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import type { Agent } from '@/types';

interface AgentFormData {
  name: string;
  description: string;
  detailed_description: string;
  github_repo_url: string;
  documentation_url: string;
  demo_url: string;
  homepage_url: string;
  tags: string[];
  category_id: string;
  language: string;
  framework: string;
  license: string;
  allow_comments: boolean;
}

interface EnhancedAgentFormProps {
  agent?: Agent | null;
  onSuccess?: (agent: Agent) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'duplicate';
  autosaveEnabled?: boolean;
}

const FORM_STEPS = [
  { id: 'basic', title: 'Basic Info', icon: FileText, description: 'Essential details about your agent' },
  { id: 'technical', title: 'Technical', icon: Settings, description: 'Technical specifications' },
  { id: 'links', title: 'Links', icon: ExternalLink, description: 'Resources and documentation' },
  { id: 'preview', title: 'Preview', icon: Eye, description: 'Review before submission' }
];

const POPULAR_TAGS = [
  'automation', 'api', 'web-scraping', 'data-analysis', 'testing', 'deployment',
  'documentation', 'code-review', 'devops', 'ui-ux', 'machine-learning', 
  'security', 'monitoring', 'productivity', 'integration'
];

const LANGUAGES = [
  'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java', 'C++', 'C#',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Shell', 'SQL'
];

const FRAMEWORKS = [
  'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'Express.js',
  'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Laravel', 'Rails', 'ASP.NET'
];

const LICENSES = [
  'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC', 'LGPL-3.0',
  'MPL-2.0', 'AGPL-3.0', 'Unlicense', 'Proprietary'
];

export function EnhancedAgentForm({ 
  agent, 
  onSuccess, 
  onCancel, 
  mode = 'create',
  autosaveEnabled = false 
}: EnhancedAgentFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { categories } = useCategories();
  const { createAgent, updateAgent, saveDraft, loading, error } = useAgentMutations();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    detailed_description: '',
    github_repo_url: '',
    documentation_url: '',
    demo_url: '',
    homepage_url: '',
    tags: [],
    category_id: '',
    language: '',
    framework: '',
    license: 'MIT',
    allow_comments: true,
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [githubImporting, setGithubImporting] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Initialize form with existing agent data
  useEffect(() => {
    if (agent) {
      setFormData({
        name: mode === 'duplicate' ? `${agent.name} (Copy)` : agent.name,
        description: agent.description || '',
        detailed_description: agent.detailed_description || '',
        github_repo_url: agent.github_repo_url || '',
        documentation_url: agent.documentation_url || '',
        demo_url: agent.demo_url || '',
        homepage_url: agent.homepage_url || '',
        tags: agent.tags || [],
        category_id: agent.category_id || '',
        language: agent.language || '',
        framework: agent.framework || '',
        license: agent.license || 'MIT',
        allow_comments: agent.allow_comments !== false,
      });
    }
  }, [agent, mode]);

  // Autosave functionality
  const autosave = useCallback(async () => {
    if (!autosaveEnabled || !user || mode === 'edit') return;
    
    // Don't autosave if form is empty or has minimal data
    if (!formData.name.trim() || formData.name.trim().length < 3) return;
    if (!formData.description.trim() || formData.description.trim().length < 10) return;
    
    setAutosaveStatus('saving');
    try {
      await saveDraft({ ...formData, id: agent?.id });
      setAutosaveStatus('saved');
      setLastSaved(new Date());
      
      // Clear saved status after 3 seconds
      setTimeout(() => {
        setAutosaveStatus('idle');
      }, 3000);
    } catch (err) {
      setAutosaveStatus('error');
      setTimeout(() => {
        setAutosaveStatus('idle');
      }, 3000);
    }
  }, [formData, autosaveEnabled, user, mode, agent?.id, saveDraft]);

  // Debounced autosave
  useEffect(() => {
    if (!autosaveEnabled) return;
    
    const timer = setTimeout(autosave, 2000);
    return () => clearTimeout(timer);
  }, [formData, autosave, autosaveEnabled]);

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 0: // Basic info
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (formData.name.trim().length < 3) errors.name = 'Name must be at least 3 characters';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (formData.description.trim().length < 10) errors.description = 'Description must be at least 10 characters';
        // Category required for publishing, optional for drafts
        if (!formData.category_id && mode !== 'draft') errors.category_id = 'Category is required';
        break;
      case 1: // Technical
        // Optional fields, no validation needed
        break;
      case 2: // Links
        if (formData.github_repo_url && !isValidGitHubUrl(formData.github_repo_url)) {
          errors.github_repo_url = 'Invalid GitHub URL';
        }
        if (formData.documentation_url && !isValidUrl(formData.documentation_url)) {
          errors.documentation_url = 'Invalid documentation URL';
        }
        if (formData.demo_url && !isValidUrl(formData.demo_url)) {
          errors.demo_url = 'Invalid demo URL';
        }
        if (formData.homepage_url && !isValidUrl(formData.homepage_url)) {
          errors.homepage_url = 'Invalid homepage URL';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidGitHubUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'github.com' && parsed.pathname.split('/').length >= 3;
    } catch {
      return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, FORM_STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const importFromGitHub = async () => {
    if (!formData.github_repo_url || !isValidGitHubUrl(formData.github_repo_url)) {
      return;
    }

    setGithubImporting(true);
    try {
      // Use the server-side GitHub import API for preview
      const response = await fetch(`/api/github/import?action=preview&url=${encodeURIComponent(formData.github_repo_url)}&readmeAsDescription=true&tagsFromTopics=true&versionFromReleases=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import from GitHub');
      }

      const { preview } = await response.json();

      if (preview) {
        // Update form data with imported info
        setFormData(prev => ({
          ...prev,
          name: prev.name || preview.name || '',
          description: prev.description || preview.description || '',
          detailed_description: prev.detailed_description || preview.detailed_description || '',
          homepage_url: prev.homepage_url || preview.homepage_url || '',
          documentation_url: prev.documentation_url || preview.documentation_url || '',
          demo_url: prev.demo_url || preview.demo_url || '',
          language: prev.language || preview.language || '',
          framework: prev.framework || preview.framework || '',
          license: prev.license || preview.license || 'MIT',
          tags: prev.tags.length > 0 ? prev.tags : preview.tags || [],
        }));

        // Show success feedback
        console.log('Successfully imported from GitHub:', preview);
      }
    } catch (err) {
      console.error('Failed to import from GitHub:', err);
      // Show error toast or notification
      alert(`Failed to import from GitHub: ${err.message}`);
    } finally {
      setGithubImporting(false);
    }
  };

  const handleSubmit = async (asDraft = false) => {
    if (!user) return;

    // Validate all steps for final submission
    if (!asDraft) {
      for (let i = 0; i < FORM_STEPS.length - 1; i++) {
        if (!validateStep(i)) {
          setCurrentStep(i);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setIsDraft(asDraft);

    try {
      console.log('Starting submit process...', { asDraft, formData });
      
      // Parse GitHub URL to extract owner and repo name
      let githubOwner = '';
      let githubRepoName = '';
      if (formData.github_repo_url) {
        const match = formData.github_repo_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (match) {
          githubOwner = match[1];
          githubRepoName = match[2].replace('.git', '');
        }
      }
      
      console.log('Parsed GitHub info:', { githubOwner, githubRepoName });

      const agentData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        detailed_description: formData.detailed_description.trim(),
        author_id: user.id,
        status: asDraft ? 'draft' as const : 'under_review' as const,
        version: agent?.version || '1.0.0',
        tags: formData.tags,
        category_id: formData.category_id || null,
        github_repo_url: formData.github_repo_url || undefined,
        github_repo_name: githubRepoName || undefined,
        github_owner: githubOwner || undefined,
        github_stars: agent?.github_stars || 0,
        github_forks: agent?.github_forks || 0,
        github_sync_enabled: !!formData.github_repo_url,
        documentation_url: formData.documentation_url || undefined,
        demo_url: formData.demo_url || undefined,
        homepage_url: formData.homepage_url || undefined,
        license: formData.license,
        language: formData.language || undefined,
        framework: formData.framework || undefined,
        featured: agent?.featured || false,
        allow_comments: formData.allow_comments,
      };

      console.log('Prepared agent data:', agentData);

      let result;
      
      if (asDraft) {
        console.log('Saving as draft...');
        result = await saveDraft(agent?.id ? { ...agentData, id: agent.id } : agentData);
      } else if (mode === 'edit' && agent?.id) {
        console.log('Updating existing agent...');
        result = await updateAgent(agent.id, agentData);
      } else {
        console.log('Creating new agent...');
        result = await createAgent(agentData);
      }
      
      console.log('Save result:', result);

      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push(`/agents/${result.id}`);
      }
    } catch (err) {
      console.error('Error submitting agent:', err);
      alert(`Error saving agent: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
      setIsDraft(false);
    }
  };

  const addTag = (tag?: string) => {
    const newTag = tag || tagInput.trim();
    if (newTag && !formData.tags.includes(newTag) && formData.tags.length < 20) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag],
      });
      setTagInput('');
      setShowTagSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    }
  };

  const updateFormData = (updates: Partial<AgentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const suggestedTags = POPULAR_TAGS.filter(tag => 
    tag.toLowerCase().includes(tagInput.toLowerCase()) && 
    !formData.tags.includes(tag)
  );

  const renderAutosaveStatus = () => {
    if (!autosaveEnabled) return null;

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {autosaveStatus === 'saving' && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {autosaveStatus === 'saved' && (
          <>
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Saved {lastSaved && `at ${lastSaved.toLocaleTimeString()}`}</span>
          </>
        )}
        {autosaveStatus === 'error' && (
          <>
            <XCircle className="h-3 w-3 text-red-500" />
            <span>Save failed</span>
          </>
        )}
        {autosaveStatus === 'idle' && lastSaved && (
          <>
            <Clock className="h-3 w-3" />
            <span>Last saved {lastSaved.toLocaleTimeString()}</span>
          </>
        )}
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="My Awesome Agent"
                error={validationErrors.name}
                maxLength={100}
              />
              {validationErrors.name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.name.length}/100 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="A brief description of what your agent does"
                error={validationErrors.description}
                maxLength={500}
              />
              {validationErrors.description && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category_id} onValueChange={(value) => updateFormData({ category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.category_id && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.category_id}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="detailed_description">Detailed Description</Label>
              <textarea
                id="detailed_description"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.detailed_description}
                onChange={(e) => updateFormData({ detailed_description: e.target.value })}
                placeholder="Provide a detailed explanation of your agent's capabilities, use cases, and how to use it..."
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground">
                {formData.detailed_description.length}/5000 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="relative">
                <div className="flex space-x-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(e.target.value.length > 0);
                    }}
                    onKeyPress={handleKeyPress}
                    onFocus={() => setShowTagSuggestions(tagInput.length > 0)}
                    placeholder="Add a tag and press Enter"
                    disabled={formData.tags.length >= 20}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addTag()} 
                    size="sm"
                    disabled={!tagInput.trim() || formData.tags.length >= 20}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Tag suggestions */}
                {showTagSuggestions && suggestedTags.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 z-10 mt-1">
                    <CardContent className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {suggestedTags.slice(0, 10).map(tag => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="cursor-pointer hover:bg-terminal-green hover:text-terminal-green-foreground"
                            onClick={() => addTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeTag(tag)}
                    >
                      <TagIcon className="h-3 w-3 mr-1" />
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.tags.length}/20 tags
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.allow_comments}
                  onCheckedChange={(checked) => updateFormData({ allow_comments: !!checked })}
                />
                Allow comments and reviews
              </Label>
              <p className="text-xs text-muted-foreground ml-6">
                Users can leave feedback and reviews on your agent
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Programming Language</Label>
                <Select value={formData.language} onValueChange={(value) => updateFormData({ language: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="framework">Framework/Library</Label>
                <Select value={formData.framework} onValueChange={(value) => updateFormData({ framework: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select framework" />
                  </SelectTrigger>
                  <SelectContent>
                    {FRAMEWORKS.map(framework => (
                      <SelectItem key={framework} value={framework}>{framework}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license">License</Label>
              <Select value={formData.license} onValueChange={(value) => updateFormData({ license: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select license" />
                </SelectTrigger>
                <SelectContent>
                  {LICENSES.map(license => (
                    <SelectItem key={license} value={license}>{license}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="github_repo_url">GitHub Repository URL</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Github className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="github_repo_url"
                    className="pl-10"
                    value={formData.github_repo_url}
                    onChange={(e) => updateFormData({ github_repo_url: e.target.value })}
                    placeholder="https://github.com/username/repo"
                    error={validationErrors.github_repo_url}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={importFromGitHub}
                  disabled={!formData.github_repo_url || !isValidGitHubUrl(formData.github_repo_url) || githubImporting}
                >
                  {githubImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Import className="h-4 w-4" />
                  )}
                  Import
                </Button>
              </div>
              {validationErrors.github_repo_url && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.github_repo_url}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Import repository information automatically
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentation_url">Documentation URL</Label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="documentation_url"
                  className="pl-10"
                  value={formData.documentation_url}
                  onChange={(e) => updateFormData({ documentation_url: e.target.value })}
                  placeholder="https://docs.example.com"
                  error={validationErrors.documentation_url}
                />
              </div>
              {validationErrors.documentation_url && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.documentation_url}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo_url">Demo/Live URL</Label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="demo_url"
                  className="pl-10"
                  value={formData.demo_url}
                  onChange={(e) => updateFormData({ demo_url: e.target.value })}
                  placeholder="https://demo.example.com"
                  error={validationErrors.demo_url}
                />
              </div>
              {validationErrors.demo_url && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.demo_url}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="homepage_url">Homepage URL</Label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="homepage_url"
                  className="pl-10"
                  value={formData.homepage_url}
                  onChange={(e) => updateFormData({ homepage_url: e.target.value })}
                  placeholder="https://example.com"
                  error={validationErrors.homepage_url}
                />
              </div>
              {validationErrors.homepage_url && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.homepage_url}
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Card className="border-2 border-dashed border-muted-foreground/25">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Agent Preview
                </CardTitle>
                <CardDescription>
                  Review how your agent will appear to users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">NAME</h4>
                  <p className="font-mono text-lg">{formData.name || 'Untitled Agent'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">DESCRIPTION</h4>
                  <p>{formData.description || 'No description provided'}</p>
                </div>

                {formData.detailed_description && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">DETAILED DESCRIPTION</h4>
                    <p className="text-sm whitespace-pre-wrap">{formData.detailed_description}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">CATEGORY</h4>
                  <p>{categories.find(c => c.id === formData.category_id)?.name || 'None selected'}</p>
                </div>

                {formData.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">TAGS</h4>
                    <div className="flex flex-wrap gap-1">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {formData.language && (
                    <div>
                      <span className="text-muted-foreground">Language:</span> {formData.language}
                    </div>
                  )}
                  {formData.framework && (
                    <div>
                      <span className="text-muted-foreground">Framework:</span> {formData.framework}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">License:</span> {formData.license}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Comments:</span> {formData.allow_comments ? 'Enabled' : 'Disabled'}
                  </div>
                </div>

                {(formData.github_repo_url || formData.documentation_url || formData.demo_url || formData.homepage_url) && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">LINKS</h4>
                    <div className="space-y-1">
                      {formData.github_repo_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <Github className="h-4 w-4" />
                          <span>GitHub Repository</span>
                        </div>
                      )}
                      {formData.documentation_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4" />
                          <span>Documentation</span>
                        </div>
                      )}
                      {formData.demo_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <ExternalLink className="h-4 w-4" />
                          <span>Live Demo</span>
                        </div>
                      )}
                      {formData.homepage_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <ExternalLink className="h-4 w-4" />
                          <span>Homepage</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with autosave status */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            {mode === 'create' ? 'Create Agent' : mode === 'edit' ? 'Edit Agent' : 'Duplicate Agent'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'create' ? 'Share your agent with the community' : 'Update your agent details'}
          </p>
        </div>
        {renderAutosaveStatus()}
      </div>

      {/* Step Navigation */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {FORM_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;
            
            return (
              <React.Fragment key={step.id}>
                <motion.div
                  className={cn(
                    "flex flex-col items-center space-y-2 px-4 py-2 rounded-lg transition-all cursor-pointer",
                    isActive 
                      ? 'bg-terminal-green/10 text-terminal-green border border-terminal-green/20' 
                      : isComplete
                      ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                      : 'text-muted-foreground hover:bg-muted/50'
                  )}
                  onClick={() => setCurrentStep(index)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center space-x-2">
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span className="font-mono text-sm hidden sm:inline">{step.title}</span>
                  </div>
                  <span className="text-xs text-center hidden md:block">{step.description}</span>
                </motion.div>
                
                {index < FORM_STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-px mx-4",
                    isComplete ? 'bg-terminal-green/30' : 'bg-border'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle>{FORM_STEPS[currentStep].title}</CardTitle>
          <CardDescription>
            {FORM_STEPS[currentStep].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <div>
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              Previous
            </Button>
          )}
        </div>

        <div className="flex space-x-4">
          {currentStep === FORM_STEPS.length - 1 ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
              >
                {isDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save as Draft
              </Button>
              <Button 
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
              >
                {isSubmitting && !isDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {mode === 'edit' ? 'Update Agent' : 'Submit for Review'}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button onClick={handleNext}>
                Next
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}