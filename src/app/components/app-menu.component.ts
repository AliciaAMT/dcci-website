import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-menu',
  templateUrl: './app-menu.component.html',
  styleUrls: ['./app-menu.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon
  ]
})
export class AppMenuComponent implements AfterViewInit {
  @ViewChild(IonMenu) menu!: IonMenu;

  constructor(
    private router: Router,
    private menuController: MenuController
  ) {}

  async ngAfterViewInit() {
    // Enable the menu after view is initialized
    try {
      await this.menuController.enable(true, 'main-menu');
      console.log('Menu enabled in AppMenuComponent');
    } catch (error) {
      console.error('Error enabling menu:', error);
    }
  }

  async open() {
    try {
      if (this.menu) {
        await this.menu.setOpen(true);
      } else {
        await this.menuController.open('main-menu');
      }
    } catch (error) {
      console.error('Error in menu.open():', error);
    }
  }

  async navigateToWelcome() {
    await this.menuController.close('main-menu');
    this.router.navigate(['/welcome']);
  }

  async navigateToArticles() {
    await this.menuController.close('main-menu');
    this.router.navigate(['/articles']);
  }

  async navigateToArchives() {
    await this.menuController.close('main-menu');
    this.router.navigate(['/archives']);
  }
}

