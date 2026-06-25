/**
 * SEO Analyzer Service
 * Fetches a URL, parses HTML with regex, and returns structured SEO analysis.
 */

export interface SEOResult {
  url: string;
  score: number;
  loadTime: number; // ms
  pageSize: number; // bytes
  meta: {
    title: string | null;
    titleLength: number;
    description: string | null;
    descriptionLength: number;
    viewport: boolean;
    charset: string | null;
    canonical: string | null;
    robots: string | null;
  };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  images: {
    total: number;
    withoutAlt: string[]; // src of images without alt
  };
  links: {
    internal: number;
    external: number;
    total: number;
  };
  social: {
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    twitterCard: string | null;
  };
  performance: {
    scripts: number;
    stylesheets: number;
    images: number;
  };
  security: {
    https: boolean;
  };
  issues: Array<{ type: 'error' | 'warning' | 'info'; message: string }>;
}

const FETCH_TIMEOUT = 15000; // 15 seconds

/**
 * Normalize a URL - add https:// if no protocol specified
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

/**
 * Extract content between tags using regex
 */
function extractTagContent(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'gis');
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    // Strip inner HTML tags to get text content
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    if (text) {
      matches.push(text);
    }
  }
  return matches;
}

/**
 * Extract meta tag content by name or property
 */
function getMetaContent(html: string, attr: string, value: string): string | null {
  // Match both name="..." and property="..." attributes
  const patterns = [
    new RegExp(`<meta[^>]*${attr}=["']${value}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${value}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Check if a link is internal or external relative to the base URL
 */
function isInternalLink(href: string, baseHost: string): boolean {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return true; // Treat anchors/mail/tel as internal
  }
  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
    return true;
  }
  try {
    const linkUrl = new URL(href);
    return linkUrl.hostname === baseHost;
  } catch {
    return true; // Relative URLs are internal
  }
}

/**
 * Calculate SEO score based on analysis results
 */
function calculateScore(result: Omit<SEOResult, 'score'>): number {
  let score = 0;

  // Title present and 30-60 chars: +15 points
  if (result.meta.title) {
    if (result.meta.titleLength >= 30 && result.meta.titleLength <= 60) {
      score += 15;
    } else {
      score += 8; // Partial credit for having a title
    }
  }

  // Description present and 120-160 chars: +15 points
  if (result.meta.description) {
    if (result.meta.descriptionLength >= 120 && result.meta.descriptionLength <= 160) {
      score += 15;
    } else {
      score += 8; // Partial credit
    }
  }

  // Has H1 (exactly 1): +10 points
  if (result.headings.h1.length === 1) {
    score += 10;
  } else if (result.headings.h1.length > 1) {
    score += 5; // Partial credit for having H1s
  }

  // All images have alt: +10 points
  if (result.images.total === 0) {
    score += 10; // No images means no alt issues
  } else if (result.images.withoutAlt.length === 0) {
    score += 10;
  } else {
    const ratio = 1 - (result.images.withoutAlt.length / result.images.total);
    score += Math.round(ratio * 10);
  }

  // HTTPS: +10 points
  if (result.security.https) {
    score += 10;
  }

  // Has viewport meta: +10 points
  if (result.meta.viewport) {
    score += 10;
  }

  // Has OG tags: +10 points
  if (result.social.ogTitle || result.social.ogDescription || result.social.ogImage) {
    const ogCount = [result.social.ogTitle, result.social.ogDescription, result.social.ogImage]
      .filter(Boolean).length;
    score += Math.round((ogCount / 3) * 10);
  }

  // Has canonical: +10 points
  if (result.meta.canonical) {
    score += 10;
  }

  // Page size < 3MB: +5 points
  if (result.pageSize < 3 * 1024 * 1024) {
    score += 5;
  }

  // Good heading structure: +5 points
  const hasH1 = result.headings.h1.length > 0;
  const hasH2 = result.headings.h2.length > 0;
  if (hasH1 && hasH2) {
    score += 5;
  } else if (hasH1 || hasH2) {
    score += 2;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate issues list based on analysis
 */
function generateIssues(result: Omit<SEOResult, 'score' | 'issues'>): SEOResult['issues'] {
  const issues: SEOResult['issues'] = [];

  // Title issues
  if (!result.meta.title) {
    issues.push({ type: 'error', message: 'Missing page title (<title> tag)' });
  } else if (result.meta.titleLength < 30) {
    issues.push({ type: 'warning', message: `Title too short (${result.meta.titleLength} chars). Aim for 30-60 characters.` });
  } else if (result.meta.titleLength > 60) {
    issues.push({ type: 'warning', message: `Title too long (${result.meta.titleLength} chars). May be truncated in search results.` });
  } else {
    issues.push({ type: 'info', message: `Title length is optimal (${result.meta.titleLength} chars)` });
  }

  // Description issues
  if (!result.meta.description) {
    issues.push({ type: 'error', message: 'Missing meta description' });
  } else if (result.meta.descriptionLength < 120) {
    issues.push({ type: 'warning', message: `Meta description too short (${result.meta.descriptionLength} chars). Aim for 120-160 characters.` });
  } else if (result.meta.descriptionLength > 160) {
    issues.push({ type: 'warning', message: `Meta description too long (${result.meta.descriptionLength} chars). May be truncated.` });
  } else {
    issues.push({ type: 'info', message: `Meta description length is optimal (${result.meta.descriptionLength} chars)` });
  }

  // Heading issues
  if (result.headings.h1.length === 0) {
    issues.push({ type: 'error', message: 'No H1 heading found on the page' });
  } else if (result.headings.h1.length > 1) {
    issues.push({ type: 'warning', message: `Multiple H1 headings found (${result.headings.h1.length}). Use only one H1 per page.` });
  } else {
    issues.push({ type: 'info', message: 'Single H1 heading found (good)' });
  }

  // Image alt issues
  if (result.images.withoutAlt.length > 0) {
    issues.push({
      type: 'warning',
      message: `${result.images.withoutAlt.length} image(s) missing alt attribute`,
    });
  } else if (result.images.total > 0) {
    issues.push({ type: 'info', message: 'All images have alt attributes' });
  }

  // Security
  if (!result.security.https) {
    issues.push({ type: 'error', message: 'Site is not using HTTPS' });
  } else {
    issues.push({ type: 'info', message: 'Site uses HTTPS (secure)' });
  }

  // Viewport
  if (!result.meta.viewport) {
    issues.push({ type: 'error', message: 'Missing viewport meta tag (not mobile-friendly)' });
  }

  // Social/OG tags
  if (!result.social.ogTitle && !result.social.ogDescription) {
    issues.push({ type: 'warning', message: 'No Open Graph tags found. Social sharing may not display correctly.' });
  }

  // Canonical
  if (!result.meta.canonical) {
    issues.push({ type: 'warning', message: 'No canonical URL specified' });
  }

  // Performance
  if (result.pageSize > 3 * 1024 * 1024) {
    issues.push({ type: 'warning', message: `Page size is large (${(result.pageSize / 1024 / 1024).toFixed(1)}MB). Consider optimizing.` });
  }

  if (result.performance.scripts > 20) {
    issues.push({ type: 'warning', message: `High number of scripts (${result.performance.scripts}). Consider bundling.` });
  }

  return issues;
}

/**
 * Analyze a URL for SEO issues
 */
export async function analyzeURL(inputUrl: string): Promise<SEOResult> {
  const url = normalizeUrl(inputUrl);
  let baseHost = '';

  try {
    baseHost = new URL(url).hostname;
  } catch {
    throw new Error('Invalid URL format');
  }

  const startTime = Date.now();

  // Fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  let html: string;
  let pageSize: number;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FlujoSEOBot/1.0; +https://flujo.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    html = await response.text();
    pageSize = new Blob([html]).size;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The server took too long to respond.');
      }
      throw new Error(`Failed to fetch URL: ${err.message}`);
    }
    throw new Error('Failed to fetch URL: Unknown error');
  }

  const loadTime = Date.now() - startTime;

  // Parse title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null;

  // Parse meta tags
  const description = getMetaContent(html, 'name', 'description');
  const viewport = getMetaContent(html, 'name', 'viewport');
  const robots = getMetaContent(html, 'name', 'robots');

  // Charset
  const charsetMatch = html.match(/<meta[^>]*charset=["']?([^"'\s>]+)/i);
  const charset = charsetMatch ? charsetMatch[1] : null;

  // Canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)
    || html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1] : null;

  // Headings
  const headings = {
    h1: extractTagContent(html, 'h1'),
    h2: extractTagContent(html, 'h2'),
    h3: extractTagContent(html, 'h3'),
    h4: extractTagContent(html, 'h4'),
    h5: extractTagContent(html, 'h5'),
    h6: extractTagContent(html, 'h6'),
  };

  // Images
  const imgRegex = /<img[^>]*>/gi;
  const imgMatches = html.match(imgRegex) || [];
  const imagesWithoutAlt: string[] = [];

  for (const img of imgMatches) {
    const hasAlt = /\salt=["'][^"']*["']/i.test(img) || /\salt=""/i.test(img);
    if (!hasAlt) {
      const srcMatch = img.match(/src=["']([^"']*?)["']/i);
      imagesWithoutAlt.push(srcMatch ? srcMatch[1] : 'unknown');
    }
  }

  // Links
  const linkRegex = /<a[^>]*href=["']([^"']*?)["'][^>]*>/gi;
  let linkMatch;
  let internalLinks = 0;
  let externalLinks = 0;
  let totalLinks = 0;

  while ((linkMatch = linkRegex.exec(html)) !== null) {
    totalLinks++;
    const href = linkMatch[1];
    if (isInternalLink(href, baseHost)) {
      internalLinks++;
    } else {
      externalLinks++;
    }
  }

  // Social/OG tags
  const ogTitle = getMetaContent(html, 'property', 'og:title');
  const ogDescription = getMetaContent(html, 'property', 'og:description');
  const ogImage = getMetaContent(html, 'property', 'og:image');
  const twitterCard = getMetaContent(html, 'name', 'twitter:card');

  // Performance counts
  const scriptCount = (html.match(/<script[^>]*>/gi) || []).length;
  const stylesheetCount = (html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || []).length;

  // Security
  const isHttps = url.startsWith('https://');

  // Build partial result (without score and issues)
  const partialResult = {
    url,
    loadTime,
    pageSize,
    meta: {
      title,
      titleLength: title ? title.length : 0,
      description,
      descriptionLength: description ? description.length : 0,
      viewport: !!viewport,
      charset,
      canonical,
      robots,
    },
    headings,
    images: {
      total: imgMatches.length,
      withoutAlt: imagesWithoutAlt,
    },
    links: {
      internal: internalLinks,
      external: externalLinks,
      total: totalLinks,
    },
    social: {
      ogTitle,
      ogDescription,
      ogImage,
      twitterCard,
    },
    performance: {
      scripts: scriptCount,
      stylesheets: stylesheetCount,
      images: imgMatches.length,
    },
    security: {
      https: isHttps,
    },
  };

  // Generate issues
  const issues = generateIssues(partialResult);

  // Calculate score
  const score = calculateScore({ ...partialResult, issues });

  return {
    ...partialResult,
    score,
    issues,
  };
}
