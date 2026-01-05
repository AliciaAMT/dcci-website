import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { MenuController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-page-header-with-menu',
  templateUrl: './page-header-with-menu.component.html',
  styleUrls: ['./page-header-with-menu.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon]
})
export class PageHeaderWithMenuComponent {
  constructor(private menuController: MenuController) {}

  async openMenu() {
    try {
      // Ensure menu is enabled
      await this.menuController.enable(true, 'main-menu');

      // Wait a bit for the menu to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to open the menu
      const isOpen = await this.menuController.isOpen('main-menu');
      if (!isOpen) {
        const result = await this.menuController.open('main-menu');
        if (!result) {
          // If open() didn't work, try toggle
          await this.menuController.toggle('main-menu');
        }
      } else {
        // If already open, close it
        await this.menuController.close('main-menu');
      }
    } catch (error) {
      console.error('Error opening menu:', error);
      // Last resort: try toggle
      try {
        await this.menuController.toggle('main-menu');
      } catch (toggleError) {
        console.error('Toggle also failed:', toggleError);
      }
    }
  }
}

