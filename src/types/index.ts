// Global types for the Subagents platform

// Enums
export type AgentStatus = 'draft' | 'published' | 'archived' | 'under_review';
export type VoteType = 'upvote' | 'downvote';
export type ReviewStatus = 'active' | 'hidden' | 'flagged';
export type ReviewCategory = 'usability' | 'documentation' | 'performance' | 'reliability' | 'overall';
export type ModerationAction = 'approve' | 'hide' | 'remove' | 'flag';
export type VerificationLevel = 'none' | 'email' | 'github' | 'verified_user';
export type ReviewFlagReason = 'spam' | 'inappropriate' | 'fake' | 'off_topic' | 'harassment' | 'other';

// Core entities
export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  website_url?: string;
  github_username?: string;
  twitter_username?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  color: string;
  agent_count: number;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string;
  content: string;
  short_description?: string;
  category_id?: string;
  author_id: string;
  status: AgentStatus;
  version: string;
  tags: string[];
  
  // Sub-agent specific fields
  agent_type: 'subagent' | 'tool' | 'integration';
  tools: string[];
  file_path?: string; // path to the .md file in the repo
  raw_markdown?: string; // the raw markdown content
  parsed_metadata: Record<string, any>; // extracted metadata from frontmatter
  
  // GitHub integration (required for import-only flow)
  github_url?: string;
  github_repo_name?: string;
  github_owner?: string;
  github_stars: number;
  github_forks: number;
  github_issues: number;
  github_last_updated?: string;
  github_language?: string;
  github_topics: string[];
  github_license?: string;
  sync_enabled: boolean;
  last_github_sync?: string;
  github_sha?: string; // GitHub commit SHA for tracking changes
  
  // Original Author Attribution (for imported agents)
  original_author_github_username?: string;
  original_author_github_url?: string;
  original_author_avatar_url?: string;
  github_owner_avatar_url?: string;
  imported_by?: string; // User ID who imported this agent
  import_source?: 'manual' | 'github_import' | 'api';
  github_import_hash?: string; // For deduplication
  
  // Metadata
  requirements: string[];
  installation_instructions?: string;
  usage_examples?: string;
  compatibility_notes?: string;
  
  // Stats
  download_count: number;
  view_count: number;
  bookmark_count: number;
  rating_average: number;
  rating_count: number;
  
  // Settings
  is_featured: boolean;
  is_verified: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  user_id?: string;
  is_public: boolean;
  slug?: string;
  agent_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionAgent {
  id: string;
  collection_id?: string;
  agent_id?: string;
  position: number;
  added_at: string;
}

// Enhanced Review interface
export interface Review {
  id: string;
  agent_id: string;
  user_id: string;
  
  // Rating system
  overall_rating: number;
  usability_rating?: number;
  documentation_rating?: number;
  performance_rating?: number;
  reliability_rating?: number;
  
  // Content
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  use_case?: string;
  
  // Metadata
  status: ReviewStatus;
  verification_level: VerificationLevel;
  is_verified_purchase: boolean;
  
  // Engagement
  helpful_count: number;
  not_helpful_count: number;
  total_votes: number;
  quality_score: number;
  
  // Images and attachments
  image_urls?: string[];
  
  // Moderation
  flagged_count: number;
  last_flagged_at?: string;
  moderation_notes?: string;
  moderated_by?: string;
  moderated_at?: string;
  
  // Edit tracking
  edit_count: number;
  last_edited_at?: string;
  edit_reason?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Populated fields
  user?: Profile;
  agent?: Agent;
  response?: ReviewResponse;
  user_vote?: ReviewVote;
}

// Review-related interfaces
export interface ReviewResponse {
  id: string;
  review_id: string;
  user_id: string;
  content: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface ReviewVote {
  id: string;
  review_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: string;
}

export interface ReviewFlag {
  id: string;
  review_id: string;
  user_id: string;
  reason: ReviewFlagReason;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface ReviewDraft {
  id: string;
  agent_id: string;
  user_id: string;
  overall_rating?: number;
  usability_rating?: number;
  documentation_rating?: number;
  performance_rating?: number;
  reliability_rating?: number;
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  use_case?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewEditHistory {
  id: string;
  review_id: string;
  title_before?: string;
  content_before?: string;
  title_after?: string;
  content_after?: string;
  edit_reason?: string;
  edited_by?: string;
  created_at: string;
}

export interface ReviewAnalytics {
  id: string;
  agent_id: string;
  period_start: string;
  period_end: string;
  total_reviews: number;
  new_reviews: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
  avg_usability_rating: number;
  avg_documentation_rating: number;
  avg_performance_rating: number;
  avg_reliability_rating: number;
  total_votes: number;
  helpful_votes: number;
  response_rate: number;
  verified_reviews: number;
  flagged_reviews: number;
  created_at: string;
}

export interface ReviewStatistics {
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
  category_ratings: {
    usability: number;
    documentation: number;
    performance: number;
    reliability: number;
  };
  recent_reviews: number;
  verified_reviews: number;
  response_rate: number;
}

export interface ReviewFilters {
  rating?: number[];
  verification_level?: VerificationLevel[];
  has_response?: boolean;
  sort_by?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful' | 'quality';
  category?: ReviewCategory;
  search?: string;
  verified_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface Vote {
  id: string;
  user_id?: string;
  agent_id?: string;
  review_id?: string;
  vote_type: VoteType;
  created_at: string;
}

export interface AgentDownload {
  id: string;
  agent_id?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  download_type: string;
  created_at: string;
}

export interface AgentView {
  id: string;
  agent_id?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  session_id?: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id?: string;
  following_id?: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id?: string;
  agent_id?: string;
  created_at: string;
}

export interface GitHubSyncLog {
  id: string;
  agent_id?: string;
  status: string;
  message?: string;
  data?: any;
  started_at: string;
  completed_at?: string;
}

// Enhanced GitHub Integration Types
export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubUser;
  html_url: string;
  description?: string;
  fork: boolean;
  url: string;
  archive_url: string;
  assignees_url: string;
  blobs_url: string;
  branches_url: string;
  collaborators_url: string;
  comments_url: string;
  commits_url: string;
  compare_url: string;
  contents_url: string;
  contributors_url: string;
  deployments_url: string;
  downloads_url: string;
  events_url: string;
  forks_url: string;
  git_commits_url: string;
  git_refs_url: string;
  git_tags_url: string;
  git_url: string;
  issue_comment_url: string;
  issue_events_url: string;
  issues_url: string;
  keys_url: string;
  labels_url: string;
  languages_url: string;
  merges_url: string;
  milestones_url: string;
  notifications_url: string;
  pulls_url: string;
  releases_url: string;
  ssh_url: string;
  clone_url: string;
  svn_url: string;
  homepage?: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language?: string;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_downloads: boolean;
  has_discussions: boolean;
  forks_count: number;
  mirror_url?: string;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license?: GitHubLicense;
  allow_forking: boolean;
  is_template: boolean;
  web_commit_signoff_required: boolean;
  topics: string[];
  visibility: 'public' | 'private' | 'internal';
  forks: number;
  open_issues: number;
  watchers: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id?: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: 'User' | 'Organization';
  site_admin: boolean;
  name?: string;
  company?: string;
  blog?: string;
  location?: string;
  email?: string;
  bio?: string;
  twitter_username?: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubLicense {
  key: string;
  name: string;
  spdx_id?: string;
  url?: string;
  node_id: string;
}

export interface GitHubCommit {
  sha: string;
  node_id: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    url: string;
    comment_count: number;
    verification: {
      verified: boolean;
      reason: string;
      signature?: string;
      payload?: string;
    };
  };
  url: string;
  html_url: string;
  comments_url: string;
  author?: GitHubUser;
  committer?: GitHubUser;
  parents: Array<{
    sha: string;
    url: string;
    html_url: string;
  }>;
}

export interface GitHubRelease {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  author: GitHubUser;
  node_id: string;
  tag_name: string;
  target_commitish: string;
  name?: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at?: string;
  assets: GitHubReleaseAsset[];
  tarball_url: string;
  zipball_url: string;
  body?: string;
  discussion_url?: string;
  reactions?: {
    url: string;
    total_count: number;
    '+1': number;
    '-1': number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
}

export interface GitHubReleaseAsset {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label?: string;
  uploader: GitHubUser;
  content_type: string;
  state: 'uploaded' | 'open';
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
  protection?: {
    url: string;
    enabled: boolean;
  };
  protection_url: string;
}

export interface GitHubWebhookEvent {
  action: string;
  repository: GitHubRepository;
  sender: GitHubUser;
  installation?: {
    id: number;
    node_id: string;
  };
}

export interface GitHubIssue {
  id: number;
  node_id: string;
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  number: number;
  state: 'open' | 'closed';
  title: string;
  body?: string;
  user: GitHubUser;
  labels: GitHubLabel[];
  assignee?: GitHubUser;
  assignees: GitHubUser[];
  milestone?: GitHubMilestone;
  locked: boolean;
  active_lock_reason?: string;
  comments: number;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  author_association: string;
  state_reason?: string;
}

export interface GitHubLabel {
  id: number;
  node_id: string;
  url: string;
  name: string;
  color: string;
  default: boolean;
  description?: string;
}

export interface GitHubMilestone {
  url: string;
  html_url: string;
  labels_url: string;
  id: number;
  node_id: string;
  number: number;
  state: 'open' | 'closed';
  title: string;
  description?: string;
  creator: GitHubUser;
  open_issues: number;
  closed_issues: number;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  due_on?: string;
}

export interface GitHubPullRequest {
  id: number;
  node_id: string;
  url: string;
  html_url: string;
  diff_url: string;
  patch_url: string;
  issue_url: string;
  commits_url: string;
  review_comments_url: string;
  review_comment_url: string;
  comments_url: string;
  statuses_url: string;
  number: number;
  state: 'open' | 'closed';
  locked: boolean;
  title: string;
  user: GitHubUser;
  body?: string;
  labels: GitHubLabel[];
  milestone?: GitHubMilestone;
  active_lock_reason?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  assignee?: GitHubUser;
  assignees: GitHubUser[];
  requested_reviewers: GitHubUser[];
  head: {
    label: string;
    ref: string;
    sha: string;
    user: GitHubUser;
    repo: GitHubRepository;
  };
  base: {
    label: string;
    ref: string;
    sha: string;
    user: GitHubUser;
    repo: GitHubRepository;
  };
  author_association: string;
  auto_merge?: any;
  draft: boolean;
  merged: boolean;
  mergeable?: boolean;
  rebaseable?: boolean;
  mergeable_state: string;
  merged_by?: GitHubUser;
  comments: number;
  review_comments: number;
  maintainer_can_modify: boolean;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

// Platform-specific GitHub Integration Types
export interface GitHubIntegrationConfig {
  id: string;
  user_id: string;
  github_user_id: number;
  github_username: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  scopes: string[];
  installation_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepositorySync {
  id: string;
  agent_id: string;
  repository_id: number;
  repository_full_name: string;
  sync_enabled: boolean;
  auto_update: boolean;
  webhook_id?: number;
  last_sync_at?: string;
  last_commit_sha?: string;
  sync_status: 'pending' | 'syncing' | 'success' | 'error' | 'disabled';
  sync_error?: string;
  config: {
    branch?: string;
    path?: string;
    readme_as_description?: boolean;
    tags_from_topics?: boolean;
    version_from_releases?: boolean;
    auto_publish?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface GitHubSyncJob {
  id: string;
  repository_sync_id: string;
  job_type: 'full_sync' | 'incremental_sync' | 'webhook_sync';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  progress: number;
  logs: GitHubSyncJobLog[];
  metadata: {
    commits_processed?: number;
    files_updated?: number;
    errors?: string[];
  };
  created_at: string;
}

export interface GitHubSyncJobLog {
  id: string;
  sync_job_id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: any;
  created_at: string;
}

export interface GitHubRepositoryMetrics {
  id: string;
  repository_sync_id: string;
  period_start: string;
  period_end: string;
  commits_count: number;
  contributors_count: number;
  issues_opened: number;
  issues_closed: number;
  pull_requests_opened: number;
  pull_requests_merged: number;
  stars_gained: number;
  forks_gained: number;
  code_frequency: Array<{
    week: string;
    additions: number;
    deletions: number;
  }>;
  languages: Record<string, number>;
  created_at: string;
}

export interface GitHubWebhookPayload {
  id: string;
  webhook_id: number;
  event_type: string;
  action?: string;
  payload: any;
  signature: string;
  delivery_id: string;
  processed: boolean;
  processed_at?: string;
  error?: string;
  created_at: string;
}

export interface GitHubApiQuota {
  id: string;
  user_id: string;
  rate_limit_remaining: number;
  rate_limit_reset: string;
  core_remaining: number;
  core_reset: string;
  search_remaining: number;
  search_reset: string;
  graphql_remaining: number;
  graphql_reset: string;
  integration_manifest_remaining: number;
  integration_manifest_reset: string;
  source_import_remaining: number;
  source_import_reset: string;
  updated_at: string;
}

export interface GitHubRepositoryAnalysis {
  id: string;
  repository_sync_id: string;
  analysis_type: 'dependency' | 'security' | 'quality' | 'performance';
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: {
    dependencies?: Array<{
      name: string;
      version: string;
      type: 'production' | 'development';
      vulnerabilities?: number;
    }>;
    security_issues?: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      type: string;
      description: string;
      file?: string;
      line?: number;
    }>;
    quality_metrics?: {
      maintainability_index: number;
      cyclomatic_complexity: number;
      code_coverage?: number;
      test_count?: number;
    };
    performance_metrics?: {
      bundle_size?: number;
      load_time?: number;
      lighthouse_score?: number;
    };
  };
  analyzed_at: string;
  created_at: string;
}

export interface GitHubUserProfile {
  id: string;
  user_id: string;
  github_user_id: number;
  github_username: string;
  github_name?: string;
  github_bio?: string;
  github_location?: string;
  github_company?: string;
  github_blog?: string;
  github_twitter?: string;
  public_repos: number;
  followers: number;
  following: number;
  verified: boolean;
  sync_enabled: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export type GitHubSyncEvent = 
  | 'repository.created'
  | 'repository.updated'
  | 'repository.deleted'
  | 'repository.publicized'
  | 'repository.privatized'
  | 'push'
  | 'release.published'
  | 'release.updated'
  | 'release.deleted'
  | 'issues.opened'
  | 'issues.closed'
  | 'pull_request.opened'
  | 'pull_request.closed'
  | 'pull_request.merged'
  | 'star.created'
  | 'star.deleted'
  | 'fork'
  | 'watch.started'
  | 'watch.stopped';

export interface GitHubSyncEventHandler {
  event: GitHubSyncEvent;
  handler: (payload: any, context: { repository_sync: GitHubRepositorySync }) => Promise<void>;
}

export interface GitHubImportResult {
  success: boolean;
  agent?: Agent; // For backward compatibility
  agents?: Agent[]; // Multiple sub-agents from repository
  repository?: GitHubRepository;
  errors?: string[];
  warnings?: string[];
  metadata: {
    processing_time_ms: number;
    files_processed: number;
    features_detected: string[];
  };
}

// Legacy types for backward compatibility
export interface SubAgent extends Agent {}
export interface User extends Profile {}

export interface SearchFilters {
  category?: string;
  tags?: string[];
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'newest' | 'updated' | 'trending';
  query?: string;
  status?: AgentStatus;
  featured?: boolean;
  language?: string;
  languages?: string[];
  framework?: string;
  frameworks?: string[];
  ratingMin?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface EnhancedSearchFilters extends SearchFilters {
  limit?: number;
  offset?: number;
  userId?: string;
  sessionId?: string;
}

export interface SearchResult extends Agent {
  category_name?: string;
  category_slug?: string;
  category_icon?: string;
  category_color?: string;
  author_username?: string;
  author_full_name?: string;
  author_avatar_url?: string;
  search_rank?: number;
  is_bookmarked?: boolean;
}

export interface TrendingAgent {
  id: string;
  name: string;
  description?: string;
  category_name?: string;
  author_username?: string;
  rating_average: number;
  download_count: number;
  recent_downloads: number;
  trend_score: number;
}

// New search-related types
export interface SearchAnalytics {
  id: string;
  query: string;
  user_id?: string;
  session_id?: string;
  filters: Record<string, any>;
  result_count: number;
  clicked_agent_id?: string;
  search_time_ms?: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  query?: string;
  filters: Record<string, any>;
  is_alert: boolean;
  alert_frequency: 'daily' | 'weekly' | 'monthly';
  last_alert_sent?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchSuggestion {
  suggestion: string;
  frequency: number;
}

export interface SearchFacets {
  categories: Array<{ name: string; value: string; count: number; id?: string; slug?: string; icon?: string; color?: string }>;
  languages: Array<{ name: string; count: number }>;
  frameworks: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  facets: SearchFacets | null;
  totalResults: number;
  currentPage: number;
  hasMore: boolean;
  suggestions: SearchSuggestion[];
  recentSearches: string[];
  savedSearches: SavedSearch[];
}

// UI Types
export interface Theme {
  mode: 'light' | 'dark' | 'system';
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

// Database types for Supabase
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'agent_count'>;
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
      };
      agents: {
        Row: Agent;
        Insert: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'download_count' | 'view_count' | 'rating_average' | 'rating_count'>;
        Update: Partial<Omit<Agent, 'id' | 'created_at'>>;
      };
      collections: {
        Row: Collection;
        Insert: Omit<Collection, 'id' | 'created_at' | 'updated_at' | 'agent_count'>;
        Update: Partial<Omit<Collection, 'id' | 'created_at'>>;
      };
      collection_agents: {
        Row: CollectionAgent;
        Insert: Omit<CollectionAgent, 'id' | 'added_at'>;
        Update: Partial<Omit<CollectionAgent, 'id' | 'added_at'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at' | 'updated_at' | 'helpful_count'>;
        Update: Partial<Omit<Review, 'id' | 'created_at'>>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at'>;
        Update: Partial<Omit<Vote, 'id' | 'created_at'>>;
      };
      agent_downloads: {
        Row: AgentDownload;
        Insert: Omit<AgentDownload, 'id' | 'created_at'>;
        Update: never;
      };
      agent_views: {
        Row: AgentView;
        Insert: Omit<AgentView, 'id' | 'created_at'>;
        Update: never;
      };
      follows: {
        Row: Follow;
        Insert: Omit<Follow, 'id' | 'created_at'>;
        Update: never;
      };
      bookmarks: {
        Row: Bookmark;
        Insert: Omit<Bookmark, 'id' | 'created_at'>;
        Update: never;
      };
      github_sync_log: {
        Row: GitHubSyncLog;
        Insert: Omit<GitHubSyncLog, 'id' | 'started_at'>;
        Update: Partial<Omit<GitHubSyncLog, 'id' | 'started_at'>>;
      };
    };
    Functions: {
      search_agents: {
        Args: {
          search_query?: string;
          category_filter?: string;
          tag_filters?: string[];
          sort_by?: string;
          limit_count?: number;
          offset_count?: number;
        };
        Returns: SearchResult[];
      };
      get_trending_agents: {
        Args: {
          days_back?: number;
          limit_count?: number;
        };
        Returns: TrendingAgent[];
      };
      sync_github_repo: {
        Args: {
          agent_uuid: string;
          repo_data: any;
        };
        Returns: boolean;
      };
      calculate_agent_rating: {
        Args: {
          agent_uuid: string;
        };
        Returns: {
          average_rating: number;
          total_reviews: number;
        }[];
      };
    };
  };
};
