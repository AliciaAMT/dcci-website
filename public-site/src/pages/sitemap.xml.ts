import type { APIRoute } from 'astro';
import { getPublishedArticles } from '../../lib/firestore';

const siteUrl = 'https://dcci-ministries.firebaseapp.com'; // Update with your actual domain

export const GET: APIRoute = async () => {
  // Fetch all published articles at build time
  const articles = await getPublishedArticles();

  // Build sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage / Welcome -->
  <url>
    <loc>${siteUrl}/welcome/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Articles Index -->
  <url>
    <loc>${siteUrl}/articles/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Individual Articles -->
  ${articles.map((article) => {
    const lastmod = article.updatedAt || article.publishedAt || article.createdAt;
    const lastmodDate = lastmod instanceof Date 
      ? lastmod.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    return `  <url>
    <loc>${siteUrl}/articles/${article.slug}/</loc>
    <lastmod>${lastmodDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};

