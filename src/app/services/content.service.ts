import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, doc, addDoc, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, deleteDoc } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';

export interface Content {
  id?: string;
  title: string;
  excerpt?: string;
  content: string;
  status: 'draft' | 'published';
  authorId: string;
  authorEmail: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  publishedAt?: Date | Timestamp;
  slug?: string;
  oldSlugs?: string[]; // For redirects when slug changes
  tags?: string[];
  featuredImage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  constructor(
    private firestore: Firestore,
    private injector: Injector
  ) {}

  /**
   * Helper to convert Date or Timestamp to Date and get time
   */
  private getTime(date: Date | Timestamp | undefined): number {
    if (!date) return 0;
    if (date instanceof Date) return date.getTime();
    if (date && typeof (date as any).toDate === 'function') {
      return (date as any).toDate().getTime();
    }
    return new Date(date as any).getTime();
  }

  /**
   * Reserved slugs that cannot be used
   */
  private readonly RESERVED_SLUGS = [
    'admin',
    'api',
    'login',
    'logout',
    'assets',
    'sitemap.xml',
    'robots.txt',
    'dashboard',
    'content',
    'manage',
    'drafts',
    'published',
    'create',
    'edit',
    'home',
    'welcome',
    'verify-email',
    'forgot-password',
    'reset-password',
    'verification-required'
  ];

  /**
   * Transliterate diacritics to ASCII equivalents
   */
  private transliterateDiacritics(text: string): string {
    const diacriticsMap: { [key: string]: string } = {
      'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
      'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
      'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
      'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
      'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
      'ý': 'y', 'ÿ': 'y',
      'ñ': 'n', 'ç': 'c',
      'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
      'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
      'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
      'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
      'Ý': 'Y', 'Ÿ': 'Y',
      'Ñ': 'N', 'Ç': 'C'
    };

    return text.replace(/[àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ]/g, (char) => diacriticsMap[char] || char);
  }

  /**
   * Generate a URL-friendly slug from a title
   * Rules:
   * - lowercase
   * - trim whitespace
   * - convert spaces/underscores to hyphens
   * - remove punctuation/symbols
   * - collapse multiple hyphens
   * - remove leading/trailing hyphens
   * - transliterate diacritics (é -> e)
   */
  private generateSlug(title: string): string {
    if (!title) return '';

    let slug = title
      .trim()
      .toLowerCase();

    // Transliterate diacritics
    slug = this.transliterateDiacritics(slug);

    // Replace spaces and underscores with hyphens
    slug = slug.replace(/[\s_]+/g, '-');

    // Remove all non-alphanumeric characters except hyphens
    slug = slug.replace(/[^a-z0-9-]/g, '');

    // Collapse multiple consecutive hyphens into a single hyphen
    slug = slug.replace(/-+/g, '-');

    // Remove leading and trailing hyphens
    slug = slug.replace(/^-+|-+$/g, '');

    // Ensure slug is not empty
    if (!slug) {
      slug = 'untitled';
    }

    return slug;
  }

  /**
   * Check if a slug is reserved
   */
  private isReservedSlug(slug: string): boolean {
    return this.RESERVED_SLUGS.includes(slug.toLowerCase());
  }

  /**
   * Validate and sanitize a slug
   */
  private validateSlug(slug: string): { valid: boolean; error?: string } {
    if (!slug || slug.trim() === '') {
      return { valid: false, error: 'Slug cannot be empty' };
    }

    if (this.isReservedSlug(slug)) {
      return { valid: false, error: `Slug "${slug}" is reserved and cannot be used` };
    }

    // Check for invalid characters
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
    }

    // Check for leading/trailing hyphens
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return { valid: false, error: 'Slug cannot start or end with a hyphen' };
    }

    // Check for consecutive hyphens
    if (slug.includes('--')) {
      return { valid: false, error: 'Slug cannot contain consecutive hyphens' };
    }

    return { valid: true };
  }

  /**
   * Check if a slug already exists (checks both current slug and oldSlugs for redirects)
   * Note: This method assumes it's being called from within an injection context
   */
  private async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    try {
      return await runInInjectionContext(this.injector, async () => {
        const contentRef = collection(this.firestore, 'content');

        // Check current slugs - use filtered query (admins can read all, public can only read published)
        // For admins, this query will return both draft and published content
        const q = query(contentRef, where('slug', '==', slug));
        const snapshot = await getDocs(q);

        if (excludeId) {
          // Check if any document with this slug has a different ID
          const existsInCurrent = snapshot.docs.some(doc => doc.id !== excludeId);
          if (existsInCurrent) return true;
        } else {
          if (!snapshot.empty) return true;
        }

        // Also check oldSlugs arrays for redirects
        // Use a query to get documents that might have this slug in oldSlugs
        // Note: Firestore doesn't support efficient array-contains queries for oldSlugs,
        // so we'll query published content (which admins can read) and check in memory
        // For drafts, we rely on the slug uniqueness check above
        const publishedQuery = query(contentRef, where('status', '==', 'published'));
        const publishedSnapshot = await getDocs(publishedQuery);
        for (const docSnap of publishedSnapshot.docs) {
          if (excludeId && docSnap.id === excludeId) continue;

          const data = docSnap.data();
          const oldSlugs = data['oldSlugs'] || [];
          if (oldSlugs.includes(slug)) {
            return true;
          }
        }

        // For drafts, check if we can read them (admin only)
        // If we're an admin, also check draft content for oldSlugs
        try {
          const draftQuery = query(contentRef, where('status', '==', 'draft'));
          const draftSnapshot = await getDocs(draftQuery);
          for (const docSnap of draftSnapshot.docs) {
            if (excludeId && docSnap.id === excludeId) continue;

            const data = docSnap.data();
            const oldSlugs = data['oldSlugs'] || [];
            if (oldSlugs.includes(slug)) {
              return true;
            }
          }
        } catch (draftError: any) {
          // If we can't read drafts (not an admin), that's okay - we've checked published content
          // This is expected for non-admin users, but shouldn't happen for admins
          if (draftError?.code === 'permission-denied') {
            console.warn('Cannot read draft content for oldSlugs check (permission denied). Assuming slug is available.');
          }
        }

        return false;
      });
    } catch (error: any) {
      // If query fails (e.g., index not created yet or permission issue), log details
      console.error('Error checking slug existence:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      // For permission errors, we should throw so the user knows
      if (error?.code === 'permission-denied') {
        throw new Error('Permission denied: Unable to check if slug exists. Please ensure you are logged in as an admin.');
      }
      // For other errors (like missing index), assume slug doesn't exist
      return false;
    }
  }

  /**
   * Generate a unique slug
   * Enforces uniqueness globally and handles reserved slugs
   */
  private async generateUniqueSlug(title: string, excludeId?: string, manualSlug?: string): Promise<string> {
    let baseSlug: string;

    // Use manual slug if provided, otherwise generate from title
    if (manualSlug && manualSlug.trim()) {
      baseSlug = this.generateSlug(manualSlug);
    } else {
      baseSlug = this.generateSlug(title);
    }

    // Check if base slug is reserved
    if (this.isReservedSlug(baseSlug)) {
      // If reserved, append -1 to make it unique
      baseSlug = `${baseSlug}-1`;
    }

    let slug = baseSlug;
    let counter = 1;

    // Ensure uniqueness - check both current slugs and old slugs (for redirects)
    while (await this.slugExists(slug, excludeId)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  /**
   * Save content as draft
   */
  async saveDraft(contentData: Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'slug'>, manualSlug?: string): Promise<string> {
    try {
      // Generate slug first within injection context
      const slug = await runInInjectionContext(this.injector, async () => {
        if (manualSlug && manualSlug.trim()) {
          // Validate manual slug
          const validation = this.validateSlug(manualSlug);
          if (!validation.valid) {
            throw new Error(validation.error || 'Invalid slug');
          }
          return await this.generateUniqueSlug('', undefined, manualSlug);
        }
        return await this.generateUniqueSlug(contentData.title);
      });

      // Then perform the Firestore write operation within injection context
      return await runInInjectionContext(this.injector, async () => {
        const contentRef = collection(this.firestore, 'content');

        const data: any = {
          ...contentData,
          slug,
          status: 'draft' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Remove undefined values (Firebase doesn't allow undefined)
        Object.keys(data).forEach(key => {
          if (data[key] === undefined) {
            delete data[key];
          }
        });

        // If tags is undefined, remove it; if it's an empty array, keep it
        if (data.tags === undefined) {
          delete data.tags;
        }

        // Debug logging
        const dataKeys = Object.keys(data).filter(k => k !== 'content'); // Exclude content from log
        console.log('[ContentService] Attempting to save draft');
        console.log('[ContentService] Data keys:', dataKeys);
        console.log('[ContentService] Author ID:', data.authorId);
        console.log('[ContentService] Status:', data.status);
        console.log('[ContentService] Document path: content/ (new document)');

        try {
          const docRef = await addDoc(contentRef, data);
          console.log('[ContentService] Draft saved successfully with ID:', docRef.id);
          return docRef.id;
        } catch (error: any) {
          console.error('[ContentService] Error saving draft:', error);
          console.error('[ContentService] Error code:', error?.code);
          console.error('[ContentService] Error message:', error?.message);
          console.error('[ContentService] Error stack:', error?.stack);
          throw error;
        }
      });
    } catch (error: any) {
      console.error('Error in saveDraft:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      throw error;
    }
  }

  /**
   * Update existing draft
   * Stability: Does NOT auto-change slug for published articles
   */
  async updateDraft(id: string, contentData: Partial<Omit<Content, 'id' | 'createdAt' | 'publishedAt'>>, manualSlug?: string): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      // First, get the existing content to check if it's published
      const contentRef = doc(this.firestore, 'content', id);
      const existingDoc = await getDoc(contentRef);
      if (!existingDoc.exists()) {
        throw new Error('Document not found');
      }
      const existingData = existingDoc.data();
      const isPublished = existingData?.['status'] === 'published';
      const currentSlug = existingData?.['slug'];

      // CRITICAL: Preserve authorId and authorEmail from existing document (immutable)
      // Do NOT overwrite with values from contentData
      const preservedAuthorId = existingData['authorId'];
      const preservedAuthorEmail = existingData['authorEmail'];

      let updateData: any = {
        ...contentData,
        // Override authorId/authorEmail to preserve immutability
        authorId: preservedAuthorId,
        authorEmail: preservedAuthorEmail,
        updatedAt: serverTimestamp()
      };

      // Handle slug changes
      if (manualSlug !== undefined || (contentData.title && !isPublished)) {
        let newSlug: string;

        if (manualSlug !== undefined && manualSlug.trim()) {
          // Manual slug provided - validate and use it
          const validation = this.validateSlug(manualSlug);
          if (!validation.valid) {
            throw new Error(validation.error || 'Invalid slug');
          }
          newSlug = await this.generateUniqueSlug('', id, manualSlug);
        } else if (contentData.title && !isPublished) {
          // Title changed and not published - regenerate slug from title
          newSlug = await this.generateUniqueSlug(contentData.title, id);
        } else {
          // Published article - keep existing slug unless manually changed
          newSlug = currentSlug || await this.generateUniqueSlug(contentData.title || '', id);
        }

        // If slug changed for a published article, store old slug for redirects
        if (isPublished && currentSlug && newSlug !== currentSlug) {
          const oldSlugs = existingData?.['oldSlugs'] || [];
          if (!oldSlugs.includes(currentSlug)) {
            updateData.oldSlugs = [...oldSlugs, currentSlug];
          }
        }

        updateData.slug = newSlug;
      } else if (contentData.title && isPublished) {
        // Title changed but article is published - don't change slug
        // Slug remains unchanged
      }

      // Remove undefined values (Firebase doesn't allow undefined)
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // If tags is an empty array, we can include it, but if it's undefined, remove it
      if (updateData.tags === undefined) {
        delete updateData.tags;
      }

      // Debug logging
      const updateKeys = Object.keys(updateData).filter(k => k !== 'content'); // Exclude content from log
      console.log('[ContentService] ===== UPDATE DRAFT =====');
      console.log('[ContentService] Operation: UPDATE (existing document)');
      console.log('[ContentService] Document ID:', id);
      console.log('[ContentService] Document path: content/' + id);
      console.log('[ContentService] Author ID (existing doc):', preservedAuthorId);
      console.log('[ContentService] Author ID (preserved in update):', updateData.authorId);
      console.log('[ContentService] Author ID match:', preservedAuthorId === updateData.authorId ? '✓ MATCH' : '✗ MISMATCH');
      console.log('[ContentService] Update keys:', updateKeys);
      console.log('[ContentService] Status:', updateData.status);

      try {
        await setDoc(contentRef, updateData, { merge: true });
        console.log('[ContentService] Draft updated successfully');
      } catch (error: any) {
        console.error('[ContentService] Error updating draft:', error);
        console.error('[ContentService] Error code:', error?.code);
        console.error('[ContentService] Error message:', error?.message);
        console.error('[ContentService] Error stack:', error?.stack);
        throw error;
      }
    });
  }

  /**
   * Publish content (create new or update existing)
   * Stability: Preserves existing slug if article is already published
   */
  async publish(contentData: Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'slug'>, existingId?: string, manualSlug?: string): Promise<string> {
    // Generate slug first within injection context
    const slug = await runInInjectionContext(this.injector, async () => {
      // If updating existing content, check if it's already published
      if (existingId) {
        const existingRef = doc(this.firestore, 'content', existingId);
        const existingDoc = await getDoc(existingRef);
        if (existingDoc.exists()) {
          const existingData = existingDoc.data();
          // If already published, preserve the slug unless manually changed
          if (existingData['status'] === 'published' && existingData['slug'] && !manualSlug) {
            return existingData['slug'];
          }
        }
      }

      // Generate new slug
      if (manualSlug && manualSlug.trim()) {
        // Validate manual slug
        const validation = this.validateSlug(manualSlug);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid slug');
        }
        return await this.generateUniqueSlug('', existingId, manualSlug);
      }
      return await this.generateUniqueSlug(contentData.title, existingId);
    });

    // Then perform the Firestore write operation within injection context
    return await runInInjectionContext(this.injector, async () => {
      const isUpdate = !!existingId;
      
      // If updating, load existing document to preserve immutable fields
      let existingData: any = null;
      let preservedAuthorId: string | undefined;
      let preservedAuthorEmail: string | undefined;
      let preservedCreatedAt: any;

      if (existingId) {
        const existingRef = doc(this.firestore, 'content', existingId);
        const existingDoc = await getDoc(existingRef);
        if (!existingDoc.exists()) {
          throw new Error('Document not found');
        }
        existingData = existingDoc.data();
        // CRITICAL: Preserve immutable fields from existing document
        preservedAuthorId = existingData['authorId'];
        preservedAuthorEmail = existingData['authorEmail'];
        preservedCreatedAt = existingData['createdAt'];
      }

      // Prepare data object
      const data: any = {
        ...contentData,
        slug,
        status: 'published' as const,
        updatedAt: serverTimestamp()
      };

      // For UPDATES: Preserve immutable fields (authorId, authorEmail, createdAt)
      if (isUpdate && existingData) {
        data.authorId = preservedAuthorId;
        data.authorEmail = preservedAuthorEmail;
        // createdAt should NOT be in update payload - merge: true will preserve existing createdAt
        // Explicitly remove it if it was accidentally included
        delete data.createdAt;

        const oldSlug = existingData['slug'];
        // If slug changed and article was already published, store old slug
        if (oldSlug && slug !== oldSlug && existingData['status'] === 'published') {
          const oldSlugs = existingData['oldSlugs'] || [];
          if (!oldSlugs.includes(oldSlug)) {
            data.oldSlugs = [...oldSlugs, oldSlug];
          }
        } else if (existingData['oldSlugs']) {
          // Preserve existing oldSlugs
          data.oldSlugs = existingData['oldSlugs'];
        }
      }
      // For CREATES: Use authorId from contentData (current user)

      // Remove undefined values (Firebase doesn't allow undefined)
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      // If tags is undefined, remove it; if it's an empty array, keep it
      if (data.tags === undefined) {
        delete data.tags;
      }

      // Debug logging
      const dataKeys = Object.keys(data).filter(k => k !== 'content'); // Exclude content from log
      console.log('[ContentService] ===== PUBLISH CONTENT =====');
      console.log('[ContentService] Operation:', isUpdate ? 'UPDATE (existing document)' : 'CREATE (new document)');
      console.log('[ContentService] Document ID:', existingId || '(new document)');
      console.log('[ContentService] Document path:', existingId ? `content/${existingId}` : 'content/ (new document)');
      if (isUpdate) {
        console.log('[ContentService] Author ID (existing doc):', preservedAuthorId);
        console.log('[ContentService] Author ID (preserved in update):', data.authorId);
        console.log('[ContentService] Author ID match:', preservedAuthorId === data.authorId ? '✓ MATCH' : '✗ MISMATCH');
      } else {
        console.log('[ContentService] Author ID (new doc, from current user):', data.authorId);
      }
      console.log('[ContentService] Data keys:', dataKeys);
      console.log('[ContentService] Status:', data.status);

      try {
        if (existingId) {
          // Update existing content
          const contentRef = doc(this.firestore, 'content', existingId);
          await setDoc(contentRef, {
            ...data,
            publishedAt: serverTimestamp()
          }, { merge: true });
          console.log('[ContentService] Content published successfully (updated)');
          return existingId;
        } else {
          // Create new published content
          const contentRef = collection(this.firestore, 'content');
          const docRef = await addDoc(contentRef, {
            ...data,
            createdAt: serverTimestamp(),
            publishedAt: serverTimestamp()
          });
          console.log('[ContentService] Content published successfully (created) with ID:', docRef.id);
          return docRef.id;
        }
      } catch (error: any) {
        console.error('[ContentService] Error publishing content:', error);
        console.error('[ContentService] Error code:', error?.code);
        console.error('[ContentService] Error message:', error?.message);
        console.error('[ContentService] Error stack:', error?.stack);
        throw error;
      }
    });
  }

  /**
   * Get content by ID
   */
  async getContent(id: string): Promise<Content | null> {
    return await runInInjectionContext(this.injector, async () => {
      const contentRef = doc(this.firestore, 'content', id);
      const docSnap = await getDoc(contentRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate() || new Date(),
          publishedAt: data['publishedAt']?.toDate()
        } as Content;
      }

      return null;
    });
  }

  /**
   * Get content by slug (for public-facing URLs)
   * Also checks oldSlugs for redirects
   */
  async getContentBySlug(slug: string): Promise<Content | null> {
    return await runInInjectionContext(this.injector, async () => {
      try {
        // First, try to find by current slug
        const contentRef = collection(this.firestore, 'content');
        const q = query(
          contentRef,
          where('slug', '==', slug),
          where('status', '==', 'published')
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            publishedAt: data['publishedAt']?.toDate()
          } as Content;
        }

        // If not found, check oldSlugs for redirects
        // Note: This is less efficient - consider creating a redirects collection for better performance
        const allContentSnapshot = await getDocs(query(contentRef, where('status', '==', 'published')));
        for (const docSnap of allContentSnapshot.docs) {
          const data = docSnap.data();
          const oldSlugs = data['oldSlugs'] || [];
          if (oldSlugs.includes(slug)) {
            // Found in oldSlugs - return the content (caller should redirect to new slug)
            return {
              id: docSnap.id,
              ...data,
              createdAt: data['createdAt']?.toDate() || new Date(),
              updatedAt: data['updatedAt']?.toDate() || new Date(),
              publishedAt: data['publishedAt']?.toDate()
            } as Content;
          }
        }

        return null;
      } catch (error) {
        console.error('Error getting content by slug:', error);
        return null;
      }
    });
  }

  /**
   * Get all content (for admin listing)
   */
  async getAllContent(): Promise<Content[]> {
    return await runInInjectionContext(this.injector, async () => {
      const contentRef = collection(this.firestore, 'content');
      const q = query(contentRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate() || new Date(),
          publishedAt: data['publishedAt']?.toDate()
        } as Content;
      });
    });
  }

  /**
   * Get drafts only
   */
  async getDrafts(): Promise<Content[]> {
    return await runInInjectionContext(this.injector, async () => {
      try {
        const contentRef = collection(this.firestore, 'content');
        const q = query(
          contentRef,
          where('status', '==', 'draft'),
          orderBy('updatedAt', 'desc')
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            publishedAt: data['publishedAt']?.toDate()
          } as Content;
        });
      } catch (error) {
        console.error('Error fetching drafts:', error);
        // If index doesn't exist yet, try without orderBy
        try {
          const contentRef = collection(this.firestore, 'content');
          const q = query(contentRef, where('status', '==', 'draft'));
          const snapshot = await getDocs(q);

          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data['createdAt']?.toDate() || new Date(),
              updatedAt: data['updatedAt']?.toDate() || new Date(),
              publishedAt: data['publishedAt']?.toDate()
            } as Content;
          }).sort((a, b) => {
            const aTime = this.getTime(a.updatedAt);
            const bTime = this.getTime(b.updatedAt);
            return bTime - aTime;
          });
        } catch (fallbackError) {
          console.error('Error in fallback query:', fallbackError);
          return [];
        }
      }
    });
  }

  /**
   * Get published content only
   */
  async getPublishedContent(): Promise<Content[]> {
    return await runInInjectionContext(this.injector, async () => {
      try {
        const contentRef = collection(this.firestore, 'content');
        const q = query(
          contentRef,
          where('status', '==', 'published'),
          orderBy('publishedAt', 'desc')
        );
        const snapshot = await getDocs(q);

        const allContent = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            publishedAt: data['publishedAt']?.toDate()
          } as Content;
        });

        // Deduplicate by youtubeVideoId (keep the newest/most complete)
        return this.deduplicateYouTubeContent(allContent);
      } catch (error) {
        console.error('Error fetching published content:', error);
        // If index doesn't exist yet, try without orderBy
        try {
          const contentRef = collection(this.firestore, 'content');
          const q = query(contentRef, where('status', '==', 'published'));
          const snapshot = await getDocs(q);

          const allContent = snapshot.docs.map(doc => {
            const data = doc.data();
            const publishedAt = data['publishedAt']?.toDate();
            const createdAt = data['createdAt']?.toDate() || new Date();
            return {
              id: doc.id,
              ...data,
              createdAt,
              updatedAt: data['updatedAt']?.toDate() || new Date(),
              publishedAt
            } as Content;
          }).sort((a, b) => {
            const aDate = a.publishedAt || a.createdAt;
            const bDate = b.publishedAt || b.createdAt;
            const aTime = this.getTime(aDate);
            const bTime = this.getTime(bDate);
            return bTime - aTime;
          });

          // Deduplicate by youtubeVideoId (keep the newest/most complete)
          return this.deduplicateYouTubeContent(allContent);
        } catch (fallbackError) {
          console.error('Error in fallback query:', fallbackError);
          return [];
        }
      }
    });
  }

  /**
   * Deduplicate YouTube content by youtubeVideoId
   * Keeps the newest/most complete document
   */
  private deduplicateYouTubeContent(content: Content[]): Content[] {
    const videoMap = new Map<string, Content>();
    
    for (const item of content) {
      // Skip items without an ID
      if (!item.id) {
        console.warn('Content item missing ID, skipping:', item);
        continue;
      }
      
      const data = item as any;
      const videoId = data.youtubeVideoId;
      
      // Only dedupe YouTube content
      if (!videoId || data.type !== 'youtube') {
        videoMap.set(item.id, item); // Keep non-YouTube content as-is
        continue;
      }
      
      const existing = videoMap.get(videoId);
      
      if (!existing) {
        // First occurrence of this video ID
        videoMap.set(videoId, item);
      } else {
        // Choose the better document:
        // 1. Prefer one with more complete data (thumbnailUrl, tags, content)
        // 2. Prefer newer one if completeness is equal
        const existingData = existing as any;
        const itemData = item as any;
        
        const existingScore = this.getContentCompletenessScore(existingData);
        const itemScore = this.getContentCompletenessScore(itemData);
        
        if (itemScore > existingScore) {
          videoMap.set(videoId, item);
        } else if (itemScore === existingScore) {
          // If scores equal, prefer newer
          const existingDate = existing.publishedAt || existing.createdAt;
          const itemDate = item.publishedAt || item.createdAt;
          if (itemDate && existingDate && itemDate > existingDate) {
            videoMap.set(videoId, item);
          }
        }
        // Otherwise keep existing
      }
    }
    
    // Convert map values back to array
    return Array.from(videoMap.values());
  }

  /**
   * Calculate completeness score for content (higher = more complete)
   */
  private getContentCompletenessScore(data: any): number {
    let score = 0;
    if (data.thumbnailUrl) score += 3;
    if (data.tags && data.tags.length > 0) score += 2;
    if (data.content && data.content.length > 50) score += 2;
    if (data.excerpt) score += 1;
    return score;
  }

  /**
   * Search content by various criteria
   * Note: This method filters already-loaded content in memory to avoid Firebase injection context issues
   */
  async searchContent(
    status: 'draft' | 'published',
    searchTerm: string,
    searchType: 'title' | 'content' | 'tags' | 'date' = 'title',
    sortBy: 'date' | 'title' = 'date',
    allContent: Content[] // Pass in the already-loaded content
  ): Promise<Content[]> {
    // Filter and sort in memory (no Firebase calls needed)
    try {
      let results = [...allContent];

        // Filter by search term if provided
        if (searchTerm && searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase().trim();

          results = results.filter(item => {
            switch (searchType) {
              case 'title':
                return item.title.toLowerCase().includes(searchLower);
              case 'content':
                return item.content.toLowerCase().includes(searchLower) ||
                       (item.excerpt && item.excerpt.toLowerCase().includes(searchLower));
              case 'tags':
                if (!item.tags || item.tags.length === 0) return false;
                return item.tags.some(tag =>
                  tag.toLowerCase().includes(searchLower) ||
                  tag.toLowerCase().replace('#', '').includes(searchLower)
                );
              case 'date':
                // Search by date - format: YYYY-MM-DD or partial match
                const dateStr = item.publishedAt
                  ? (item.publishedAt instanceof Date ? item.publishedAt : (item.publishedAt as any).toDate())
                  : (item.createdAt instanceof Date ? item.createdAt : new Date());
                const formattedDate = dateStr.toISOString().split('T')[0];
                return formattedDate.includes(searchLower);
              default:
                return true;
            }
          });
        }

        // Sort results
        if (sortBy === 'title') {
          results.sort((a, b) => a.title.localeCompare(b.title));
        } else {
          // Sort by date (already sorted by query, but re-sort filtered results)
          results.sort((a, b) => {
            const aDate = a.publishedAt || a.updatedAt || a.createdAt;
            const bDate = b.publishedAt || b.updatedAt || b.createdAt;
            const aTime = this.getTime(aDate);
            const bTime = this.getTime(bDate);
            return bTime - aTime;
          });
        }

        return results;
    } catch (error) {
      console.error('Error searching content:', error);
      return [];
    }
  }

  /**
   * Delete content by ID
   */
  async deleteContent(id: string): Promise<void> {
    return await runInInjectionContext(this.injector, async () => {
      const contentRef = doc(this.firestore, 'content', id);
      await deleteDoc(contentRef);
    });
  }

  /**
   * Unpublish content (change status from published to draft)
   */
  async unpublishContent(id: string): Promise<void> {
    return await runInInjectionContext(this.injector, async () => {
      const contentRef = doc(this.firestore, 'content', id);
      await setDoc(contentRef, {
        status: 'draft' as const,
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
  }
}

