/**
 * Firebase Admin SDK integration for server-side Firestore access
 * Used only during Astro build time to fetch published articles
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let firestoreInstance: Firestore | null = null;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables or default credentials
 */
function initializeFirebaseAdmin(): Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  // Check if already initialized
  const existingApp = getApps()[0];
  if (existingApp) {
    firestoreInstance = getFirestore(existingApp);
    return firestoreInstance;
  }

  // Initialize with service account or default credentials
  try {
    // Option 1: Use service account key from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'dcci-ministries',
      });
      firestoreInstance = getFirestore(app);
      return firestoreInstance;
    }

    // Option 2: Use GOOGLE_APPLICATION_CREDENTIALS environment variable (path to key file)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'dcci-ministries',
      });
      firestoreInstance = getFirestore(app);
      return firestoreInstance;
    }

    // Option 3: Use default credentials (for Firebase Functions/Cloud Run)
    const app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'dcci-ministries',
    });
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Please set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS environment variable.');
  }
}

/**
 * Article interface matching Firestore schema
 */
export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: 'draft' | 'published';
  authorId: string;
  authorEmail: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  oldSlugs?: string[];
  tags?: string[];
  featuredImage?: string;
}

/**
 * Get all published articles
 */
export async function getPublishedArticles(): Promise<Article[]> {
  const db = initializeFirebaseAdmin();
  
  try {
    const articlesRef = db.collection('content');
    const snapshot = await articlesRef
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        slug: data.slug || '',
        excerpt: data.excerpt,
        content: data.content,
        status: data.status,
        authorId: data.authorId,
        authorEmail: data.authorEmail,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        publishedAt: data.publishedAt?.toDate(),
        oldSlugs: data.oldSlugs || [],
        tags: data.tags || [],
        featuredImage: data.featuredImage,
      } as Article;
    });
  } catch (error) {
    console.error('Error fetching published articles:', error);
    // If orderBy fails (index missing), try without it
    try {
      const articlesRef = db.collection('content');
      const snapshot = await articlesRef
        .where('status', '==', 'published')
        .get();

      const articles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          slug: data.slug || '',
          excerpt: data.excerpt,
          content: data.content,
          status: data.status,
          authorId: data.authorId,
          authorEmail: data.authorEmail,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          oldSlugs: data.oldSlugs || [],
          tags: data.tags || [],
          featuredImage: data.featuredImage,
        } as Article;
      });

      // Sort by publishedAt descending
      return articles.sort((a, b) => {
        const aDate = a.publishedAt || a.createdAt;
        const bDate = b.publishedAt || b.createdAt;
        return bDate.getTime() - aDate.getTime();
      });
    } catch (fallbackError) {
      console.error('Error in fallback query:', fallbackError);
      return [];
    }
  }
}

/**
 * Get article by slug
 * Also checks oldSlugs for redirects
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const db = initializeFirebaseAdmin();
  
  try {
    // First, try to find by current slug
    const articlesRef = db.collection('content');
    const snapshot = await articlesRef
      .where('slug', '==', slug)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        slug: data.slug || '',
        excerpt: data.excerpt,
        content: data.content,
        status: data.status,
        authorId: data.authorId,
        authorEmail: data.authorEmail,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        publishedAt: data.publishedAt?.toDate(),
        oldSlugs: data.oldSlugs || [],
        tags: data.tags || [],
        featuredImage: data.featuredImage,
      } as Article;
    }

    // If not found, check oldSlugs for redirects
    const allArticlesSnapshot = await articlesRef
      .where('status', '==', 'published')
      .get();

    for (const doc of allArticlesSnapshot.docs) {
      const data = doc.data();
      const oldSlugs = data.oldSlugs || [];
      if (oldSlugs.includes(slug)) {
        // Found in oldSlugs - return the article (caller should handle redirect)
        return {
          id: doc.id,
          title: data.title,
          slug: data.slug || '',
          excerpt: data.excerpt,
          content: data.content,
          status: data.status,
          authorId: data.authorId,
          authorEmail: data.authorEmail,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          oldSlugs: data.oldSlugs || [],
          tags: data.tags || [],
          featuredImage: data.featuredImage,
        } as Article;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching article by slug:', error);
    return null;
  }
}

