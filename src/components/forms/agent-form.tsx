'use client';

import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAgentMutations, useCategories } from '@/hooks/use-database';
import { useAuth } from '@/contexts/auth-context';
import type { Agent } from '@/types';

interface AgentFormData {
  name: string;
  description: string;
  detailed_description: string;
  github_repo_url: string;
  documentation_url: string;
  demo_url: string;
  tags: string[];
  category_id: string;
  language: string;
  framework: string;
  license: string;
}

interface AgentFormProps {
  agent?: Agent | null;
  onSuccess?: (agent: Agent) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'duplicate';
}

const FORM_STEPS = [
  { id: 'basic', title: 'Basic Info', icon: FileText },
  { id: 'technical', title: 'Technical', icon: Settings },
  { id: 'links', title: 'Links', icon: ExternalLink },
  { id: 'preview', title: 'Preview', icon: Eye }
];

export function AgentForm({ agent, onSuccess, onCancel, mode = 'create' }: AgentFormProps) {
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
    tags: [],
    category_id: '',
    language: '',
    framework: '',
    license: 'MIT',
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
        tags: agent.tags || [],
        category_id: agent.category_id || '',
        language: agent.language || '',
        framework: agent.framework || '',
        license: agent.license || 'MIT',
      });
    }
  }, [agent, mode]);

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 0: // Basic info
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (!formData.category_id) errors.category_id = 'Category is required';
        break;
      case 1: // Technical
        // Optional fields, no validation needed
        break;
      case 2: // Links
        if (formData.github_repo_url && !isValidUrl(formData.github_repo_url)) {
          errors.github_repo_url = 'Invalid GitHub URL';
        }
        if (formData.documentation_url && !isValidUrl(formData.documentation_url)) {
          errors.documentation_url = 'Invalid documentation URL';
        }
        if (formData.demo_url && !isValidUrl(formData.demo_url)) {
          errors.demo_url = 'Invalid demo URL';
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

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, FORM_STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
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

      const agentData = {
        name: formData.name,
        description: formData.description,
        detailed_description: formData.detailed_description,
        author_id: user.id,
        status: asDraft ? 'draft' as const : 'under_review' as const,
        version: agent?.version || '1.0.0',
        tags: formData.tags,
        category_id: formData.category_id || undefined,
        github_repo_url: formData.github_repo_url || undefined,
        github_repo_name: githubRepoName || undefined,
        github_owner: githubOwner || undefined,
        github_stars: agent?.github_stars || 0,
        github_forks: agent?.github_forks || 0,
        github_sync_enabled: !!formData.github_repo_url,
        documentation_url: formData.documentation_url || undefined,
        demo_url: formData.demo_url || undefined,
        license: formData.license,
        language: formData.language || undefined,
        framework: formData.framework || undefined,
        featured: agent?.featured || false,
        allow_comments: agent?.allow_comments !== false,
      };

      let result;
      
      if (asDraft) {
        result = await saveDraft(agent?.id ? { ...agentData, id: agent.id } : agentData);
      } else if (mode === 'edit' && agent?.id) {
        result = await updateAgent(agent.id, agentData);
      } else {
        result = await createAgent(agentData);
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push(`/agents/${result.id}`);
      }
    } catch (err) {
      console.error('Error submitting agent:', err);
    } finally {
      setIsSubmitting(false);
      setIsDraft(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
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
    }
  };

  const updateFormData = (updates: Partial<AgentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
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
                placeholder="My Awesome Subagent"
                error={validationErrors.name}
              />
              {validationErrors.name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="A brief description of what your subagent does"
                error={validationErrors.description}
              />
              {validationErrors.description && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={formData.category_id}
                onChange={(e) => updateFormData({ category_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
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
                placeholder="Provide a detailed explanation of your subagent's capabilities, use cases, and how to use it..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex space-x-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
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
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Programming Language</Label>
                <Input
                  id="language"
                  value={formData.language}
                  onChange={(e) => updateFormData({ language: e.target.value })}
                  placeholder="Python, JavaScript, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="framework">Framework/Library</Label>
                <Input
                  id="framework"
                  value={formData.framework}
                  onChange={(e) => updateFormData({ framework: e.target.value })}
                  placeholder="React, FastAPI, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license">License</Label>
              <Input
                id="license"
                value={formData.license}
                onChange={(e) => updateFormData({ license: e.target.value })}
                placeholder="MIT, Apache 2.0, GPL-3.0, etc."
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="github_repo_url">GitHub Repository URL</Label>
              <div className="relative">
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
              {validationErrors.github_repo_url && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.github_repo_url}
                </p>
              )}
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Agent Preview</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">NAME</h4>
                  <p className="font-mono">{formData.name || 'Untitled Agent'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">DESCRIPTION</h4>
                  <p>{formData.description || 'No description provided'}</p>
                </div>

                {formData.detailed_description && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">DETAILED DESCRIPTION</h4>
                    <p className="text-sm">{formData.detailed_description}</p>
                  </div>
                )}

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
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
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
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-terminal-green/10 text-terminal-green border border-terminal-green/20' 
                      : isComplete
                      ? 'bg-muted text-muted-foreground'
                      : 'text-muted-foreground'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="font-mono text-sm">{step.title}</span>
                </motion.div>
                
                {index < FORM_STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${isComplete ? 'bg-terminal-green/30' : 'bg-border'}`} />
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
            {currentStep === 0 && "Provide the essential details about your subagent"}
            {currentStep === 1 && "Technical information and specifications"}
            {currentStep === 2 && "Links to your code, documentation, and demos"}
            {currentStep === 3 && "Review your agent before submitting"}
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