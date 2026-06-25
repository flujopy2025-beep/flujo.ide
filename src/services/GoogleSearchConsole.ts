/**
 * GoogleSearchConsole Service
 *
 * Handles OAuth2 authentication with Google and fetching data
 * from the Google Search Console API (searchanalytics/query).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Google OAuth2 Discovery Document
export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Scopes required for Search Console read access
export const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

// API Endpoints
const GSC_API = 'https://www.googleapis.com/webmasters/v3';
const SEARCH_ANALYTICS_API = 'https://searchconsole.googleapis.com/webmasters/v3';

// Storage keys
const TOKEN_KEY = '@flujoide/google_token';
const REFRESH_TOKEN_KEY = '@flujoide/google_refresh_token';
const TOKEN_EXPIRY_KEY = '@flujoide/google_token_expiry';

// Types
export interface GSCSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface GSCSitesResponse {
  siteEntry?: GSCSite[];
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
  responseAggregationType?: string;
}

export interface SearchAnalyticsOptions {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  startRow?: number;
  dimensionFilterGroups?: unknown[];
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Get the auth request configuration for Google OAuth2.
 * Used with expo-auth-session's useAuthRequest hook.
 */
export function getAuthRequestConfig(clientId: string, redirectUri: string) {
  return {
    clientId,
    scopes: SCOPES,
    redirectUri,
    responseType: 'code' as const,
    usePKCE: true,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  };
}

/**
 * Exchange an authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<GoogleTokens> {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  if (codeVerifier) {
    params.append('code_verifier', codeVerifier);
  }

  const response = await fetch(GOOGLE_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();

  const tokens: GoogleTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  // Persist tokens
  await saveTokens(tokens);

  return tokens;
}

/**
 * Refresh the access token using the stored refresh token.
 */
export async function refreshAccessToken(clientId: string): Promise<GoogleTokens | null> {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_DISCOVERY.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      // Refresh token is invalid, clear stored tokens
      await clearTokens();
      return null;
    }

    const data = await response.json();

    const tokens: GoogleTokens = {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Keep existing refresh token
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    await saveTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}

/**
 * Get the current valid access token, refreshing if expired.
 */
export async function getValidAccessToken(clientId: string): Promise<string | null> {
  const accessToken = await AsyncStorage.getItem(TOKEN_KEY);
  const expiryStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!accessToken) return null;

  const expiresAt = expiryStr ? parseInt(expiryStr, 10) : 0;

  // If token expires within 5 minutes, refresh it
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(clientId);
    return refreshed?.accessToken || null;
  }

  return accessToken;
}

/**
 * Fetch the list of sites the user has access to in Search Console.
 */
export async function fetchSites(accessToken: string): Promise<GSCSite[]> {
  const response = await fetch(`${GSC_API}/sites`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('SESSION_EXPIRED');
    }
    const errorBody = await response.text();
    throw new Error(`Failed to fetch sites: ${response.status} - ${errorBody}`);
  }

  const data: GSCSitesResponse = await response.json();
  return data.siteEntry || [];
}

/**
 * Fetch search analytics data from Google Search Console.
 */
export async function fetchSearchAnalytics(
  accessToken: string,
  options: SearchAnalyticsOptions
): Promise<SearchAnalyticsResponse> {
  const { siteUrl, startDate, endDate, dimensions, rowLimit, startRow } = options;

  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const url = `${SEARCH_ANALYTICS_API}/sites/${encodedSiteUrl}/searchAnalytics/query`;

  const body: Record<string, unknown> = {
    startDate,
    endDate,
    dimensions: dimensions || ['query'],
    rowLimit: rowLimit || 25,
  };

  if (startRow !== undefined) {
    body.startRow = startRow;
  }

  if (options.dimensionFilterGroups) {
    body.dimensionFilterGroups = options.dimensionFilterGroups;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('SESSION_EXPIRED');
    }
    const errorBody = await response.text();
    throw new Error(`Failed to fetch analytics: ${response.status} - ${errorBody}`);
  }

  return await response.json();
}

/**
 * Save tokens to AsyncStorage.
 */
async function saveTokens(tokens: GoogleTokens): Promise<void> {
  const pairs: [string, string][] = [[TOKEN_KEY, tokens.accessToken]];

  if (tokens.refreshToken) {
    pairs.push([REFRESH_TOKEN_KEY, tokens.refreshToken]);
  }
  if (tokens.expiresAt) {
    pairs.push([TOKEN_EXPIRY_KEY, tokens.expiresAt.toString()]);
  }

  await AsyncStorage.multiSet(pairs);
}

/**
 * Clear all stored tokens (used on disconnect/logout).
 */
export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRY_KEY]);
}

/**
 * Check if the user has a stored Google token (may be expired).
 */
export async function hasStoredToken(): Promise<boolean> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return token !== null;
}

/**
 * Format a date as YYYY-MM-DD for the Search Console API.
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date range based on a preset period.
 */
export function getDateRange(period: '7d' | '28d' | '3m'): { startDate: string; endDate: string } {
  const end = new Date();
  // GSC data has a 2-day delay
  end.setDate(end.getDate() - 2);
  const start = new Date(end);

  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '28d':
      start.setDate(start.getDate() - 28);
      break;
    case '3m':
      start.setMonth(start.getMonth() - 3);
      break;
  }

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}
