/**
 * API Configuration
 *
 * This file centralizes API configuration for the application.
 * The PHP API is located in the app/api directory and needs to be served separately.
 */

// Get API URL from environment variable or fallback
// In development: use NEXT_PUBLIC_API_URL from .env.local (http://localhost:8000)
// In production: use the production API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://thynkxpro-dpl.co.za/api';

/**
 * Get the full API URL for a given endpoint
 * @param endpoint - The API endpoint (e.g., '/dashboard', '/tenants')
 * @returns Full API URL
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
}

/**
 * Get the API base URL
 * @returns API base URL
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export default {
  getApiUrl,
  getApiBaseUrl,
  baseUrl: API_BASE_URL,
};
