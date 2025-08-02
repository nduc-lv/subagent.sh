/**
 * Utility functions for handling GitHub avatars
 */

/**
 * Converts a GitHub profile URL to the corresponding avatar URL
 * @param githubUrl - GitHub profile URL (e.g., https://github.com/username)
 * @returns Avatar URL or null if not a valid GitHub URL
 */
export function githubProfileToAvatarUrl(githubUrl: string): string | null {
  if (!githubUrl) return null;
  
  try {
    const url = new URL(githubUrl);
    
    // Check if it's a GitHub URL
    if (url.hostname !== 'github.com') return null;
    
    // Extract username from path (e.g., /username or /username/)
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) return null;
    
    const username = pathParts[0];
    if (!username) return null;
    
    // Return GitHub avatar URL
    return `https://github.com/${username}.png`;
  } catch (error) {
    return null;
  }
}

/**
 * Gets the best available avatar URL from an agent object
 * @param agent - Agent object with potential avatar URLs
 * @returns Best available avatar URL or fallback
 */
export function getAgentAvatarUrl(agent: {
  github_owner_avatar_url?: string;
  original_author_avatar_url?: string;
  original_author_github_url?: string;
  original_author_github_username?: string;
  profiles?: {
    avatar_url?: string;
    username?: string;
  };
}): string {
  // First priority: Use the dedicated GitHub owner avatar URL (from repository owner)
  if (agent.github_owner_avatar_url) {
    return agent.github_owner_avatar_url;
  }
  
  // Fallback to original avatar URL (for backward compatibility)
  if (agent.original_author_avatar_url) {
    // Check if it's actually a GitHub avatar URL (avatars.githubusercontent.com or github.com/username.png)
    if (agent.original_author_avatar_url.includes('avatars.githubusercontent.com') || 
        agent.original_author_avatar_url.endsWith('.png')) {
      return agent.original_author_avatar_url;
    }
    
    // If it's a GitHub profile URL, convert it to an avatar URL
    const convertedAvatarUrl = githubProfileToAvatarUrl(agent.original_author_avatar_url);
    if (convertedAvatarUrl) {
      return convertedAvatarUrl;
    }
  }
  
  // Try converting the GitHub profile URL to an avatar URL
  if (agent.original_author_github_url) {
    const convertedAvatarUrl = githubProfileToAvatarUrl(agent.original_author_github_url);
    if (convertedAvatarUrl) {
      return convertedAvatarUrl;
    }
  }
  
  // Try direct GitHub username
  if (agent.original_author_github_username) {
    return `https://github.com/${agent.original_author_github_username}.png`;
  }
  
  // Fallback to profile avatar
  if (agent.profiles?.avatar_url) {
    return agent.profiles.avatar_url;
  }
  
  // Final fallback to generated avatar
  const displayName = agent.original_author_github_username || 
                     agent.profiles?.username || 
                     'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
}