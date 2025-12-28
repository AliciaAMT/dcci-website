/**
 * SEO utility functions for generating meta tags and JSON-LD
 */

/**
 * Get the canonical site URL from environment variables
 * Defaults to https://dcciministries.com
 */
export function getSiteUrl(): string {
  return import.meta.env.SITE_URL || import.meta.env.PUBLIC_SITE_URL || 'https://dcciministries.com';
}

/**
 * Convert a relative URL to an absolute URL using the canonical site URL
 */
export function absoluteUrl(path: string): string {
  const siteUrl = getSiteUrl();
  // Remove trailing slash from siteUrl if present
  const baseUrl = siteUrl.replace(/\/$/, '');
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export interface SEOData {
  title: string;
  description: string;
  canonicalUrl: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  tags?: string[];
}

/**
 * Generate meta tags for a page
 */
export function generateMetaTags(data: SEOData): string {
  const {
    title,
    description,
    canonicalUrl,
    image,
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
    tags
  } = data;

  const siteName = 'DCCI Ministries';
  // Use canonical URL as-is (already normalized)
  // For images, convert relative URLs to absolute using canonical base
  const fullImageUrl = image ? (image.startsWith('http') ? image : absoluteUrl(image)) : undefined;

  let meta = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:site_name" content="${siteName}" />
    ${fullImageUrl ? `<meta property="og:image" content="${fullImageUrl}" />` : ''}
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${fullImageUrl ? `<meta name="twitter:image" content="${fullImageUrl}" />` : ''}
  `;

  if (type === 'article' && publishedTime) {
    meta += `
    <meta property="article:published_time" content="${publishedTime}" />
    ${modifiedTime ? `<meta property="article:modified_time" content="${modifiedTime}" />` : ''}
    ${author ? `<meta property="article:author" content="${escapeHtml(author)}" />` : ''}
    ${tags && tags.length > 0 ? tags.map(tag => `<meta property="article:tag" content="${escapeHtml(tag)}" />`).join('\n    ') : ''}
    `;
  }

  return meta.trim();
}

/**
 * Generate JSON-LD structured data
 */
export function generateJSONLD(data: SEOData): string {
  const {
    title,
    description,
    canonicalUrl,
    image,
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
    tags
  } = data;

  const siteUrl = getSiteUrl();
  const fullImageUrl = image ? (image.startsWith('http') ? image : absoluteUrl(image)) : undefined;

  if (type === 'article') {
    const articleData: any = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: description,
      url: canonicalUrl,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl
      },
      datePublished: publishedTime,
      dateModified: modifiedTime || publishedTime,
      author: {
        '@type': 'Person',
        name: author || 'DCCI Ministries'
      },
      publisher: {
        '@type': 'Organization',
        name: 'DCCI Ministries',
        url: siteUrl
      }
    };

    if (fullImageUrl) {
      articleData.image = fullImageUrl;
    }

    if (tags && tags.length > 0) {
      articleData.keywords = tags.join(', ');
    }

    return `<script type="application/ld+json">${JSON.stringify(articleData, null, 2)}</script>`;
  } else {
    const websiteData: any = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'DCCI Ministries',
      url: siteUrl,
      description: description
    };

    return `<script type="application/ld+json">${JSON.stringify(websiteData, null, 2)}</script>`;
  }
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

