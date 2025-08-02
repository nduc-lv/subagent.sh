'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { GitHubImportForm } from '@/components/github/github-import-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, FileText, CheckCircle } from 'lucide-react';

function SubmitPageContent() {
  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-terminal-green via-blue-500 to-purple-500 bg-clip-text text-transparent">
          Submit Your Sub-Agent
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Import your Claude Code sub-agents directly from GitHub with intelligent scanning and selective import. Supports deep folder structures and strict format validation.
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <a 
            href="https://docs.anthropic.com/en/docs/claude-code/sub-agents" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            Learn How to Write Sub-Agents
          </a>
          <a 
            href="https://github.com/augmnt/agents" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-lg transition-colors"
          >
            <Github className="h-4 w-4" />
            View Example Structure
          </a>
        </div>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            How to Submit Sub-Agents
          </CardTitle>
          <CardDescription>
            Import sub-agents from GitHub repositories with deep folder scanning, selective agent import, and strict format validation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Github className="h-5 w-5 text-terminal-green" />
                <h3 className="font-semibold">1. Create GitHub Repo</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Structure your sub-agents as markdown files with YAML frontmatter containing required 'name' and 'description' fields. The system automatically scans all folders and subfolders, excludes documentation files like CLAUDE.md, and validates against the{' '}
                <a href="https://docs.anthropic.com/en/docs/claude-code/sub-agents" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  Claude Code specification
                </a>.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">2. Import via URL</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Use the import form below to add your GitHub repository. The system will scan all directories, discover valid sub-agents, and present a selection interface where you can choose which agents to import.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">3. Review & Submit</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Review the discovered agents, select which ones to import, and adjust category, visibility, and other settings before submitting for publication.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Form */}
      <GitHubImportForm />

      {/* Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Sub-Agent Guidelines</CardTitle>
          <CardDescription>
            Ensure your sub-agents meet these requirements for approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Required Structure</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Markdown files with YAML frontmatter (--- delimited)</li>
                <li>• Required 'name' field (lowercase-hyphen format)</li>
                <li>• Required 'description' field</li>
                <li>• Optional 'tools' field (comma-separated)</li>
                <li>• System prompt content (minimum 50 characters)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Import Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Deep folder scanning (all subdirectories)</li>
                <li>• Automatic exclusion of documentation files</li>
                <li>• Strict format validation before import</li>
                <li>• Selective agent import with preview</li>
                <li>• Support for single or batch repository import</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <AuthGuard>
      <SubmitPageContent />
    </AuthGuard>
  );
}