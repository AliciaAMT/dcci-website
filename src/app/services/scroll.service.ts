import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IonContent } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class ScrollService {
  private scrollState$ = new BehaviorSubject<boolean>(false);
  private scrollElements: Set<HTMLElement> = new Set();
  private scrollHandlers: Map<HTMLElement, () => void> = new Map();

  getScrollState(): Observable<boolean> {
    return this.scrollState$.asObservable();
  }

  async registerScrollContainer(content: IonContent): Promise<void> {
    try {
      const scrollElement = await content.getScrollElement();
      
      // Don't register the same element twice
      if (this.scrollElements.has(scrollElement)) {
        return;
      }

      this.scrollElements.add(scrollElement);

      const handleScroll = () => {
        const scrollTop = scrollElement.scrollTop || 0;
        this.scrollState$.next(scrollTop > 100);
      };

      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      this.scrollHandlers.set(scrollElement, handleScroll);

      // Check initial scroll position
      handleScroll();
    } catch (error) {
      console.error('Error registering scroll container:', error);
    }
  }

  unregisterScrollContainer(content: IonContent): void {
    // For cleanup if needed
    // The scroll handlers will be cleaned up when the element is removed from DOM
  }

  checkScrollState(): void {
    // Check all registered scroll elements
    this.scrollElements.forEach(scrollElement => {
      const scrollTop = scrollElement.scrollTop || 0;
      if (scrollTop > 100) {
        this.scrollState$.next(true);
        return;
      }
    });
    this.scrollState$.next(false);
  }
}