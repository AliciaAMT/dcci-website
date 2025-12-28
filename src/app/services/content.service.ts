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
   * Generate a URL-friendly slug from a title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Check if a slug already exists
   * Note: This method assumes it's being called from within an injection context
   */
  private async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    try {
      const contentRef = collection(this.firestore, 'content');
      const q = query(contentRef, where('slug', '==', slug));
      const snapshot = await getDocs(q);

      if (excludeId) {
        // Check if any document with this slug has a different ID
        return snapshot.docs.some(doc => doc.id !== excludeId);
      }

      return !snapshot.empty;
    } catch (error: any) {
      // If query fails (e.g., index not created yet or permission issue), log details
      console.error('Error checking slug existence:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
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
   */
  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    let baseSlug = this.generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (await this.slugExists(slug, excludeId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Save content as draft
   */
  async saveDraft(contentData: Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'slug'>): Promise<string> {
    try {
      // Generate slug first within injection context
      const slug = await runInInjectionContext(this.injector, async () => {
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

        console.log('Attempting to save draft with data:', { ...data, content: '[content hidden]' });
        const docRef = await addDoc(contentRef, data);
        console.log('Draft saved successfully with ID:', docRef.id);
        return docRef.id;
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
   */
  async updateDraft(id: string, contentData: Partial<Omit<Content, 'id' | 'createdAt' | 'publishedAt'>>): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const contentRef = doc(this.firestore, 'content', id);

      // If title changed, regenerate slug
      let updateData: any = {
        ...contentData,
        updatedAt: serverTimestamp()
      };

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

      if (contentData.title) {
        updateData.slug = await this.generateUniqueSlug(contentData.title, id);
      }

      await setDoc(contentRef, updateData, { merge: true });
    });
  }

  /**
   * Publish content (create new or update existing)
   */
  async publish(contentData: Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'slug'>, existingId?: string): Promise<string> {
    // Generate slug first within injection context
    const slug = await runInInjectionContext(this.injector, async () => {
      return await this.generateUniqueSlug(contentData.title, existingId);
    });

    // Then perform the Firestore write operation within injection context
    return await runInInjectionContext(this.injector, async () => {
      // Prepare data object, removing undefined values
      const data: any = {
        ...contentData,
        slug,
        status: 'published' as const,
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

      if (existingId) {
        // Update existing content
        const contentRef = doc(this.firestore, 'content', existingId);
        await setDoc(contentRef, {
          ...data,
          publishedAt: serverTimestamp()
        }, { merge: true });
        return existingId;
      } else {
        // Create new published content
        const contentRef = collection(this.firestore, 'content');
        const docRef = await addDoc(contentRef, {
          ...data,
          createdAt: serverTimestamp(),
          publishedAt: serverTimestamp()
        });
        return docRef.id;
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
        console.error('Error fetching published content:', error);
        // If index doesn't exist yet, try without orderBy
        try {
          const contentRef = collection(this.firestore, 'content');
          const q = query(contentRef, where('status', '==', 'published'));
          const snapshot = await getDocs(q);

          return snapshot.docs.map(doc => {
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
        } catch (fallbackError) {
          console.error('Error in fallback query:', fallbackError);
          return [];
        }
      }
    });
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

