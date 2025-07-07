/**
 * Token Manager for DWV App Authentication
 * Handles secure storage and retrieval of authentication tokens
 */

// In-memory token storage (will be reset on function restart)
// For production, consider using Deno KV or another persistent storage
const tokenStore: Map<string, { value: string; expires: Date }> = new Map();

/**
 * Get a stored token if it exists and is valid
 * @param key The token key
 * @returns The token value or null if not found or expired
 */
export async function getToken(key: string): Promise<string | null> {
  const token = tokenStore.get(key);
  if (!token) return null;
  
  // Check if token is expired
  if (token.expires < new Date()) {
    tokenStore.delete(key);
    return null;
  }
  
  return token.value;
}

/**
 * Store a token with an expiration time
 * @param key The token key
 * @param value The token value
 * @param expiresInSeconds Seconds until token expiration
 */
export async function setToken(key: string, value: string, expiresInSeconds: number): Promise<void> {
  const expires = new Date();
  expires.setSeconds(expires.getSeconds() + expiresInSeconds);
  
  tokenStore.set(key, { value, expires });
  console.log(`Token stored for key: ${key}, expires: ${expires.toISOString()}`);
}

/**
 * Clear a stored token
 * @param key The token key
 */
export async function clearToken(key: string): Promise<void> {
  tokenStore.delete(key);
  console.log(`Token cleared for key: ${key}`);
}

/**
 * Validate if a session (cookies) is still valid
 * @param cookies The cookies string
 * @returns True if session is valid, false otherwise
 */
export async function validateSession(cookies: string): Promise<boolean> {
  try {
    if (!cookies) return false;
    
    // Make a request to a protected endpoint to check if session is valid
    const response = await fetch('https://app.dwvapp.com.br/api/user', {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

/**
 * Log authentication events for monitoring
 * @param event The authentication event details
 */
export function logAuthEvent(event: {
  type: 'attempt' | 'success' | 'failure';
  method: 'form' | 'api' | 'token' | 'session';
  error?: string;
  responseCode?: number;
}): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    ...event
  }));
}