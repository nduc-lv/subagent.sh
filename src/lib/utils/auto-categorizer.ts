/**
 * Automatic categorization system for imported agents
 * Analyzes agent metadata to assign the most suitable category
 */

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface Agent {
  name: string;
  description?: string;
  tags?: string[];
  github_language?: string;
  github_topics?: string[];
}

// Category keywords mapping
const CATEGORY_KEYWORDS = {
  'web-development': [
    'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'gatsby', 'webpack', 'vite',
    'html', 'css', 'javascript', 'typescript', 'frontend', 'backend', 'fullstack',
    'web', 'website', 'webapp', 'express', 'fastapi', 'django', 'flask', 'node.js',
    'server', 'client', 'browser', 'http', 'rest', 'graphql'
  ],
  'ai-ml': [
    'ai', 'ml', 'machine learning', 'artificial intelligence', 'neural network',
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
    'deep learning', 'nlp', 'computer vision', 'model', 'training', 'inference',
    'llm', 'gpt', 'claude', 'openai', 'huggingface', 'transformers'
  ],
  'data-science': [
    'data', 'analytics', 'visualization', 'pandas', 'numpy', 'matplotlib',
    'seaborn', 'plotly', 'jupyter', 'notebook', 'analysis', 'statistics',
    'data mining', 'big data', 'etl', 'pipeline', 'spark', 'hadoop'
  ],
  'api-tools': [
    'api', 'rest', 'graphql', 'swagger', 'openapi', 'postman', 'endpoint',
    'webhook', 'http', 'json', 'xml', 'soap', 'microservice', 'service'
  ],
  'testing': [
    'test', 'testing', 'unit', 'integration', 'e2e', 'playwright', 'selenium',
    'jest', 'mocha', 'chai', 'cypress', 'testing-library', 'qa', 'coverage',
    'mock', 'stub', 'fixture'
  ],
  'automation': [
    'automation', 'workflow', 'ci/cd', 'github actions', 'jenkins', 'deploy',
    'pipeline', 'build', 'script', 'cron', 'scheduler', 'task', 'runner'
  ],
  'devops': [
    'devops', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform',
    'ansible', 'helm', 'infrastructure', 'deployment', 'monitoring', 'logging',
    'prometheus', 'grafana', 'elk', 'container', 'orchestration'
  ],
  'database': [
    'database', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite',
    'orm', 'migration', 'schema', 'query', 'nosql', 'graph', 'db'
  ],
  'security': [
    'security', 'auth', 'authentication', 'authorization', 'oauth', 'jwt',
    'encryption', 'ssl', 'tls', 'vulnerability', 'scan', 'pentest', 'firewall',
    'compliance', 'audit', 'csrf', 'xss', 'sql injection'
  ],
  'mobile-development': [
    'mobile', 'ios', 'android', 'react native', 'flutter', 'xamarin',
    'swift', 'kotlin', 'objective-c', 'app', 'mobile app', 'smartphone'
  ],
  'blockchain': [
    'blockchain', 'crypto', 'bitcoin', 'ethereum', 'smart contract', 'defi',
    'nft', 'web3', 'solidity', 'dapp', 'wallet', 'token', 'mining'
  ],
  'gaming': [
    'game', 'gaming', 'unity', 'unreal', 'godot', 'phaser', 'game engine',
    '2d', '3d', 'graphics', 'animation', 'physics', 'multiplayer'
  ],
  'design': [
    'design', 'ui', 'ux', 'figma', 'sketch', 'adobe', 'photoshop', 'illustrator',
    'graphics', 'logo', 'branding', 'mockup', 'wireframe', 'prototype'
  ],
  'productivity': [
    'productivity', 'todo', 'task', 'note', 'calendar', 'time', 'management',
    'organization', 'workflow', 'efficiency', 'planner', 'reminder'
  ],
  'communication': [
    'chat', 'messaging', 'slack', 'discord', 'telegram', 'whatsapp',
    'notification', 'email', 'sms', 'bot', 'chatbot', 'communication'
  ],
  'content-management': [
    'cms', 'content', 'blog', 'wordpress', 'drupal', 'strapi', 'ghost',
    'publishing', 'editor', 'markdown', 'documentation', 'wiki'
  ],
  'ecommerce': [
    'ecommerce', 'e-commerce', 'shop', 'store', 'payment', 'stripe', 'paypal',
    'cart', 'checkout', 'inventory', 'product', 'order', 'retail'
  ],
  'analytics': [
    'analytics', 'tracking', 'metrics', 'google analytics', 'mixpanel',
    'amplitude', 'segment', 'dashboard', 'reporting', 'insights', 'kpi'
  ],
  'development-tools': [
    'development', 'dev', 'tools', 'cli', 'command line', 'editor', 'ide',
    'vscode', 'vim', 'emacs', 'git', 'version control', 'build', 'compiler'
  ],
  'finance': [
    'finance', 'fintech', 'banking', 'trading', 'investment', 'accounting',
    'budget', 'invoice', 'tax', 'money', 'financial', 'economic'
  ],
  'healthcare': [
    'health', 'healthcare', 'medical', 'patient', 'hospital', 'doctor',
    'medicine', 'diagnosis', 'treatment', 'clinical', 'pharmacy'
  ],
  'education': [
    'education', 'learning', 'school', 'university', 'course', 'tutorial',
    'training', 'teaching', 'student', 'academic', 'classroom'
  ],
  'iot': [
    'iot', 'internet of things', 'sensor', 'arduino', 'raspberry pi',
    'embedded', 'hardware', 'device', 'mqtt', 'smart home'
  ],
  'documentation': [
    'documentation', 'docs', 'readme', 'api docs', 'guide', 'manual',
    'specification', 'wiki', 'knowledge base', 'help'
  ],
  'utilities': [
    'utility', 'utils', 'helper', 'tool', 'converter', 'generator',
    'formatter', 'validator', 'parser', 'scraper', 'crawler'
  ]
};

// Language to category mapping
const LANGUAGE_CATEGORY_MAP: Record<string, string[]> = {
  'JavaScript': ['web-development', 'api-tools', 'development-tools'],
  'TypeScript': ['web-development', 'api-tools', 'development-tools'],
  'Python': ['ai-ml', 'data-science', 'automation', 'api-tools'],
  'Java': ['api-tools', 'development-tools', 'mobile-development'],
  'C#': ['development-tools', 'api-tools', 'gaming'],
  'Go': ['api-tools', 'devops', 'development-tools'],
  'Rust': ['development-tools', 'api-tools', 'utilities'],
  'PHP': ['web-development', 'api-tools'],
  'Ruby': ['web-development', 'api-tools', 'automation'],
  'Swift': ['mobile-development', 'development-tools'],
  'Kotlin': ['mobile-development', 'development-tools'],
  'Dart': ['mobile-development', 'web-development'],
  'C++': ['development-tools', 'gaming', 'utilities'],
  'C': ['development-tools', 'utilities', 'iot'],
  'Shell': ['automation', 'devops', 'utilities'],
  'Dockerfile': ['devops', 'automation'],
  'SQL': ['database', 'analytics'],
  'HTML': ['web-development', 'design'],
  'CSS': ['web-development', 'design'],
  'Solidity': ['blockchain'],
  'R': ['data-science', 'analytics'],
  'MATLAB': ['data-science', 'analytics'],
  'Jupyter Notebook': ['data-science', 'ai-ml']
};

/**
 * Calculates a confidence score for a category based on keywords found
 */
function calculateCategoryScore(
  agent: Agent, 
  categorySlug: string, 
  keywords: string[]
): number {
  let score = 0;
  const searchText = [
    agent.name,
    agent.description,
    ...(agent.tags || []),
    ...(agent.github_topics || [])
  ].join(' ').toLowerCase();

  // Check for keyword matches
  for (const keyword of keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      // Weight keywords by importance
      if (agent.name.toLowerCase().includes(keyword.toLowerCase())) {
        score += 5; // Name matches are most important
      } else if (agent.description?.toLowerCase().includes(keyword.toLowerCase())) {
        score += 3; // Description matches are important
      } else if (agent.tags?.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))) {
        score += 2; // Tag matches are moderately important
      } else {
        score += 1; // Other matches
      }
    }
  }

  // Language bonus
  if (agent.github_language) {
    const languageCategories = LANGUAGE_CATEGORY_MAP[agent.github_language] || [];
    if (languageCategories.includes(categorySlug)) {
      score += 2;
    }
  }

  return score;
}

/**
 * Automatically categorizes an agent based on its metadata
 */
export function autoCategorizAgent(agent: Agent, categories: Category[]): string | null {
  const categoryScores: Array<{ id: string, slug: string, score: number }> = [];

  // Calculate scores for each category
  for (const category of categories) {
    const keywords = CATEGORY_KEYWORDS[category.slug as keyof typeof CATEGORY_KEYWORDS] || [];
    const score = calculateCategoryScore(agent, category.slug, keywords);
    
    if (score > 0) {
      categoryScores.push({
        id: category.id,
        slug: category.slug,
        score
      });
    }
  }

  // Sort by score and return the best match
  categoryScores.sort((a, b) => b.score - a.score);
  
  // Only return a category if we have reasonable confidence (score >= 2)
  if (categoryScores.length > 0 && categoryScores[0].score >= 2) {
    return categoryScores[0].id;
  }

  // Default fallback categories based on common patterns
  const searchText = [agent.name, agent.description || ''].join(' ').toLowerCase();
  
  // Check for common patterns
  if (searchText.includes('bot') || searchText.includes('chat')) {
    return categories.find(c => c.slug === 'communication')?.id || null;
  }
  
  if (searchText.includes('cli') || searchText.includes('command')) {
    return categories.find(c => c.slug === 'development-tools')?.id || null;
  }

  // If no good match found, return null (will need manual categorization)
  return null;
}

/**
 * Batch categorize multiple agents
 */
export function batchCategorizeAgents(agents: Agent[], categories: Category[]): Record<string, string | null> {
  const results: Record<string, string | null> = {};
  
  for (const agent of agents) {
    results[agent.name] = autoCategorizAgent(agent, categories);
  }
  
  return results;
}

/**
 * Get categorization confidence level
 */
export function getCategorizationConfidence(agent: Agent, categories: Category[], categoryId: string): 'high' | 'medium' | 'low' {
  const category = categories.find(c => c.id === categoryId);
  if (!category) return 'low';
  
  const keywords = CATEGORY_KEYWORDS[category.slug as keyof typeof CATEGORY_KEYWORDS] || [];
  const score = calculateCategoryScore(agent, category.slug, keywords);
  
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}