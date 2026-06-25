/**
 * SEO Audit Tab Screen - Main feature of the app.
 * Allows users to enter a URL, scan it, and view SEO analysis results.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { analyzeURL, SEOResult } from '../../src/services/SEOAnalyzer';
import { ThemeColors } from '../../src/types';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const { width } = Dimensions.get('window');

interface SectionProps {
  title: string;
  icon: IoniconsName;
  children: React.ReactNode;
  defaultOpen?: boolean;
  colors: ThemeColors;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false, colors }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <View style={[sectionStyles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        style={sectionStyles.header}
        onPress={() => setIsOpen(!isOpen)}
      >
        <View style={sectionStyles.headerLeft}>
          <Ionicons name={icon} size={18} color={colors.primary} />
          <Text style={[sectionStyles.title, { color: colors.text }]}>{title}</Text>
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {isOpen && <View style={sectionStyles.content}>{children}</View>}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});

interface CheckItemProps {
  status: 'good' | 'warning' | 'error' | 'info';
  text: string;
  colors: ThemeColors;
}

function CheckItem({ status, text, colors }: CheckItemProps) {
  const icon: IoniconsName = status === 'good' ? 'checkmark-circle' : status === 'warning' ? 'alert-circle' : status === 'info' ? 'information-circle' : 'close-circle';
  const color = status === 'good' || status === 'info' ? colors.success : status === 'warning' ? colors.warning : colors.error;

  return (
    <View style={checkStyles.row}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[checkStyles.text, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const checkStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  text: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});

function ScoreCircle({ score, colors }: { score: number; colors: ThemeColors }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return colors.success;
    if (s >= 50) return colors.warning;
    return colors.error;
  };

  const scoreColor = getScoreColor(score);

  return (
    <View style={[scoreStyles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[scoreStyles.circle, { borderColor: scoreColor }]}>
        <Text style={[scoreStyles.number, { color: scoreColor }]}>{score}</Text>
        <Text style={[scoreStyles.label, { color: colors.textSecondary }]}>/ 100</Text>
      </View>
      <Text style={[scoreStyles.text, { color: colors.textSecondary }]}>
        {score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor'}
      </Text>
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    fontSize: 36,
    fontWeight: '800',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
});

export default function AuditScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SEOResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await analyzeURL(url.trim());
      setResult(analysis);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>SEO Audit</Text>
      </View>

      {/* URL Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Enter URL to audit..."
          placeholderTextColor={colors.textMuted}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleScan}
        />
        <Pressable
          style={[styles.scanButton, { backgroundColor: colors.primary, opacity: isLoading || !url.trim() ? 0.6 : 1 }]}
          onPress={handleScan}
          disabled={isLoading || !url.trim()}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.scanButtonText}>Scan</Text>
          )}
        </Pressable>
      </View>

      {/* Error Display */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '15' }]}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Analyzing page...
          </Text>
        </View>
      )}

      {/* Results */}
      {result && !isLoading && (
        <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
          {/* Score */}
          <ScoreCircle score={result.score} colors={colors} />

          {/* Quick Stats */}
          <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{result.loadTime}ms</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Load Time</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {result.pageSize > 1024 * 1024
                  ? (result.pageSize / 1024 / 1024).toFixed(1) + 'MB'
                  : Math.round(result.pageSize / 1024) + 'KB'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Page Size</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{result.links.total}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Links</Text>
            </View>
          </View>

          {/* Meta Tags Section */}
          <CollapsibleSection title="Meta Tags" icon="pricetag-outline" defaultOpen={true} colors={colors}>
            <CheckItem
              status={result.meta.title ? (result.meta.titleLength >= 30 && result.meta.titleLength <= 60 ? 'good' : 'warning') : 'error'}
              text={result.meta.title ? `Title: "${result.meta.title}" (${result.meta.titleLength} chars)` : 'No title tag found'}
              colors={colors}
            />
            <CheckItem
              status={result.meta.description ? (result.meta.descriptionLength >= 120 && result.meta.descriptionLength <= 160 ? 'good' : 'warning') : 'error'}
              text={result.meta.description ? `Description: "${result.meta.description.slice(0, 80)}..." (${result.meta.descriptionLength} chars)` : 'No meta description found'}
              colors={colors}
            />
            <CheckItem
              status={result.meta.viewport ? 'good' : 'error'}
              text={result.meta.viewport ? 'Viewport meta tag present' : 'Missing viewport meta tag'}
              colors={colors}
            />
            <CheckItem
              status={result.meta.charset ? 'good' : 'warning'}
              text={result.meta.charset ? `Charset: ${result.meta.charset}` : 'No charset specified'}
              colors={colors}
            />
          </CollapsibleSection>

          {/* Headings Section */}
          <CollapsibleSection title="Headings" icon="list-outline" colors={colors}>
            <CheckItem
              status={result.headings.h1.length === 1 ? 'good' : result.headings.h1.length === 0 ? 'error' : 'warning'}
              text={`H1: ${result.headings.h1.length} found${result.headings.h1.length === 1 ? ' (good)' : result.headings.h1.length === 0 ? ' (missing!)' : ' (should be 1)'}`}
              colors={colors}
            />
            {result.headings.h1.map((h, i) => (
              <Text key={`h1-${i}`} style={[styles.headingItem, { color: colors.textMuted }]}>
                H1: {h.slice(0, 60)}{h.length > 60 ? '...' : ''}
              </Text>
            ))}
            <CheckItem
              status={result.headings.h2.length > 0 ? 'good' : 'warning'}
              text={`H2: ${result.headings.h2.length} found`}
              colors={colors}
            />
            <CheckItem
              status="info"
              text={`H3: ${result.headings.h3.length} | H4: ${result.headings.h4.length} | H5: ${result.headings.h5.length} | H6: ${result.headings.h6.length}`}
              colors={colors}
            />
          </CollapsibleSection>

          {/* Images Section */}
          <CollapsibleSection title="Images" icon="image-outline" colors={colors}>
            <CheckItem
              status="info"
              text={`Total images: ${result.images.total}`}
              colors={colors}
            />
            <CheckItem
              status={result.images.withoutAlt.length === 0 ? 'good' : 'warning'}
              text={result.images.withoutAlt.length === 0
                ? 'All images have alt attributes'
                : `${result.images.withoutAlt.length} image(s) missing alt text`}
              colors={colors}
            />
            {result.images.withoutAlt.slice(0, 5).map((src, i) => (
              <Text key={`img-${i}`} style={[styles.headingItem, { color: colors.textMuted }]} numberOfLines={1}>
                Missing alt: {src}
              </Text>
            ))}
            {result.images.withoutAlt.length > 5 && (
              <Text style={[styles.headingItem, { color: colors.textMuted }]}>
                ...and {result.images.withoutAlt.length - 5} more
              </Text>
            )}
          </CollapsibleSection>

          {/* Links Section */}
          <CollapsibleSection title="Links" icon="link-outline" colors={colors}>
            <CheckItem status="info" text={`Total links: ${result.links.total}`} colors={colors} />
            <CheckItem status="info" text={`Internal links: ${result.links.internal}`} colors={colors} />
            <CheckItem status="info" text={`External links: ${result.links.external}`} colors={colors} />
          </CollapsibleSection>

          {/* Performance Section */}
          <CollapsibleSection title="Performance" icon="speedometer-outline" colors={colors}>
            <CheckItem
              status={result.pageSize < 1024 * 1024 ? 'good' : result.pageSize < 3 * 1024 * 1024 ? 'warning' : 'error'}
              text={`Page size: ${result.pageSize > 1024 * 1024 ? (result.pageSize / 1024 / 1024).toFixed(1) + 'MB' : Math.round(result.pageSize / 1024) + 'KB'}`}
              colors={colors}
            />
            <CheckItem
              status={result.performance.scripts <= 10 ? 'good' : result.performance.scripts <= 20 ? 'warning' : 'error'}
              text={`Scripts: ${result.performance.scripts}`}
              colors={colors}
            />
            <CheckItem
              status={result.performance.stylesheets <= 5 ? 'good' : 'warning'}
              text={`Stylesheets: ${result.performance.stylesheets}`}
              colors={colors}
            />
            <CheckItem status="info" text={`Images: ${result.performance.images}`} colors={colors} />
          </CollapsibleSection>

          {/* Social Section */}
          <CollapsibleSection title="Social" icon="share-social-outline" colors={colors}>
            <CheckItem
              status={result.social.ogTitle ? 'good' : 'warning'}
              text={result.social.ogTitle ? `OG Title: ${result.social.ogTitle}` : 'No OG title found'}
              colors={colors}
            />
            <CheckItem
              status={result.social.ogDescription ? 'good' : 'warning'}
              text={result.social.ogDescription ? `OG Description: ${result.social.ogDescription.slice(0, 60)}...` : 'No OG description found'}
              colors={colors}
            />
            <CheckItem
              status={result.social.ogImage ? 'good' : 'warning'}
              text={result.social.ogImage ? 'OG Image present' : 'No OG image found'}
              colors={colors}
            />
            <CheckItem
              status={result.social.twitterCard ? 'good' : 'warning'}
              text={result.social.twitterCard ? `Twitter Card: ${result.social.twitterCard}` : 'No Twitter Card found'}
              colors={colors}
            />
            <CheckItem
              status={result.meta.canonical ? 'good' : 'warning'}
              text={result.meta.canonical ? `Canonical: ${result.meta.canonical}` : 'No canonical URL'}
              colors={colors}
            />
          </CollapsibleSection>

          {/* Security Section */}
          <CollapsibleSection title="Security" icon="shield-checkmark-outline" colors={colors}>
            <CheckItem
              status={result.security.https ? 'good' : 'error'}
              text={result.security.https ? 'HTTPS enabled' : 'Not using HTTPS - insecure'}
              colors={colors}
            />
          </CollapsibleSection>

          {/* Issues Summary */}
          <CollapsibleSection title="All Issues" icon="warning-outline" defaultOpen={true} colors={colors}>
            {result.issues.map((issue, i) => (
              <CheckItem
                key={`issue-${i}`}
                status={issue.type === 'error' ? 'error' : issue.type === 'warning' ? 'warning' : 'good'}
                text={issue.message}
                colors={colors}
              />
            ))}
          </CollapsibleSection>

          {/* Bottom spacing */}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Empty State */}
      {!result && !isLoading && !error && (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Enter a URL to audit
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Get instant SEO analysis including meta tags, headings, images, links, and more.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  scanButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  results: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    paddingVertical: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  headingItem: {
    fontSize: 12,
    marginLeft: 24,
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
