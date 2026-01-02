import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonMenu, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonContent, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel
  ]
})
export class PageHeaderComponent {
  @Input() pageTitle: string = '';

  constructor(
    private router: Router,
    private menuController: MenuController
  ) {}

  async navigateToArticles() {
    await this.menuController.close('main-menu');
    this.router.navigate(['/articles']);
  }

  async navigateToArchives() {
    await this.menuController.close('main-menu');
    this.router.navigate(['/archives']);
  }

  async navigateToWelcome() {
    await this.menuController.close('main-menu');
    this.router.navigate(['/welcome']);
  }
}

