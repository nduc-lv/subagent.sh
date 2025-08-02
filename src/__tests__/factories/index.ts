import { faker } from '@faker-js/faker';

// Base factory interface
interface Factory<T> {
  build(overrides?: Partial<T>): T;
  buildList(count: number, overrides?: Partial<T>): T[];
}

// Generic factory implementation
class BaseFactory<T> implements Factory<T> {
  constructor(private generator: () => T) {}

  build(overrides: Partial<T> = {}): T {
    return { ...this.generator(), ...overrides };
  }

  buildList(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }
}

// User factory
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  github_username: string;
  bio?: string;
  website?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export const UserFactory = new BaseFactory<User>(() => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  avatar_url: faker.image.avatar(),
  github_username: faker.internet.userName(),
  bio: faker.lorem.sentence(),
  website: faker.internet.url(),
  location: faker.location.city(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}));

// Agent factory
export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  github_url: string;
  documentation_url?: string;
  website_url?: string;
  tags: string[];
  author_id: string;
  is_featured: boolean;
  status: 'draft' | 'published' | 'archived';
  version?: string;
  language?: string;
  license?: string;
  rating?: number;
  download_count: number;
  view_count: number;
  bookmark_count: number;
  created_at: string;
  updated_at: string;
}

const categories = [
  'productivity',
  'development',
  'content-creation',
  'data-analysis',
  'customer-support',
  'education',
  'finance',
  'marketing',
  'research',
  'design',
];

const tags = [
  'automation',
  'ai',
  'productivity',
  'development',
  'writing',
  'analysis',
  'support',
  'education',
  'finance',
  'marketing',
  'research',
  'design',
  'tools',
  'utilities',
  'integration',
];

export const AgentFactory = new BaseFactory<Agent>(() => ({
  id: faker.string.uuid(),
  name: faker.hacker.noun().replace(/\b\w/g, l => l.toUpperCase()) + ' Agent',
  description: faker.lorem.paragraph(),
  category: faker.helpers.arrayElement(categories),
  github_url: `https://github.com/${faker.internet.userName()}/${faker.helpers.slugify(faker.hacker.noun())}-agent`,
  documentation_url: faker.internet.url(),
  website_url: faker.internet.url(),
  tags: faker.helpers.arrayElements(tags, { min: 2, max: 5 }),
  author_id: faker.string.uuid(),
  is_featured: faker.datatype.boolean(),
  status: faker.helpers.arrayElement(['draft', 'published', 'archived']),
  version: faker.system.semver(),
  language: faker.helpers.arrayElement(['TypeScript', 'Python', 'JavaScript', 'Go', 'Rust']),
  license: faker.helpers.arrayElement(['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause']),
  rating: parseFloat(faker.number.float({ min: 1, max: 5, fractionDigits: 1 }).toFixed(1)),
  download_count: faker.number.int({ min: 0, max: 10000 }),
  view_count: faker.number.int({ min: 0, max: 50000 }),
  bookmark_count: faker.number.int({ min: 0, max: 1000 }),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}));

// Review factory
export interface Review {
  id: string;
  agent_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  helpful_count: number;
  status: 'pending' | 'published' | 'hidden';
  created_at: string;
  updated_at: string;
}

export const ReviewFactory = new BaseFactory<Review>(() => ({
  id: faker.string.uuid(),
  agent_id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  rating: faker.number.int({ min: 1, max: 5 }),
  title: faker.lorem.sentence(3),
  content: faker.lorem.paragraphs(2),
  helpful_count: faker.number.int({ min: 0, max: 100 }),
  status: faker.helpers.arrayElement(['pending', 'published', 'hidden']),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}));

// Collection factory
export interface Collection {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  is_public: boolean;
  agent_count: number;
  created_at: string;
  updated_at: string;
}

export const CollectionFactory = new BaseFactory<Collection>(() => ({
  id: faker.string.uuid(),
  name: faker.company.catchPhrase(),
  description: faker.lorem.sentence(),
  user_id: faker.string.uuid(),
  is_public: faker.datatype.boolean(),
  agent_count: faker.number.int({ min: 0, max: 50 }),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}));

// Bookmark factory
export interface Bookmark {
  id: string;
  user_id: string;
  agent_id: string;
  created_at: string;
}

export const BookmarkFactory = new BaseFactory<Bookmark>(() => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  agent_id: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
}));

// GitHub Repository factory
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  topics: string[];
  license?: {
    key: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export const GitHubRepositoryFactory = new BaseFactory<GitHubRepository>(() => {
  const name = faker.helpers.slugify(faker.hacker.noun()) + '-agent';
  const owner = faker.internet.userName();
  
  return {
    id: faker.number.int({ min: 1, max: 999999 }),
    name,
    full_name: `${owner}/${name}`,
    description: faker.lorem.sentence(),
    html_url: `https://github.com/${owner}/${name}`,
    clone_url: `https://github.com/${owner}/${name}.git`,
    ssh_url: `git@github.com:${owner}/${name}.git`,
    language: faker.helpers.arrayElement(['TypeScript', 'Python', 'JavaScript', 'Go', 'Rust']),
    stargazers_count: faker.number.int({ min: 0, max: 1000 }),
    forks_count: faker.number.int({ min: 0, max: 100 }),
    watchers_count: faker.number.int({ min: 0, max: 1000 }),
    open_issues_count: faker.number.int({ min: 0, max: 50 }),
    topics: faker.helpers.arrayElements(tags, { min: 1, max: 4 }),
    license: faker.datatype.boolean() ? {
      key: faker.helpers.arrayElement(['mit', 'apache-2.0', 'gpl-3.0', 'bsd-3-clause']),
      name: faker.helpers.arrayElement(['MIT License', 'Apache License 2.0', 'GNU General Public License v3.0', 'BSD 3-Clause License']),
    } : undefined,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    pushed_at: faker.date.recent().toISOString(),
  };
});

// Search Analytics factory
export interface SearchAnalytics {
  id: string;
  query: string;
  user_id?: string;
  results_count: number;
  clicked_agent_id?: string;
  session_id: string;
  created_at: string;
}

export const SearchAnalyticsFactory = new BaseFactory<SearchAnalytics>(() => ({
  id: faker.string.uuid(),
  query: faker.lorem.words(2),
  user_id: faker.datatype.boolean() ? faker.string.uuid() : undefined,
  results_count: faker.number.int({ min: 0, max: 100 }),
  clicked_agent_id: faker.datatype.boolean() ? faker.string.uuid() : undefined,
  session_id: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
}));

// Test scenario builders
export class TestScenarioBuilder {
  static createUserWithAgents(agentCount = 3) {
    const user = UserFactory.build();
    const agents = AgentFactory.buildList(agentCount, { author_id: user.id, status: 'published' });
    return { user, agents };
  }

  static createAgentWithReviews(reviewCount = 5) {
    const agent = AgentFactory.build({ status: 'published' });
    const reviews = ReviewFactory.buildList(reviewCount, { agent_id: agent.id, status: 'published' });
    return { agent, reviews };
  }

  static createUserWithBookmarksAndCollections() {
    const user = UserFactory.build();
    const agents = AgentFactory.buildList(5, { status: 'published' });
    const bookmarks = agents.slice(0, 3).map(agent => 
      BookmarkFactory.build({ user_id: user.id, agent_id: agent.id })
    );
    const collection = CollectionFactory.build({ 
      user_id: user.id, 
      agent_count: 2,
      is_public: true 
    });
    
    return { user, agents, bookmarks, collection };
  }

  static createSearchScenario() {
    const agents = AgentFactory.buildList(10, { status: 'published' });
    const searchQueries = [
      'productivity automation',
      'data analysis tools',
      'content writing assistant',
      'development utilities',
      'ai research helper',
    ];
    
    const searchAnalytics = searchQueries.map(query => 
      SearchAnalyticsFactory.build({ 
        query,
        results_count: faker.number.int({ min: 1, max: agents.length }),
        clicked_agent_id: faker.helpers.arrayElement(agents).id
      })
    );

    return { agents, searchAnalytics };
  }

  static createGitHubSyncScenario() {
    const user = UserFactory.build();
    const repositories = GitHubRepositoryFactory.buildList(5);
    const agents = repositories.map(repo => 
      AgentFactory.build({
        author_id: user.id,
        name: repo.name.replace('-agent', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        github_url: repo.html_url,
        tags: repo.topics,
        language: repo.language,
        status: 'published',
      })
    );

    return { user, repositories, agents };
  }
}

// Export all factories
export const factories = {
  User: UserFactory,
  Agent: AgentFactory,
  Review: ReviewFactory,
  Collection: CollectionFactory,
  Bookmark: BookmarkFactory,
  GitHubRepository: GitHubRepositoryFactory,
  SearchAnalytics: SearchAnalyticsFactory,
};

// Seeded data for consistent testing
export const createSeededData = () => {
  // Use a fixed seed for reproducible data
  faker.seed(123);

  return {
    users: UserFactory.buildList(5),
    agents: AgentFactory.buildList(20),
    reviews: ReviewFactory.buildList(50),
    collections: CollectionFactory.buildList(10),
    bookmarks: BookmarkFactory.buildList(30),
    repositories: GitHubRepositoryFactory.buildList(15),
    searchAnalytics: SearchAnalyticsFactory.buildList(100),
  };
};