import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  // Basic patterns
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  username: /^[a-zA-Z0-9_-]{3,20}$/,
  safeString: /^[a-zA-Z0-9\s\-_.,()'":;!?]*$/,
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/,
  github_url: /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/,
  
  // SQL injection patterns (to detect and block)
  sqlInjection: [
    /('|(\\')|(;|--)|(\s*(union|select|insert|update|delete|drop|alter|exec|execute)\s+)/i,
    /(script|javascript|vbscript|onload|onerror|onclick)/i,
    /(\<|\>|&lt;|&gt;)/,
    /(exec\s*\(|eval\s*\()/i,
  ],
  
  // XSS patterns (to detect and block)
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
  ],
} as const;

/**
 * Zod schemas for common input types
 */
export const CommonSchemas = {
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(ValidationPatterns.slug, 'Invalid slug format'),
    
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(ValidationPatterns.username, 'Username can only contain letters, numbers, underscores, and hyphens'),
    
  safeString: z.string()
    .min(1, 'String is required')
    .max(1000, 'String too long')
    .regex(ValidationPatterns.safeString, 'String contains invalid characters'),
    
  url: z.string()
    .url('Invalid URL format')
    .max(2000, 'URL too long'),
    
  githubUrl: z.string()
    .regex(ValidationPatterns.github_url, 'Must be a valid GitHub repository URL'),
    
  email: z.string()
    .email('Invalid email format')
    .max(320, 'Email too long'), // RFC 5321 limit
    
  description: z.string()
    .min(1, 'Description is required')
    .max(5000, 'Description too long'),
    
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long'),
    
  tags: z.array(z.string().min(1).max(50))
    .max(20, 'Too many tags')
    .refine(tags => tags.every(tag => ValidationPatterns.safeString.test(tag)), {
      message: 'Tags contain invalid characters'
    }),
} as const;

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(dirty: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
}): string {
  const defaultOptions = {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'code', 'pre'],
    allowedAttributes: {
      a: ['href', 'title'],
      code: ['class'],
      pre: ['class'],
    },
  };
  
  const config = { ...defaultOptions, ...options };
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: config.allowedTags,
    ALLOWED_ATTR: Object.keys(config.allowedAttributes).reduce((acc, tag) => {
      config.allowedAttributes[tag].forEach(attr => {
        if (!acc.includes(attr)) acc.push(attr);
      });
      return acc;
    }, [] as string[]),
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}

/**
 * Check if string contains SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  return ValidationPatterns.sqlInjection.some(pattern => pattern.test(input));
}

/**
 * Check if string contains XSS patterns
 */
export function containsXss(input: string): boolean {
  return ValidationPatterns.xss.some(pattern => pattern.test(input));
}

/**
 * Validate and sanitize user input
 */
export function validateAndSanitizeInput(
  input: string,
  type: 'html' | 'plaintext' | 'url' | 'slug' = 'plaintext'
): { isValid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = [];
  let sanitized = input;
  
  // Check for malicious patterns
  if (containsSqlInjection(input)) {
    errors.push('Input contains potentially malicious SQL patterns');
  }
  
  if (containsXss(input)) {
    errors.push('Input contains potentially malicious script patterns');
  }
  
  // Sanitize based on type
  switch (type) {
    case 'html':
      sanitized = sanitizeHtml(input);
      break;
      
    case 'plaintext':
      // Remove HTML tags and decode entities
      sanitized = input.replace(/<[^>]*>/g, '').trim();
      break;
      
    case 'url':
      try {
        const url = new URL(input);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('URL must use HTTP or HTTPS protocol');
        }
        sanitized = url.toString();
      } catch {
        errors.push('Invalid URL format');
      }
      break;
      
    case 'slug':
      sanitized = input.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      break;
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
  };
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(
  identifier: string,
  windowMs: number = 60000,
  maxRequests: number = 100
): { allowed: boolean; remaining: number; resetTime: number } {
  // This is a simple in-memory rate limiter
  // In production, use Redis or a proper rate limiting service
  
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get or create request history for this identifier
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }
  
  const requests = global.rateLimitStore.get(identifier) || [];
  
  // Remove old requests outside the window
  const validRequests = requests.filter((time: number) => time > windowStart);
  
  // Check if limit is exceeded
  const allowed = validRequests.length < maxRequests;
  
  if (allowed) {
    validRequests.push(now);
    global.rateLimitStore.set(identifier, validRequests);
  }
  
  return {
    allowed,
    remaining: Math.max(0, maxRequests - validRequests.length),
    resetTime: windowStart + windowMs,
  };
}

/**
 * Validate file upload (if implementing file uploads)
 */
export function validateFileUpload(file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
} = {}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  } = options;
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} not allowed`);
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} not allowed`);
  }
  
  // Check for potentially dangerous file names
  const dangerousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i,  // Reserved Windows names
  ];
  
  if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
    errors.push('File name contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Declare global interface for TypeScript
declare global {
  var rateLimitStore: Map<string, number[]> | undefined;
}