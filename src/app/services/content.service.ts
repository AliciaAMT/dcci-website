import { Injectable } from '@angular/core';
import { Firestore, collection, doc, addDoc, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from '@angular/fire/firestore';
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
  constructor(private firestore: Firestore) {}

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
      const contentRef = collection(this.firestore, 'content');
      
      const slug = await this.generateUniqueSlug(contentData.title);
      
      const data = {
        ...contentData,
        slug,
        status: 'draft' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('Attempting to save draft with data:', { ...data, content: '[content hidden]' });
      const docRef = await addDoc(contentRef, data);
      console.log('Draft saved successfully with ID:', docRef.id);
      return docRef.id;
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
    const contentRef = doc(this.firestore, 'content', id);
    
    // If title changed, regenerate slug
    let updateData: any = {
      ...contentData,
      updatedAt: serverTimestamp()
    };

    if (contentData.title) {
      updateData.slug = await this.generateUniqueSlug(contentData.title, id);
    }

    await setDoc(contentRef, updateData, { merge: true });
  }

  /**
   * Publish content (create new or update existing)
   */
  async publish(contentData: Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'slug'>, existingId?: string): Promise<string> {
    const slug = await this.generateUniqueSlug(contentData.title, existingId);
    
    if (existingId) {
      // Update existing content
      const contentRef = doc(this.firestore, 'content', existingId);
      await setDoc(contentRef, {
        ...contentData,
        slug,
        status: 'published' as const,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      return existingId;
    } else {
      // Create new published content
      const contentRef = collection(this.firestore, 'content');
      const data = {
        ...contentData,
        slug,
        status: 'published' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: serverTimestamp()
      };
      const docRef = await addDoc(contentRef, data);
      return docRef.id;
    }
  }

  /**
   * Get content by ID
   */
  async getContent(id: string): Promise<Content | null> {
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
  }

  /**
   * Get all content (for admin listing)
   */
  async getAllContent(): Promise<Content[]> {
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
  }

  /**
   * Get published content only
   */
  async getPublishedContent(): Promise<Content[]> {
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
  }
}

