/**
 * Google Search Console Tab Screen
 *
 * Displays search performance data from Google Search Console.
 * Handles OAuth2 login, site selection, date range filtering,
 * and shows keywords/pages performance tables.
 */

import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../src/hooks/useTheme';
import { SettingsContext } from '../../src/contexts/SettingsContext';
import {
  GOOGLE_DISCOVERY,
  SCOPES,
  getAuthRequestConfig,
  exchangeCodeForTokens,
  getValidAccessToken,
  fetchSites,
  fetchSearchAnalytics,
  clearTokens,
  hasStoredToken,
  getDateRange,
  GSCSite,
  SearchAnalyticsRow,
} from '../../src/services/GoogleSearchConsole';

WebBrowser.maybeCompleteAuthSession();

const BRAND_CYAN = '#00D4FF';

type DatePeriod = '7d' | '28d' | '3m';

interface PerformanceSummary {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
}

export default function ConsoleScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { settings } = useContext(SettingsContext);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [sites, setSites] = useState<GSCSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('28d');
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [topKeywords, setTopKeywords] = useState<SearchAnalyticsRow[]>([]);
  const [topPages, setTopPages] = useState<SearchAnalyticsRow[]>([]);

  const clientId = settings.googleClientId || '';
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'flujo-ide' });

  // Auth request setup
  const discovery = {
    authorizationEndpoint: GOOGLE_DISCOVERY.authorizationEndpoint,
    tokenEndpoint: GOOGLE_DISCOVERY.tokenEndpoint,
    revocationEndpoint: GOOGLE_DISCOVERY.revocationEndpoint,
  };

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    discovery
  );

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const hasToken = await hasStoredToken();
        if (hasToken && clientId) {
          const token = await getValidAccessToken(clientId);
          if (token) {
            setIsConnected(true);
            await loadSites(token);
          } else {
            setIsConnected(false);
          }
        }
      } catch {
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkConnection();
  }, [clientId]);

  // Handle auth response
  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type === 'success' && response.params.code) {
        try {
          setIsLoading(true);
          setError(null);
          const tokens = await exchangeCodeForTokens(
            response.params.code,
            clientId,
            redirectUri,
            request?.codeVerifier
          );
          setIsConnected(true);
          await loadSites(tokens.accessToken);
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Authentication failed';
          setError(message);
        } finally {
          setIsLoading(false);
        }
      } else if (response?.type === 'error') {
        setError(response.error?.message || 'Authentication cancelled');
      }
    };
    handleResponse();
  }, [response]);

  // Load data when site or period changes
  useEffect(() => {
    if (isConnected && selectedSite && clientId) {
      loadData();
    }
  }, [selectedSite, datePeriod, isConnected]);

  const loadSites = async (token: string) => {
    try {
      const siteList = await fetchSites(token);
      setSites(siteList);
      if (siteList.length > 0 && !selectedSite) {
        setSelectedSite(siteList[0].siteUrl);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') {
        setIsConnected(false);
        setError('Session expired, please reconnect');
      } else {
        const message = e instanceof Error ? e.message : 'Failed to load sites';
        setError(message);
      }
    }
  };

  const loadData = async () => {
    if (!selectedSite || !clientId) return;

    try {
      setError(null);
      const token = await getValidAccessToken(clientId);
      if (!token) {
        setIsConnected(false);
        setError('Session expired, please reconnect');
        return;
      }

      const { startDate, endDate } = getDateRange(datePeriod);

      // Fetch keywords and pages in parallel
      const [keywordsRes, pagesRes] = await Promise.all([
        fetchSearchAnalytics(token, {
          siteUrl: selectedSite,
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 25,
        }),
        fetchSearchAnalytics(token, {
          siteUrl: selectedSite,
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 25,
        }),
      ]);

      const keywords = keywordsRes.rows || [];
      const pages = pagesRes.rows || [];

      setTopKeywords(keywords);
      setTopPages(pages);

      // Calculate summary from keywords data
      const totalClicks = keywords.reduce((sum, r) => sum + r.clicks, 0);
      const totalImpressions = keywords.reduce((sum, r) => sum + r.impressions, 0);
      const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const avgPosition =
        keywords.length > 0
          ? keywords.reduce((sum, r) => sum + r.position, 0) / keywords.length
          : 0;

      setSummary({
        totalClicks,
        totalImpressions,
        averageCtr,
        averagePosition: avgPosition,
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') {
        setIsConnected(false);
        setError('Session expired, please reconnect');
      } else {
        const message = e instanceof Error ? e.message : 'Failed to load data';
        setError(message);
      }
    }
  };

  const handleConnect = async () => {
    if (!clientId) {
      setError('Please add your Google Client ID in Settings first');
      return;
    }
    setError(null);
    await promptAsync();
  };

  const handleDisconnect = async () => {
    await clearTokens();
    setIsConnected(false);
    setSites([]);
    setSelectedSite(null);
    setSummary(null);
    setTopKeywords([]);
    setTopPages([]);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [selectedSite, datePeriod, clientId]);

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatCtr = (ctr: number): string => {
    return `${(ctr * 100).toFixed(1)}%`;
  };

  const formatPosition = (pos: number): string => {
    return pos.toFixed(1);
  };

  // Loading state
  if (isLoading && !isConnected) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={BRAND_CYAN} />
      </View>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Ionicons name="analytics" size={24} color={BRAND_CYAN} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Search Console</Text>
        </View>

        <View style={[styles.container, styles.center]}>
          <View style={[styles.connectCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.connectIconContainer}>
              <Ionicons name="globe-outline" size={48} color={BRAND_CYAN} />
            </View>
            <Text style={[styles.connectTitle, { color: colors.text }]}>
              Connect Google Search Console
            </Text>
            <Text style={[styles.connectDescription, { color: colors.textMuted }]}>
              View your search performance data including keywords, clicks, impressions, CTR, and average position directly in the app.
            </Text>

            {error && (
              <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

            <Pressable
              style={[styles.connectButton, { opacity: !clientId ? 0.5 : 1 }]}
              onPress={handleConnect}
              disabled={!clientId}
            >
              <Ionicons name="logo-google" size={20} color="#0D1117" />
              <Text style={styles.connectButtonText}>Sign in with Google</Text>
            </Pressable>

            {!clientId && (
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Add your Google Client ID in Settings to get started.
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Connected state - show data
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Ionicons name="analytics" size={24} color={BRAND_CYAN} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Search Console</Text>
        <Pressable onPress={handleDisconnect} style={styles.disconnectButton}>
          <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND_CYAN}
            colors={[BRAND_CYAN]}
          />
        }
      >
        {/* Site Selector */}
        {sites.length > 1 && (
          <View style={styles.selectorSection}>
            <Pressable
              style={[styles.siteSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowSiteSelector(!showSiteSelector)}
            >
              <Ionicons name="globe-outline" size={16} color={BRAND_CYAN} />
              <Text style={[styles.siteSelectorText, { color: colors.text }]} numberOfLines={1}>
                {selectedSite || 'Select a site'}
              </Text>
              <Ionicons
                name={showSiteSelector ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textMuted}
              />
            </Pressable>

            {showSiteSelector && (
              <View style={[styles.siteDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {sites.map((site) => (
                  <Pressable
                    key={site.siteUrl}
                    style={[
                      styles.siteOption,
                      selectedSite === site.siteUrl && { backgroundColor: BRAND_CYAN + '15' },
                    ]}
                    onPress={() => {
                      setSelectedSite(site.siteUrl);
                      setShowSiteSelector(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.siteOptionText,
                        { color: selectedSite === site.siteUrl ? BRAND_CYAN : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {site.siteUrl}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Date Range Selector */}
        <View style={styles.dateRangeRow}>
          {(['7d', '28d', '3m'] as DatePeriod[]).map((period) => (
            <Pressable
              key={period}
              style={[
                styles.dateRangeButton,
                {
                  backgroundColor: datePeriod === period ? BRAND_CYAN : colors.surface,
                  borderColor: datePeriod === period ? BRAND_CYAN : colors.border,
                },
              ]}
              onPress={() => setDatePeriod(period)}
            >
              <Text
                style={[
                  styles.dateRangeText,
                  { color: datePeriod === period ? '#0D1117' : colors.text },
                ]}
              >
                {period === '7d' ? '7 Days' : period === '28d' ? '28 Days' : '3 Months'}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.error + '15', marginHorizontal: 16 }]}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Summary Cards */}
        {summary && (
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Clicks</Text>
              <Text style={[styles.summaryValue, { color: BRAND_CYAN }]}>
                {formatNumber(summary.totalClicks)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Impressions</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatNumber(summary.totalImpressions)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Average CTR</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatCtr(summary.averageCtr)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Avg. Position</Text>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>
                {formatPosition(summary.averagePosition)}
              </Text>
            </View>
          </View>
        )}

        {/* Top Keywords */}
        {topKeywords.length > 0 && (
          <View style={styles.tableSection}>
            <Text style={[styles.tableSectionTitle, { color: colors.text }]}>Top Keywords</Text>
            <View style={[styles.tableContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableHeaderCell, styles.keywordCell, { color: colors.textMuted }]}>
                  Keyword
                </Text>
                <Text style={[styles.tableHeaderCell, styles.numCell, { color: colors.textMuted }]}>
                  Clicks
                </Text>
                <Text style={[styles.tableHeaderCell, styles.numCell, { color: colors.textMuted }]}>
                  Impr.
                </Text>
                <Text style={[styles.tableHeaderCell, styles.numCell, { color: colors.textMuted }]}>
                  CTR
                </Text>
                <Text style={[styles.tableHeaderCell, styles.numCell, { color: colors.textMuted }]}>
                  Pos.
                </Text>
              </View>

              {/* Table Rows */}
              {topKeywords.map((row, index) => (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index < topKeywords.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 0.5 },
                  ]}
                >
                  <Text style={[styles.tableCell, styles.keywordCell, { color: colors.text }]} numberOfLines={1}>
                    {row.keys[0]}
                  </Text>
                  <Text style={[styles.tableCell, styles.numCell, { color: BRAND_CYAN }]}>
                    {formatNumber(row.clicks)}
                  </Text>
                  <Text style={[styles.tableCell, styles.numCell, { color: colors.textSecondary }]}>
                    {formatNumber(row.impressions)}
                  </Text>
                  <Text style={[styles.tableCell, styles.numCell, { color: colors.textSecondary }]}>
                    {formatCtr(row.ctr)}
                  </Text>
                  <Text style={[styles.tableCell, styles.numCell, { color: colors.textSecondary }]}>
                    {formatPosition(row.position)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Pages */}
        {topPages.length > 0 && (
          <View style={styles.tableSection}>
            <Text style={[styles.tableSectionTitle, { color: colors.text }]}>Top Pages</Text>
            <View style={[styles.tableContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableHeaderCell, styles.pageCell, { color: colors.textMuted }]}>
                  Page
                </Text>
                <Text style={[styles.tableHeaderCell, styles.numCell, { color: colors.textMuted }]}>
                  Clicks
                </Text>
                <Text style={[styles.tableHeaderCell, styles.numCell, { color: colors.textMuted }]}>
                  Impr.
                </Text>
              </View>

              {/* Table Rows */}
              {topPages.map((row, index) => {
                // Show only the path portion of the URL
                let pagePath = row.keys[0];
                try {
                  const url = new URL(pagePath);
                  pagePath = url.pathname;
                } catch {
                  // Keep the original value
                }

                return (
                  <View
                    key={index}
                    style={[
                      styles.tableRow,
                      index < topPages.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 0.5 },
                    ]}
                  >
                    <Text style={[styles.tableCell, styles.pageCell, { color: colors.text }]} numberOfLines={1}>
                      {pagePath}
                    </Text>
                    <Text style={[styles.tableCell, styles.numCell, { color: BRAND_CYAN }]}>
                      {formatNumber(row.clicks)}
                    </Text>
                    <Text style={[styles.tableCell, styles.numCell, { color: colors.textSecondary }]}>
                      {formatNumber(row.impressions)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Empty state when connected but no data */}
        {isConnected && !summary && !error && !isLoading && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
              No data available for the selected date range.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  disconnectButton: {
    padding: 8,
  },
  scrollContent: {
    flex: 1,
  },
  connectCard: {
    margin: 24,
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  connectIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND_CYAN + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  connectDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_CYAN,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    width: '100%',
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1117',
  },
  hintText: {
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  selectorSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  siteSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  siteSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  siteDropdown: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  siteOption: {
    padding: 12,
  },
  siteOptionText: {
    fontSize: 14,
  },
  dateRangeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  summaryCard: {
    width: '48%',
    margin: '1%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  tableSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  tableSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeader: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: {
    fontSize: 13,
  },
  keywordCell: {
    flex: 2,
    paddingRight: 8,
  },
  pageCell: {
    flex: 3,
    paddingRight: 8,
  },
  numCell: {
    flex: 1,
    textAlign: 'right',
  },
  emptyState: {
    margin: 16,
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
