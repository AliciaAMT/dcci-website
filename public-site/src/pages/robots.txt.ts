import type { APIRoute } from 'astro';

const siteUrl = 'https://dcci-ministries.firebaseapp.com'; // Update with your actual domain

export const GET: APIRoute = () => {
  const robotsTxt = `User-agent: *
Allow: /
Allow: /welcome/
Allow: /articles/
Allow: /articles/*

# Disallow admin routes
Disallow: /admin/
Disallow: /admin/*

# Disallow API routes (if any)
Disallow: /api/

# Sitemap location
Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
};

