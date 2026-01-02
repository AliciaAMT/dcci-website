import { Component } from '@angular/core';
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
export class AppMenuComponent {
  constructor(
    private router: Router,
    private menuController: MenuController
  ) {
    // Enable the menu on component initialization
    this.menuController.enable(true, 'main-menu');
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

